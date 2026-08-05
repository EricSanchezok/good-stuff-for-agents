import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildCanonicalPackProofInput, CATALOG, evaluationPathForPack, listFiles, loadSkillsById,
  parseMarkdownFrontmatterFile, readJsonl, sha256, sortProofDeep, stableStringify,
} from './catalog-lib.mjs'

// --- Content-addressed proof ---

export const PROOF_RULES_VERSION = 'v3.2.0'

// PROOF_SCHEMA_VERSION is the schema version of the stored preflight-proof.json record.
export const PROOF_SCHEMA_VERSION = 1

/**
 * Compute the canonical content-addressed proof digest for a Pack v3.
 * Binds only preflight-semantic inputs: the exact pack record (excluding volatile
 * `updated_at`), full Analysis v2 frontmatter records, full Relation v2 records,
 * and member skill eligibility/version facts. Evaluator output (checked_claim_ids,
 * metrics, blockers, decision) is never included.
 *
 * @param {object} pack - Normalized canonical Pack v3 record (with updated_at stripped)
 * @param {Map<string,object>} analyses - keyed by analysis_id, full Analysis v2 frontmatter
 * @param {Map<string,object>} relations - keyed by relation_id, full Relation v2 record
 * @param {Map<string,object>} skills - keyed by skill_id, { status, identity: { current_version_id } }
 * @returns {{ digest: string, proofInput: object }}
 */
export function computePackProof({ pack, analyses, relations, skills }) {
  const proofInput = buildCanonicalPackProofInput({
    pack,
    analyses,
    relations,
    skills,
    rulesVersion: PROOF_RULES_VERSION,
  })
  const digest = sha256(stableStringify(proofInput))
  return { digest, proofInput }
}

export function buildProofRecord({ pack, analyses, relations, skills }) {
  const { digest, proofInput } = computePackProof({ pack, analyses, relations, skills })
  const analysisIds = (pack.evidence?.analysis_ids ?? []).slice().sort()
  const relationIds = (pack.evidence?.relation_ids ?? []).slice().sort()
  const memberSkillIds = (pack.members ?? []).map(m => m.skill_id).sort()

  const analysisHashes = Object.fromEntries(
    analysisIds.map(id => {
      const a = analyses.get(id)
      return [id, a ? sha256(stableStringify(sortProofDeep(a))) : null]
    })
  )
  const relationHashes = Object.fromEntries(
    relationIds.map(id => {
      const r = relations.get(id)
      return [id, r ? sha256(stableStringify(sortProofDeep(r))) : null]
    })
  )
  const skillEvidenceHashes = Object.fromEntries(
    memberSkillIds.map(skillId => {
      const s = skills.get(skillId)
      if (!s) return [skillId, null]
      return [skillId, sha256(stableStringify({
        skill_id: skillId,
        status: s.status,
        current_version_id: s.identity?.current_version_id ?? null,
      }))]
    })
  )

  return {
    schema_version: PROOF_SCHEMA_VERSION,
    pack_id: pack.pack_id,
    rules_version: PROOF_RULES_VERSION,
    content_digest: digest,
    analysis_ids: analysisIds,
    analysis_hashes: analysisHashes,
    relation_ids: relationIds,
    relation_hashes: relationHashes,
    skill_evidence_ids: memberSkillIds,
    skill_evidence_hashes: skillEvidenceHashes,
    created_by_run: pack.created_by_run ?? 'run_unknown',
    created_at: pack.updated_at ?? new Date().toISOString(),
  }
}

/**
 * Validate a stored proof record: schema version, pack_id, rules_version.
 * Returns the proof record if valid, throws on mismatch.
 */
export function validateProofRecord(proofRecord, expectedPackId) {
  if (!proofRecord || typeof proofRecord !== 'object' || Array.isArray(proofRecord)) {
    throw new Error('Invalid proof record: not a valid object')
  }
  if (proofRecord.schema_version !== PROOF_SCHEMA_VERSION) {
    throw new Error(`Proof schema version mismatch: expected ${PROOF_SCHEMA_VERSION}, got ${proofRecord.schema_version}`)
  }
  if (proofRecord.pack_id !== expectedPackId) {
    throw new Error(`Proof pack_id mismatch: expected ${expectedPackId}, got ${proofRecord.pack_id}`)
  }
  if (proofRecord.rules_version !== PROOF_RULES_VERSION) {
    throw new Error(`Proof rules version mismatch: expected ${PROOF_RULES_VERSION}, got ${proofRecord.rules_version}`)
  }
  if (!proofRecord.content_digest || !proofRecord.content_digest.startsWith('sha256:')) {
    throw new Error('Invalid proof record: missing or malformed content_digest')
  }
  return proofRecord
}

/**
 * Recompute the current content digest from exact canonical files.
 * Used by evaluation and promotion to validate staleness.
 * Does NOT run preflight — only content-addressed hashing.
 */
export function recomputeContentDigest({ pack, analyses, relations, skills }) {
  return computePackProof({ pack, analyses, relations, skills }).digest
}

// --- Claim-bound relation validation ---

function analysisForSkill(analyses, skillId) {
  for (const analysis of analyses.values()) {
    if (analysis?.skill_id === skillId) return analysis
  }
  return null
}

export function validateRelationClaimBinding(relation, analyses) {
  const errors = []
  if (relation.predicate !== 'chains_with') return { ok: true, errors }

  const cw = relation.chains_with
  if (!cw) {
    errors.push({ code: 'relation_missing_chains_with', reason: `Relation ${relation.relation_id} predicate is chains_with but missing chains_with block` })
    return { ok: false, errors }
  }

  const producerAnalysis = analysisForSkill(analyses, cw.producer_skill)
  const consumerAnalysis = analysisForSkill(analyses, cw.consumer_skill)

  if (!producerAnalysis) {
    throw new Error(`No analysis found for producer skill ${cw.producer_skill} — analyses must be loaded for canonical lifecycle`)
  }
  if (!consumerAnalysis) {
    throw new Error(`No analysis found for consumer skill ${cw.consumer_skill} — analyses must be loaded for canonical lifecycle`)
  }

  const producerProduces = producerAnalysis.claims?.produces ?? []
  const producerClaim = producerProduces.find(c => c.claim_id === cw.producer_claim_id)
  if (!producerClaim) {
    errors.push({
      code: 'relation_producer_claim_not_found',
      reason: `Producer ${cw.producer_skill} analysis has no produces claim ${cw.producer_claim_id}.` +
        ` Available produces: [${producerProduces.map(c => c.claim_id).join(', ') || 'none'}]`,
    })
  }

  const consumerRequiresRequired = consumerAnalysis.claims?.requires?.required ?? []
  const consumerRequiresOptional = consumerAnalysis.claims?.requires?.optional ?? []
  const allConsumerRequires = [...consumerRequiresRequired, ...consumerRequiresOptional]
  const consumerClaim = allConsumerRequires.find(c => c.claim_id === cw.consumer_claim_id)
  if (!consumerClaim) {
    errors.push({
      code: 'relation_consumer_claim_not_found',
      reason: `Consumer ${cw.consumer_skill} analysis has no requires claim ${cw.consumer_claim_id}.` +
        ` Available requires: [${allConsumerRequires.map(c => c.claim_id).join(', ') || 'none'}]`,
    })
  }

  if (consumerClaim && consumerRequiresOptional.some(c => c.claim_id === cw.consumer_claim_id)) {
    errors.push({
      code: 'relation_required_input_mislabeled_optional',
      reason: `Consumer ${cw.consumer_skill} claim ${cw.consumer_claim_id} is in requires.optional but chains_with demands it as a required handoff`,
    })
  }

  if (relation.subject && relation.subject !== cw.producer_skill) {
    errors.push({ code: 'relation_subject_mismatch', reason: `Relation subject ${relation.subject} != chains_with.producer_skill ${cw.producer_skill}` })
  }
  if (relation.object && relation.object !== cw.consumer_skill) {
    errors.push({ code: 'relation_object_mismatch', reason: `Relation object ${relation.object} != chains_with.consumer_skill ${cw.consumer_skill}` })
  }

  return { ok: errors.length === 0, errors }
}

// --- DAG preflight for v3 packs ---

export function preflightPackDagV3(pack, skills, relations, analyses) {
  const errors = []
  const nodes = Array.isArray(pack.workflow?.nodes) ? pack.workflow.nodes : []
  const edges = Array.isArray(pack.workflow?.edges) ? pack.workflow.edges : []
  const entryRoots = Array.isArray(pack.workflow?.entry_roots) ? pack.workflow.entry_roots : []
  const terminalSinks = Array.isArray(pack.workflow?.terminal_sinks) ? pack.workflow.terminal_sinks : []
  const members = Array.isArray(pack.members) ? pack.members : []

  const nodeById = new Map()
  const nodeIds = new Set()
  const edgeIds = new Set()
  const memberSkillIds = new Set()
  const assignedMembers = new Set()

  // --- Member validation ---
  for (const member of members) {
    if (memberSkillIds.has(member.skill_id)) {
      errors.push({ code: 'member_duplicate_skill_id', reason: `member skill_id ${member.skill_id} appears more than once` })
    }
    memberSkillIds.add(member.skill_id)

    const skill = skills.get(member.skill_id)
    if (!skill) {
      errors.push({ code: 'member_missing', reason: `member ${member.skill_id} not found in skill catalog` })
      continue
    }
    if (!['active', 'preview'].includes(skill.status)) {
      errors.push({ code: 'member_blocked', reason: `member ${member.skill_id} has status ${skill.status} (expected active or preview)` })
    }
    if (skill.identity?.current_version_id !== member.version_id) {
      errors.push({ code: 'member_version_stale', reason: `member ${member.skill_id} pins version ${member.version_id} but current is ${skill.identity?.current_version_id ?? 'unknown'}` })
    }
  }

  // --- Node validation ---
  if (nodes.length === 0) {
    errors.push({ code: 'dag_no_nodes', reason: 'workflow.nodes must be non-empty' })
  }

  for (const node of nodes) {
    if (!node.node_id) {
      errors.push({ code: 'node_no_id', reason: 'node is missing node_id' })
      continue
    }
    if (nodeIds.has(node.node_id)) {
      errors.push({ code: 'node_duplicate_id', reason: `node ${node.node_id} appears more than once` })
      continue
    }
    nodeIds.add(node.node_id)
    nodeById.set(node.node_id, node)

    if (!node.type) {
      errors.push({ code: 'node_no_type', reason: `node ${node.node_id} is missing type` })
    }

    const mids = Array.isArray(node.member_ids) ? node.member_ids : []
    for (const mid of mids) {
      if (!memberSkillIds.has(mid)) {
        errors.push({ code: 'node_member_unknown', reason: `node ${node.node_id} references member ${mid} not in pack members` })
      }
      if (assignedMembers.has(mid)) {
        errors.push({ code: 'node_member_duplicate', reason: `member ${mid} assigned to multiple nodes` })
      }
      assignedMembers.add(mid)
    }

    // Structured entry_contract validation
    const ec = node.entry_contract
    if (!ec || typeof ec !== 'object' || Array.isArray(ec)) {
      errors.push({ code: 'node_bad_entry_contract', reason: `node ${node.node_id} must have structured entry_contract object` })
    } else {
      if (!Array.isArray(ec.required_claim_ids)) errors.push({ code: 'node_bad_entry_contract', reason: `node ${node.node_id} entry_contract.required_claim_ids must be an array` })
      if (!Array.isArray(ec.precondition_claim_ids)) errors.push({ code: 'node_bad_entry_contract', reason: `node ${node.node_id} entry_contract.precondition_claim_ids must be an array` })
      if (!Array.isArray(ec.refusal_claim_ids)) errors.push({ code: 'node_bad_entry_contract', reason: `node ${node.node_id} entry_contract.refusal_claim_ids must be an array` })
      if (!Array.isArray(ec.tool_constraint_claim_ids)) errors.push({ code: 'node_bad_entry_contract', reason: `node ${node.node_id} entry_contract.tool_constraint_claim_ids must be an array` })
      if (typeof ec.description !== 'string' || ec.description.length === 0) errors.push({ code: 'node_bad_entry_contract', reason: `node ${node.node_id} entry_contract.description must be a non-empty string` })
    }

    // Structured output_contract validation
    const oc = node.output_contract
    if (!oc || typeof oc !== 'object' || Array.isArray(oc)) {
      errors.push({ code: 'node_bad_output_contract', reason: `node ${node.node_id} must have structured output_contract object` })
    } else {
      if (!Array.isArray(oc.produces_claim_ids)) errors.push({ code: 'node_bad_output_contract', reason: `node ${node.node_id} output_contract.produces_claim_ids must be an array` })
      if (typeof oc.description !== 'string' || oc.description.length === 0) errors.push({ code: 'node_bad_output_contract', reason: `node ${node.node_id} output_contract.description must be a non-empty string` })
    }
  }

  // --- Every member must be assigned to a node ---
  for (const member of members) {
    if (!assignedMembers.has(member.skill_id)) {
      errors.push({ code: 'member_unassigned', reason: `member ${member.skill_id} is not assigned to any node` })
    }
  }

  // --- Entry roots validation ---
  if (entryRoots.length === 0) {
    errors.push({ code: 'dag_no_entry_roots', reason: 'workflow.entry_roots must be non-empty' })
  }
  for (const rid of entryRoots) {
    if (!nodeIds.has(rid)) {
      errors.push({ code: 'dag_entry_root_unknown', reason: `entry_root ${rid} is not a defined node` })
    }
  }

  // --- Terminal sinks validation ---
  if (terminalSinks.length === 0) {
    errors.push({ code: 'dag_no_terminal_sinks', reason: 'workflow.terminal_sinks must be non-empty' })
  }
  for (const sid of terminalSinks) {
    if (!nodeIds.has(sid)) {
      errors.push({ code: 'dag_terminal_sink_unknown', reason: `terminal_sink ${sid} is not a defined node` })
    }
  }

  // --- Edge validation ---
  for (const edge of edges) {
    if (!edge.edge_id) {
      errors.push({ code: 'edge_no_id', reason: 'edge is missing edge_id' })
      continue
    }
    if (edgeIds.has(edge.edge_id)) {
      errors.push({ code: 'edge_duplicate_id', reason: `edge ${edge.edge_id} appears more than once` })
      continue
    }
    edgeIds.add(edge.edge_id)

    if (!nodeIds.has(edge.from_node)) {
      errors.push({ code: 'edge_from_node_unknown', reason: `edge ${edge.edge_id} from_node ${edge.from_node} is not a defined node` })
    }
    if (!nodeIds.has(edge.to_node)) {
      errors.push({ code: 'edge_to_node_unknown', reason: `edge ${edge.edge_id} to_node ${edge.to_node} is not a defined node` })
    }
    if (edge.from_node === edge.to_node) {
      errors.push({ code: 'edge_self_loop', reason: `edge ${edge.edge_id} is a self-loop (${edge.from_node} -> ${edge.to_node})` })
    }
  }

  // --- DAG reachability: all nodes reachable from entry_roots ---
  const reachable = new Set(entryRoots)
  let changed = true
  while (changed) {
    changed = false
    for (const edge of edges) {
      if (reachable.has(edge.from_node) && !reachable.has(edge.to_node)) {
        reachable.add(edge.to_node)
        changed = true
      }
    }
  }

  for (const nodeId of nodeIds) {
    if (!reachable.has(nodeId)) {
      errors.push({ code: 'dag_unreachable_node', reason: `node ${nodeId} is not reachable from any entry root` })
    }
  }

  // --- All terminal sinks must be reachable ---
  for (const sid of terminalSinks) {
    if (!reachable.has(sid)) {
      errors.push({ code: 'dag_unreachable_terminal', reason: `terminal_sink ${sid} is not reachable from any entry root` })
    }
  }

  // --- All nodes must be able to reach at least one terminal sink ---
  const reverseAdj = new Map()
  for (const nid of nodeIds) reverseAdj.set(nid, [])
  for (const edge of edges) {
    if (nodeIds.has(edge.from_node) && nodeIds.has(edge.to_node)) {
      reverseAdj.get(edge.to_node).push(edge.from_node)
    }
  }
  const canReachTerminal = new Set(terminalSinks)
  changed = true
  while (changed) {
    changed = false
    for (const nid of nodeIds) {
      if (!canReachTerminal.has(nid)) {
        const neighbors = reverseAdj.get(nid) || []
        for (const pred of neighbors) {
          if (!canReachTerminal.has(pred) && canReachTerminal.has(nid)) {
            canReachTerminal.add(pred)
            changed = true
          }
        }
      }
    }
    // Also reverse: find nodes whose outgoing edges go to canReachTerminal
    for (const edge of edges) {
      if (canReachTerminal.has(edge.to_node) && !canReachTerminal.has(edge.from_node)) {
        canReachTerminal.add(edge.from_node)
        changed = true
      }
    }
  }
  for (const nid of nodeIds) {
    if (!canReachTerminal.has(nid)) {
      errors.push({ code: 'dag_node_cannot_reach_terminal', reason: `node ${nid} cannot reach any terminal sink` })
    }
  }

  // --- Cycle detection via topological sort ---
  if (edges.length > 0 && nodeIds.size > 1) {
    const inDegree = new Map()
    const adj = new Map()
    for (const nid of nodeIds) {
      inDegree.set(nid, 0)
      adj.set(nid, [])
    }
    for (const edge of edges) {
      if (nodeIds.has(edge.from_node) && nodeIds.has(edge.to_node)) {
        adj.get(edge.from_node).push(edge.to_node)
        inDegree.set(edge.to_node, (inDegree.get(edge.to_node) || 0) + 1)
      }
    }
    const queue = []
    for (const [nid, deg] of inDegree) {
      if (deg === 0) queue.push(nid)
    }
    const sorted = []
    while (queue.length) {
      const nid = queue.shift()
      sorted.push(nid)
      for (const neighbor of adj.get(nid) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1)
        if (inDegree.get(neighbor) === 0) queue.push(neighbor)
      }
    }
    if (sorted.length !== nodeIds.size) {
      const inCycle = [...nodeIds].filter(n => !sorted.includes(n))
      errors.push({ code: 'dag_cycle_detected', reason: `DAG contains cycle(s) involving nodes: ${inCycle.join(', ')}` })
    }
  }

  // --- Exact edge handoff validation ---
  const compatChains = Array.isArray(pack.compatibility?.chains) ? pack.compatibility.chains : []
  const compatByRelId = new Map()
  for (const cu of compatChains) {
    if (cu.relation_id) compatByRelId.set(cu.relation_id, cu)
  }

  for (const edge of edges) {
    const handoff = edge.artifact_handoff
    if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) {
      errors.push({ code: 'edge_missing_artifact_handoff', reason: `edge ${edge.edge_id} must have structured artifact_handoff object` })
      continue
    }

    const requiredFields = ['relation_id', 'producer_skill_id', 'producer_claim_id', 'consumer_skill_id', 'consumer_claim_id', 'produced', 'consumed_as']
    for (const f of requiredFields) {
      if (!handoff[f]) {
        errors.push({ code: 'edge_handoff_missing_field', reason: `edge ${edge.edge_id} artifact_handoff.${f} is missing` })
      }
    }

    if (!handoff.relation_id) continue

    // Verify relation exists
    const rel = relations.get(handoff.relation_id)
    if (!rel) {
      errors.push({ code: 'edge_handoff_relation_unknown', reason: `edge ${edge.edge_id} references relation ${handoff.relation_id} not found` })
      continue
    }

    if (rel.predicate !== 'chains_with') {
      errors.push({ code: 'edge_handoff_not_chains_with', reason: `edge ${edge.edge_id} artifact_handoff relation ${handoff.relation_id} is not chains_with (is ${rel.predicate})` })
      continue
    }

    // Verify relation is used in compatibility.chains
    const compatUsage = compatByRelId.get(handoff.relation_id)
    if (!compatUsage) {
      errors.push({ code: 'edge_handoff_relation_not_in_compatibility', reason: `edge ${edge.edge_id} references relation ${handoff.relation_id} not found in compatibility.chains` })
    }
    if (compatUsage && compatUsage.state && compatUsage.state !== 'used') {
      errors.push({ code: 'edge_handoff_relation_not_used', reason: `edge ${edge.edge_id} references relation ${handoff.relation_id} with state '${compatUsage.state}' (must be 'used')` })
    }

    const cw = rel.chains_with
    if (!cw) {
      errors.push({ code: 'edge_handoff_relation_no_chains_with', reason: `edge ${edge.edge_id} relation ${handoff.relation_id} has no chains_with block` })
      continue
    }

    // Edge direction must equal relation direction
    if (edge.direction !== cw.direction) {
      errors.push({ code: 'edge_direction_mismatch', reason: `edge ${edge.edge_id} direction ${edge.direction} != relation ${handoff.relation_id} chains_with.direction ${cw.direction}` })
    }

    // Producer/consumer skill IDs must match relation
    if (handoff.producer_skill_id !== cw.producer_skill) {
      errors.push({ code: 'edge_handoff_producer_mismatch', reason: `edge ${edge.edge_id} producer_skill_id ${handoff.producer_skill_id} != relation ${handoff.relation_id} chains_with.producer_skill ${cw.producer_skill}` })
    }
    if (handoff.consumer_skill_id !== cw.consumer_skill) {
      errors.push({ code: 'edge_handoff_consumer_mismatch', reason: `edge ${edge.edge_id} consumer_skill_id ${handoff.consumer_skill_id} != relation ${handoff.relation_id} chains_with.consumer_skill ${cw.consumer_skill}` })
    }

    // Claim IDs must match relation
    if (handoff.producer_claim_id !== cw.producer_claim_id) {
      errors.push({ code: 'edge_handoff_producer_claim_mismatch', reason: `edge ${edge.edge_id} producer_claim_id ${handoff.producer_claim_id} != relation ${handoff.relation_id} chains_with.producer_claim_id ${cw.producer_claim_id}` })
    }
    if (handoff.consumer_claim_id !== cw.consumer_claim_id) {
      errors.push({ code: 'edge_handoff_consumer_claim_mismatch', reason: `edge ${edge.edge_id} consumer_claim_id ${handoff.consumer_claim_id} != relation ${handoff.relation_id} chains_with.consumer_claim_id ${cw.consumer_claim_id}` })
    }

    // Producer skill must be in from_node's member_ids
    const fromNode = nodeById.get(edge.from_node)
    if (fromNode) {
      const fromMids = Array.isArray(fromNode.member_ids) ? fromNode.member_ids : []
      if (!fromMids.includes(handoff.producer_skill_id)) {
        errors.push({ code: 'edge_handoff_producer_not_in_from_node', reason: `edge ${edge.edge_id} producer_skill_id ${handoff.producer_skill_id} not in from_node ${edge.from_node} member_ids [${fromMids.join(',')}]` })
      }
    }

    // Consumer skill must be in to_node's member_ids
    const toNode = nodeById.get(edge.to_node)
    if (toNode) {
      const toMids = Array.isArray(toNode.member_ids) ? toNode.member_ids : []
      if (!toMids.includes(handoff.consumer_skill_id)) {
        errors.push({ code: 'edge_handoff_consumer_not_in_to_node', reason: `edge ${edge.edge_id} consumer_skill_id ${handoff.consumer_skill_id} not in to_node ${edge.to_node} member_ids [${toMids.join(',')}]` })
      }
    }

    // Validate relation claim binding — analyses must be loaded for canonical lifecycle
    const relCheck = validateRelationClaimBinding(rel, analyses)
    if (!relCheck.ok) {
      for (const relErr of relCheck.errors) {
        errors.push(relErr)
      }
    }
  }

  // --- Entry contract claim coverage ---
  // For each node, required_claim_ids must cover member requires.required claims not satisfied by incoming edge consumer claims
  for (const node of nodes) {
    const ec = node.entry_contract
    if (!ec || !Array.isArray(ec.required_claim_ids)) continue
    const mids = Array.isArray(node.member_ids) ? node.member_ids : []

    // Collect all requires.required claims from member analyses
    const allRequiredClaims = new Set()
    for (const mid of mids) {
      const analysis = analysisForSkill(analyses, mid)
      if (!analysis) continue
      const reqs = analysis.claims?.requires?.required ?? []
      for (const r of reqs) allRequiredClaims.add(r.claim_id)
    }

    // Collect consumer claims satisfied by incoming edges
    const satisfiedByIncomingEdges = new Set()
    for (const edge of edges) {
      if (edge.to_node !== node.node_id) continue
      const handoff = edge.artifact_handoff
      if (handoff && handoff.consumer_claim_id) {
        satisfiedByIncomingEdges.add(handoff.consumer_claim_id)
      }
    }

    // Required claims not satisfied by incoming edges must be in entry_contract.required_claim_ids
    const expectedRequired = new Set(ec.required_claim_ids)
    for (const rc of allRequiredClaims) {
      if (!satisfiedByIncomingEdges.has(rc) && !expectedRequired.has(rc)) {
        errors.push({ code: 'node_entry_coverage_missing', reason: `node ${node.node_id} requires.required claim ${rc} is not satisfied by an incoming edge and not in entry_contract.required_claim_ids` })
      }
    }

    // Extra claims in entry_contract that aren't needed
    for (const erc of expectedRequired) {
      if (!allRequiredClaims.has(erc)) {
        // If no members or empty node, extra claims are fine (root nodes can declare external inputs)
        if (mids.length > 0) {
          errors.push({ code: 'node_entry_coverage_extra', reason: `node ${node.node_id} entry_contract.required_claim_ids includes ${erc} not in any member requires.required` })
        }
      }
    }
  }

  // --- Output contract claim coverage ---
  for (const node of nodes) {
    const oc = node.output_contract
    if (!oc || !Array.isArray(oc.produces_claim_ids)) continue
    const mids = Array.isArray(node.member_ids) ? node.member_ids : []

    // Collect all produces claims from member analyses
    const allProduces = new Set()
    for (const mid of mids) {
      const analysis = analysisForSkill(analyses, mid)
      if (!analysis) continue
      const prds = analysis.claims?.produces ?? []
      for (const p of prds) allProduces.add(p.claim_id)
    }

    if (mids.length > 0) {
      // Node with members must exactly cover Analysis v2 produces claims
      const ocSet = new Set(oc.produces_claim_ids)
      for (const ap of allProduces) {
        if (!ocSet.has(ap)) {
          errors.push({ code: 'node_output_coverage_missing', reason: `node ${node.node_id} output_contract.produces_claim_ids missing produces claim ${ap}` })
        }
      }
      for (const oid of ocSet) {
        if (!allProduces.has(oid)) {
          errors.push({ code: 'node_output_coverage_extra', reason: `node ${node.node_id} output_contract.produces_claim_ids includes ${oid} not in any member produces` })
        }
      }
    }
  }

  // --- Precondition/refusal/tool_constraint coverage ---
  for (const node of nodes) {
    const ec = node.entry_contract
    if (!ec || !Array.isArray(ec.precondition_claim_ids)) continue
    const mids = Array.isArray(node.member_ids) ? node.member_ids : []

    const allPreconditions = new Set()
    const allRefusals = new Set()
    const allToolConstraints = new Set()

    for (const mid of mids) {
      const analysis = analysisForSkill(analyses, mid)
      if (!analysis) continue
      for (const p of (analysis.claims?.preconditions ?? [])) allPreconditions.add(p.claim_id)
      for (const r of (analysis.claims?.refusal ?? [])) allRefusals.add(r.claim_id)
      for (const t of (analysis.claims?.tool_constraints ?? [])) allToolConstraints.add(t.claim_id)
    }

    if (mids.length > 0) {
      // Preconditions
      const ecPre = new Set(ec.precondition_claim_ids)
      for (const ap of allPreconditions) {
        if (!ecPre.has(ap)) {
          errors.push({ code: 'node_precondition_coverage_missing', reason: `node ${node.node_id} entry_contract.precondition_claim_ids missing precondition claim ${ap}` })
        }
      }

      // Refusals
      const ecRef = new Set(ec.refusal_claim_ids)
      for (const ar of allRefusals) {
        if (!ecRef.has(ar)) {
          errors.push({ code: 'node_refusal_coverage_missing', reason: `node ${node.node_id} entry_contract.refusal_claim_ids missing refusal claim ${ar}` })
        }
      }

      // Tool constraints
      const ecTc = new Set(ec.tool_constraint_claim_ids)
      for (const at of allToolConstraints) {
        if (!ecTc.has(at)) {
          errors.push({ code: 'node_tool_constraint_coverage_missing', reason: `node ${node.node_id} entry_contract.tool_constraint_claim_ids missing tool_constraint claim ${at}` })
        }
      }
    }
  }

  // --- Compatibility relation usage validation ---
  const allCompatRelations = [
    ...(Array.isArray(pack.compatibility?.chains) ? pack.compatibility.chains : []),
    ...(Array.isArray(pack.compatibility?.strengthens) ? pack.compatibility.strengthens : []),
    ...(Array.isArray(pack.compatibility?.alternatives) ? pack.compatibility.alternatives : []),
    ...(Array.isArray(pack.compatibility?.conflicts) ? pack.compatibility.conflicts : []),
  ]

  for (const cu of allCompatRelations) {
    // state is required by schema
    if (!cu.state) {
      errors.push({ code: 'compat_usage_missing_state', reason: `compatibility usage for ${cu.relation_id} missing state` })
    }

    // Verify the relation exists
    if (cu.relation_id && !relations.has(cu.relation_id)) {
      errors.push({ code: 'compat_usage_relation_unknown', reason: `compatibility references relation ${cu.relation_id} not found` })
    }

    // Check predicate/category alignment
    const rel = relations.get(cu.relation_id)
    if (rel) {
      // Determine which compatibility slot this is from
      let expectedPredicate = null
      for (const ch of (pack.compatibility?.chains ?? [])) { if (ch.relation_id === cu.relation_id) expectedPredicate = 'chains_with' }
      for (const ch of (pack.compatibility?.strengthens ?? [])) { if (ch.relation_id === cu.relation_id) expectedPredicate = 'strengthens' }
      for (const ch of (pack.compatibility?.alternatives ?? [])) { if (ch.relation_id === cu.relation_id) expectedPredicate = 'alternatives' }
      for (const ch of (pack.compatibility?.conflicts ?? [])) { if (ch.relation_id === cu.relation_id) expectedPredicate = 'conflicts_with' }

      if (expectedPredicate && rel.predicate !== expectedPredicate) {
        errors.push({ code: 'compat_usage_predicate_mismatch', reason: `relation ${cu.relation_id} predicate is ${rel.predicate} but used in compatibility.${expectedPredicate}` })
      }
    }
  }

  // --- Every supplied relation must be disposed ---
  const suppliedRelationIds = new Set(pack.evidence?.relation_ids ?? [])
  const usedRelationIds = new Set(allCompatRelations.map(c => c.relation_id).filter(Boolean))
  for (const rid of suppliedRelationIds) {
    if (!usedRelationIds.has(rid)) {
      errors.push({ code: 'relation_not_disposed', reason: `evidence relation ${rid} is not referenced in compatibility` })
    }
  }
  for (const rid of usedRelationIds) {
    if (!suppliedRelationIds.has(rid)) {
      errors.push({ code: 'relation_not_in_evidence', reason: `compatibility references relation ${rid} not in evidence.relation_ids` })
    }
  }

  // --- Artifact_mapping claim_id validation ---
  for (const am of (pack.artifact_mapping ?? [])) {
    if (am.claim_id) {
      if (!nodeById.has(am.node_id)) {
        errors.push({ code: 'artifact_mapping_node_unknown', reason: `artifact_mapping references unknown node ${am.node_id}` })
        continue
      }
      const node = nodeById.get(am.node_id)
      const oc = node.output_contract
      if (!oc || !Array.isArray(oc.produces_claim_ids) || !oc.produces_claim_ids.includes(am.claim_id)) {
        errors.push({ code: 'artifact_mapping_claim_not_in_output', reason: `artifact_mapping claim_id ${am.claim_id} not in node ${am.node_id} output_contract.produces_claim_ids` })
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

// --- MIN-gate evaluation ---

export function evaluatePackV3({ evaluation, pack, proofDigest, skills, relations, analyses }) {
  const structuralBlockers = []
  const metricFindings = []
  const warnings = []
  const metrics = evaluation.metrics ?? {}

  // --- Independence: synthesis_session_id !== evaluation_session_id ---
  if (!evaluation.synthesis_session_id || !evaluation.evaluation_session_id) {
    structuralBlockers.push({
      code: 'missing_session_ids',
      description: 'Evaluation must have both synthesis_session_id and evaluation_session_id',
    })
  } else if (evaluation.synthesis_session_id === evaluation.evaluation_session_id) {
    structuralBlockers.push({
      code: 'same_session',
      description: `synthesis_session_id and evaluation_session_id must differ (both are ${evaluation.synthesis_session_id})`,
    })
  }

  // --- Proof binding ---
  if (!proofDigest) {
    structuralBlockers.push({
      code: 'missing_proof',
      description: 'Evaluation must bind to a content-addressed proof digest',
    })
  }

  // --- MIN-gate: each metric checked ---
  // < 0.50 => rejected; missing => invalid/rejected; all >= 0.70 => passed; no blockers + 0.50–0.69 => needs_work
  const requiredMetrics = [
    'relevance', 'coverage', 'non_redundancy', 'workflow_coherence',
    'compatibility', 'conflict_control', 'evidence_quality', 'actionability',
    'freshness', 'source_quality',
  ]

  let allPassMinGate = true
  let hasBelow50 = false
  let anyMissing = false
  let minScore = null
  for (const key of requiredMetrics) {
    const m = metrics[key]
    if (!m || typeof m.score !== 'number') {
      metricFindings.push({
        kind: 'metric_missing',
        metric: key,
        detail: `Metric ${key} is missing or has no numeric score`,
      })
      anyMissing = true
      allPassMinGate = false
    } else {
      if (m.score < 0.50) {
        hasBelow50 = true
        allPassMinGate = false
        metricFindings.push({
          kind: 'metric_below_min',
          metric: key,
          score: m.score,
          threshold: 0.50,
          detail: `Metric ${key} score ${m.score} is below reject threshold 0.50`,
        })
      } else if (m.score < 0.70) {
        allPassMinGate = false
        metricFindings.push({
          kind: 'metric_below_min',
          metric: key,
          score: m.score,
          threshold: 0.70,
          detail: `Metric ${key} score ${m.score} is below MIN-gate threshold 0.70`,
        })
      }
      if (minScore === null || m.score < minScore) minScore = m.score
    }
  }

  // --- Blockers from evaluation input (explicit evaluator blockers are structural) ---
  for (const b of (evaluation.blockers ?? [])) {
    structuralBlockers.push(b)
  }

  // --- Claim coverage check from checked_claim_ids ---
  // Analyses must be loaded for canonical lifecycle — missing analyses fail closed.
  const checkedClaims = new Set(evaluation.checked_claim_ids ?? [])
  if (pack && analyses) {
    const edges = Array.isArray(pack.workflow?.edges) ? pack.workflow.edges : []
    for (const edge of edges) {
      const handoff = edge.artifact_handoff
      if (handoff) {
        if (handoff.producer_claim_id && !checkedClaims.has(handoff.producer_claim_id)) {
          structuralBlockers.push({
            code: 'edge_producer_claim_not_checked',
            description: `Edge ${edge.edge_id} producer_claim_id ${handoff.producer_claim_id} not in evaluation checked_claim_ids`,
            claim_id: handoff.producer_claim_id,
          })
        }
        if (handoff.consumer_claim_id && !checkedClaims.has(handoff.consumer_claim_id)) {
          structuralBlockers.push({
            code: 'edge_consumer_claim_not_checked',
            description: `Edge ${edge.edge_id} consumer_claim_id ${handoff.consumer_claim_id} not in evaluation checked_claim_ids`,
            claim_id: handoff.consumer_claim_id,
          })
        }
      }
    }

    // Entry contract claim checks
    const nodes = Array.isArray(pack.workflow?.nodes) ? pack.workflow.nodes : []
    for (const node of nodes) {
      const ec = node.entry_contract
      if (ec) {
        for (const cid of (ec.required_claim_ids ?? [])) {
          if (!checkedClaims.has(cid)) {
            structuralBlockers.push({
              code: 'entry_required_claim_not_checked',
              description: `Node ${node.node_id} entry_contract.required_claim_ids includes ${cid} not in evaluation checked_claim_ids`,
              claim_id: cid,
            })
          }
        }
        for (const cid of (ec.precondition_claim_ids ?? [])) {
          if (!checkedClaims.has(cid)) {
            structuralBlockers.push({
              code: 'entry_precondition_claim_not_checked',
              description: `Node ${node.node_id} entry_contract.precondition_claim_ids includes ${cid} not in evaluation checked_claim_ids`,
              claim_id: cid,
            })
          }
        }
        for (const cid of (ec.refusal_claim_ids ?? [])) {
          if (!checkedClaims.has(cid)) {
            structuralBlockers.push({
              code: 'entry_refusal_claim_not_checked',
              description: `Node ${node.node_id} entry_contract.refusal_claim_ids includes ${cid} not in evaluation checked_claim_ids`,
              claim_id: cid,
            })
          }
        }
        for (const cid of (ec.tool_constraint_claim_ids ?? [])) {
          if (!checkedClaims.has(cid)) {
            structuralBlockers.push({
              code: 'entry_tool_constraint_claim_not_checked',
              description: `Node ${node.node_id} entry_contract.tool_constraint_claim_ids includes ${cid} not in evaluation checked_claim_ids`,
              claim_id: cid,
            })
          }
        }
      }
    }

    // Output contract claim checks
    for (const node of nodes) {
      const oc = node.output_contract
      if (oc) {
        for (const cid of (oc.produces_claim_ids ?? [])) {
          if (!checkedClaims.has(cid)) {
            structuralBlockers.push({
              code: 'output_produces_claim_not_checked',
              description: `Node ${node.node_id} output_contract.produces_claim_ids includes ${cid} not in evaluation checked_claim_ids`,
              claim_id: cid,
            })
          }
        }
      }
    }

    // Analysis claim group checks: alternatives, judgement
    for (const [id, analysis] of analyses) {
      const alts = analysis.claims?.alternatives ?? []
      for (const ac of alts) {
        if (!checkedClaims.has(ac.claim_id)) {
          structuralBlockers.push({
            code: 'alternative_claim_not_checked',
            description: `Analysis ${id} alternative claim ${ac.claim_id} not in evaluation checked_claim_ids`,
            claim_id: ac.claim_id,
          })
        }
      }
      const jdgs = analysis.claims?.judgement ?? []
      for (const j of jdgs) {
        if (!checkedClaims.has(j.claim_id)) {
          structuralBlockers.push({
            code: 'judgement_claim_not_checked',
            description: `Analysis ${id} judgement claim ${j.claim_id} not in evaluation checked_claim_ids`,
            claim_id: j.claim_id,
          })
        }
      }
    }
  }

  // --- Alternative disposition check ---
  if (analyses && pack) {
    const compatAlternatives = Array.isArray(pack.compatibility?.alternatives) ? pack.compatibility.alternatives : []
    const altDisposedSkillIds = new Set()
    for (const au of compatAlternatives) {
      const rel = relations?.get(au.relation_id)
      if (rel && rel.predicate === 'alternatives') {
        if (rel.subject) altDisposedSkillIds.add(rel.subject)
        if (rel.object) altDisposedSkillIds.add(rel.object)
        if (rel.alternatives) {
          if (rel.alternatives.candidate_a) altDisposedSkillIds.add(rel.alternatives.candidate_a)
          if (rel.alternatives.candidate_b) altDisposedSkillIds.add(rel.alternatives.candidate_b)
        }
      }
    }

    for (const [id, analysis] of analyses) {
      const alts = analysis.claims?.alternatives ?? []
      if (alts.length > 0 && !altDisposedSkillIds.has(analysis.skill_id)) {
        structuralBlockers.push({
          code: 'alternative_not_disposed',
          description: `Analysis ${id} (skill ${analysis.skill_id}) has alternative claims but no alternatives relation disposes it in pack compatibility`,
        })
      }
    }
  }

  // --- Conflict disposition check ---
  if (pack && relations) {
    const compatConflicts = Array.isArray(pack.compatibility?.conflicts) ? pack.compatibility.conflicts : []
    const conflictDisposedSkillIds = new Set()
    for (const cu of compatConflicts) {
      const rel = relations.get(cu.relation_id)
      if (rel && rel.predicate === 'conflicts_with') {
        if (rel.subject) conflictDisposedSkillIds.add(rel.subject)
        if (rel.object) conflictDisposedSkillIds.add(rel.object)
        if (rel.conflicts_with) {
          if (rel.conflicts_with.skill_a) conflictDisposedSkillIds.add(rel.conflicts_with.skill_a)
          if (rel.conflicts_with.skill_b) conflictDisposedSkillIds.add(rel.conflicts_with.skill_b)
        }
      }
    }

    // All members with conflict relations should be disposed
    for (const rid of (pack.evidence?.relation_ids ?? [])) {
      const rel = relations.get(rid)
      if (rel && rel.predicate === 'conflicts_with') {
        const compatUsage = compatConflicts.find(c => c.relation_id === rid)
        if (!compatUsage) {
          structuralBlockers.push({
            code: 'conflict_relation_not_in_compatibility',
            description: `Conflict relation ${rid} is in evidence but not in compatibility.conflicts`,
          })
        }
      }
    }
  }

  // --- Failure warning disposition ---
  if (analyses) {
    for (const [id, analysis] of analyses) {
      const fws = analysis.claims?.failure_warnings ?? []
      for (const fw of fws) {
        const evalWarnings = evaluation.warnings ?? []
        const covered = evalWarnings.some(w => w.claim_id === fw.claim_id)
        if (!covered) {
          structuralBlockers.push({
            code: 'failure_warning_not_disposed',
            description: `Analysis ${id} failure_warning ${fw.claim_id} (${(fw.content || '').slice(0, 80)}) not addressed in evaluation warnings`,
            claim_id: fw.claim_id,
          })
        }
      }
    }
  }

  // --- Required input mislabeled optional ---
  if (relations) {
    for (const [, rel] of relations) {
      if (rel.predicate !== 'chains_with') continue
      const cw = rel.chains_with
      if (!cw) continue
      const consAnalysis = analyses?.get(cw.consumer_skill)
      if (!consAnalysis) continue
      const optReqs = consAnalysis.claims?.requires?.optional ?? []
      if (optReqs.some(c => c.claim_id === cw.consumer_claim_id)) {
        structuralBlockers.push({
          code: 'required_input_mislabeled_optional',
          description: `chains_with relation ${rel.relation_id}: consumer claim ${cw.consumer_claim_id} is optional but required for handoff`,
          claim_id: cw.consumer_claim_id,
        })
      }
    }
  }

  // --- Stale proof check ---
  if (evaluation.proof_digest && evaluation.proof_digest !== proofDigest) {
    structuralBlockers.push({
      code: 'stale_proof',
      description: `Evaluation proof_digest ${evaluation.proof_digest} does not match computed proof ${proofDigest}`,
    })
  }

  // --- Decision (AVERAGE NEVER DECIDES) ---
  // MIN gate:
  // - any blocker => rejected
  // - any missing metric => invalid (treated as rejected)
  // - any score < 0.50 => rejected
  // - no blockers, all >= 0.50, some < 0.70 => needs_work
  // - all >= 0.70 => passed
  const hasStructuralBlockers = structuralBlockers.length > 0

  let level, passed, reason

  if (hasStructuralBlockers) {
    level = 'rejected'
    passed = false
    reason = `${structuralBlockers.length} structural blocker(s): ${structuralBlockers.map(b => b.code).join(', ')}`
  } else if (anyMissing) {
    level = 'rejected'
    passed = false
    reason = `${metricFindings.filter(f => f.kind === 'metric_missing').length} metric(s) missing: ${metricFindings.filter(f => f.kind === 'metric_missing').map(f => f.metric).join(', ')}`
  } else if (hasBelow50) {
    level = 'rejected'
    passed = false
    reason = `${metricFindings.filter(f => f.kind === 'metric_below_min' && f.threshold === 0.50).length} metric(s) below 0.50 reject threshold`
  } else if (!allPassMinGate) {
    level = 'needs_work'
    passed = false
    reason = `${metricFindings.length} metric(s) below MIN-gate 0.70 threshold`
  } else {
    level = 'passed'
    passed = true
    reason = 'All metrics pass MIN-gate (>= 0.70), no structural blockers'
  }

  const decision = {
    passed,
    level,
    reason,
    min_metric: minScore,
    blocker_count: structuralBlockers.length,
  }

  if (metricFindings.length > 0) {
    decision.findings = metricFindings
  }

  return { passed, blockers: structuralBlockers, warnings, decision }
}

// --- Load helpers ---

export function loadAnalysesByIds(analysisIds) {
  const ids = new Set(analysisIds)
  if (ids.size === 0) return new Map()
  const result = new Map()
  const analysesRoot = join(CATALOG, 'analyses')
  const requestedNames = new Map([...ids].map((id) => [`${id}.md`, id]))
  let paths = []
  try {
    paths = listFiles(analysesRoot, path => path.endsWith('.md'))
  } catch { /* no analyses directory */ }

  for (const path of paths) {
    const analysis = parseMarkdownFrontmatterFile(path)
    if (!analysis || !analysis.analysis_id || !ids.has(analysis.analysis_id)) continue
    if (analysis.schema_version !== 2) {
      throw new Error(`analysis ${path} has schema_version ${analysis.schema_version}, only v2 is supported`)
    }
    result.set(analysis.analysis_id, analysis)
  }

  for (const id of ids) {
    if (!result.has(id)) throw new Error(`Analysis ${id} not found in catalog — missing analyses must never be silently skipped`)
  }
  return result
}

export function loadAnalysesBySkillId(skillIds) {
  const ids = new Set(skillIds)
  if (ids.size === 0) return new Map()
  const result = new Map()
  const prefixDirs = new Set()
  for (const id of ids) {
    const prefix = id.replace(/^[^_]+_/, '').slice(0, 2).toLowerCase().replace(/[^a-z0-9]/g, 'x') || 'xx'
    prefixDirs.add(prefix)
  }
  for (const prefix of prefixDirs) {
    const dir = join(CATALOG, 'analyses', prefix)
    for (const path of listFiles(dir, p => p.endsWith('.md'))) {
      try {
        const fm = parseMarkdownFrontmatterFile(path)
        if (!fm || !fm.skill_id || !ids.has(fm.skill_id)) continue
        if (fm.schema_version !== 2) throw new Error(`analysis ${path} has schema_version ${fm.schema_version}, only v2 is supported`)
        result.set(fm.skill_id, fm)
        if (result.size === ids.size) return result
      } catch (e) {
        if (e.message && e.message.includes('schema_version')) throw e
      }
    }
  }
  return result
}

export function loadRelationsByIds(relationIds) {
  const ids = new Set(relationIds)
  const result = new Map()
  const globPath = join(CATALOG, 'relations')
  let files = []
  try {
    files = readdirSync(globPath).filter(f => f.startsWith('edges-') && f.endsWith('.jsonl'))
  } catch { return result }
  for (const file of files) {
    const rows = readJsonl(join(globPath, file))
    for (const row of rows) {
      if (row.relation_id && ids.has(row.relation_id)) {
        result.set(row.relation_id, row)
      }
    }
  }
  return result
}

export function loadAllRelations() {
  const result = new Map()
  const globPath = join(CATALOG, 'relations')
  let files = []
  try {
    files = readdirSync(globPath).filter(f => f.startsWith('edges-') && f.endsWith('.jsonl'))
  } catch { return result }
  for (const file of files) {
    const rows = readJsonl(join(globPath, file))
    for (const row of rows) {
      if (row.relation_id) result.set(row.relation_id, row)
    }
  }
  return result
}

// --- Proof file path ---

export function proofPathForPack(packId) {
  const evalPath = evaluationPathForPack(packId, 'candidate')
  return evalPath.replace(/evaluation\.json$/, 'preflight-proof.json')
}
