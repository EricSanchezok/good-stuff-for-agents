#!/usr/bin/env node
import {
  loadSkillsById, nowIso, packRecordPath, readDraft, writeYaml, writeTextAtomic, stableStringify,
} from './lib/catalog-lib.mjs'
import {
  buildProofRecord, loadAnalysesByIds, loadRelationsByIds, preflightPackDagV3, proofPathForPack,
  validateRelationClaimBinding,
} from './lib/pack-v3-lib.mjs'

const PLACEHOLDER_RE = /^(?:TODO|TBD|FIXME|placeholder|PLACEHOLDER|\.\.\.|N\/A|n\/a|none|empty|xxx|tbc|TBC)$/

function isEmptyOrPlaceholder(value) {
  if (typeof value !== 'string') return true
  const trimmed = value.trim()
  return trimmed.length === 0 || PLACEHOLDER_RE.test(trimmed)
}

function assertPackCandidateDraftV3(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw new Error('Pack candidate draft must be an object')
  if (Object.hasOwn(draft, 'status') && draft.status !== 'candidate') throw new Error('Pack candidate draft status must be candidate')
  const controlledFields = new Set(['record_bucket', 'published_at', 'output_path', 'expected_path', 'destination', 'evaluation'])
  for (const field of Object.keys(draft)) {
    if (controlledFields.has(field) || /^promot(?:e|ed|ion)/.test(field)) throw new Error(`Pack candidate draft must not include controller field ${field}`)
  }
  if (isEmptyOrPlaceholder(draft.pack_id)) throw new Error('Pack draft is missing pack_id')
  if (isEmptyOrPlaceholder(draft.name)) throw new Error('Pack draft is missing name')
  if (isEmptyOrPlaceholder(draft.intent)) throw new Error('Pack draft is missing intent')
  if (isEmptyOrPlaceholder(draft.domain)) throw new Error('Pack draft is missing domain')
  if (!Array.isArray(draft.members) || draft.members.length < 2) throw new Error('Pack draft must include at least 2 reviewed members')
  const memberSkillIds = new Set()
  for (const member of draft.members) {
    if (!member.skill_id) throw new Error('Pack draft has a member without skill_id')
    if (memberSkillIds.has(member.skill_id)) throw new Error(`Pack draft has duplicate member skill_id: ${member.skill_id}`)
    memberSkillIds.add(member.skill_id)
    if (!member.version_id) throw new Error(`Pack draft member ${member.skill_id} is missing version_id`)
    if (!member.role) throw new Error(`Pack draft member ${member.skill_id} is missing role`)
    if (!member.inclusion_reason) throw new Error(`Pack draft member ${member.skill_id} is missing inclusion_reason`)
  }

  if (!draft.workflow || typeof draft.workflow !== 'object' || Array.isArray(draft.workflow)) throw new Error('Pack draft must include v3 DAG workflow (nodes/edges/entry_roots/terminal_sinks)')
  if (!Array.isArray(draft.workflow.nodes) || draft.workflow.nodes.length < 1) throw new Error('Pack draft workflow.nodes must be a non-empty array')
  if (!Array.isArray(draft.workflow.edges)) throw new Error('Pack draft workflow.edges must be an array')
  if (!Array.isArray(draft.workflow.entry_roots) || draft.workflow.entry_roots.length < 1) throw new Error('Pack draft workflow.entry_roots must be a non-empty array')
  if (!Array.isArray(draft.workflow.terminal_sinks) || draft.workflow.terminal_sinks.length < 1) throw new Error('Pack draft workflow.terminal_sinks must be a non-empty array')

  for (const node of draft.workflow.nodes) {
    if (!node.node_id) throw new Error('Pack draft workflow node is missing node_id')
    if (!node.type) throw new Error(`Pack draft workflow node ${node.node_id} is missing type`)
    if (!Array.isArray(node.member_ids)) throw new Error(`Pack draft workflow node ${node.node_id} must have member_ids array`)
    for (const mid of (node.member_ids ?? [])) {
      if (!memberSkillIds.has(mid)) throw new Error(`Pack draft workflow node ${node.node_id} references member ${mid} not in pack members`)
    }
    // Structured entry_contract validation
    const ec = node.entry_contract
    if (!ec || typeof ec !== 'object' || Array.isArray(ec)) throw new Error(`Pack draft workflow node ${node.node_id} must have structured entry_contract object`)
    if (!Array.isArray(ec.required_claim_ids)) throw new Error(`Pack draft workflow node ${node.node_id} entry_contract.required_claim_ids must be an array`)
    if (!Array.isArray(ec.precondition_claim_ids)) throw new Error(`Pack draft workflow node ${node.node_id} entry_contract.precondition_claim_ids must be an array`)
    if (!Array.isArray(ec.refusal_claim_ids)) throw new Error(`Pack draft workflow node ${node.node_id} entry_contract.refusal_claim_ids must be an array`)
    if (!Array.isArray(ec.tool_constraint_claim_ids)) throw new Error(`Pack draft workflow node ${node.node_id} entry_contract.tool_constraint_claim_ids must be an array`)
    if (typeof ec.description !== 'string' || ec.description.length === 0) throw new Error(`Pack draft workflow node ${node.node_id} entry_contract.description must be a non-empty string`)

    const oc = node.output_contract
    if (!oc || typeof oc !== 'object' || Array.isArray(oc)) throw new Error(`Pack draft workflow node ${node.node_id} must have structured output_contract object`)
    if (!Array.isArray(oc.produces_claim_ids)) throw new Error(`Pack draft workflow node ${node.node_id} output_contract.produces_claim_ids must be an array`)
    if (typeof oc.description !== 'string' || oc.description.length === 0) throw new Error(`Pack draft workflow node ${node.node_id} output_contract.description must be a non-empty string`)
  }

  for (const edge of draft.workflow.edges) {
    if (!edge.edge_id) throw new Error('Pack draft workflow edge is missing edge_id')
    if (!edge.from_node) throw new Error(`Pack draft workflow edge ${edge.edge_id} is missing from_node`)
    if (!edge.to_node) throw new Error(`Pack draft workflow edge ${edge.edge_id} is missing to_node`)
    if (!edge.direction) throw new Error(`Pack draft workflow edge ${edge.edge_id} is missing direction`)
    // Structured artifact_handoff validation
    const handoff = edge.artifact_handoff
    if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) throw new Error(`Pack draft workflow edge ${edge.edge_id} must have structured artifact_handoff object`)
    const requiredFields = ['relation_id', 'producer_skill_id', 'producer_claim_id', 'consumer_skill_id', 'consumer_claim_id', 'produced', 'consumed_as']
    for (const f of requiredFields) {
      if (!handoff[f]) throw new Error(`Pack draft workflow edge ${edge.edge_id} artifact_handoff.${f} is missing`)
    }
  }

  if (!draft.compatibility || typeof draft.compatibility !== 'object' || Array.isArray(draft.compatibility)) throw new Error('Pack draft must include compatibility object')
  if (typeof draft.compatibility.notes !== 'string') throw new Error('Pack draft compatibility.notes must be a string')
  if (!draft.evidence || typeof draft.evidence !== 'object' || Array.isArray(draft.evidence)) throw new Error('Pack draft must include evidence object')
  if (!draft.members.find(() => true)) throw new Error('Pack draft members must be non-empty')
}

function normalizeCompatibilityV3(compatibility) {
  return {
    notes: compatibility?.notes ?? '',
    chains: (Array.isArray(compatibility?.chains) ? compatibility.chains : []).map(c => ({
      relation_id: c.relation_id,
      state: c.state ?? 'used',
      disposition: c.disposition ?? 'required',
      claim_ids: c.claim_ids ?? [],
      note: c.note,
    })),
    strengthens: (Array.isArray(compatibility?.strengthens) ? compatibility.strengthens : []).map(c => ({
      relation_id: c.relation_id,
      state: c.state ?? 'used',
      disposition: c.disposition ?? 'informational',
      claim_ids: c.claim_ids ?? [],
      note: c.note,
    })),
    alternatives: (Array.isArray(compatibility?.alternatives) ? compatibility.alternatives : []).map(c => ({
      relation_id: c.relation_id,
      state: c.state ?? 'used',
      disposition: c.disposition ?? 'contextual',
      claim_ids: c.claim_ids ?? [],
      note: c.note,
    })),
    conflicts: (Array.isArray(compatibility?.conflicts) ? compatibility.conflicts : []).map(c => ({
      relation_id: c.relation_id,
      state: c.state ?? 'used',
      disposition: c.disposition ?? 'undecided',
      claim_ids: c.claim_ids ?? [],
      note: c.note,
    })),
  }
}

const draft = readDraft(process.argv.slice(2))
assertPackCandidateDraftV3(draft)

const memberIds = (draft.members || []).map(m => m.skill_id)
const skillRecords = loadSkillsById(memberIds)
const skills = new Map(skillRecords.map(({ record: r }) => [r.canonical_skill_id, r]))

// Load analyses by exact analysis_ids from pack.evidence, not by member skill IDs
const analysisIds = draft.evidence?.analysis_ids ?? []
const analyses = loadAnalysesByIds(analysisIds)

// Enforce exact set equality: every member must have exactly one cited Analysis v2 record
const memberSkillIdSet = new Set(memberIds)
for (const [analysisId, analysis] of analyses) {
  if (!memberSkillIdSet.has(analysis.skill_id)) {
    throw new Error(`Analysis ${analysisId} references skill ${analysis.skill_id} which is not in pack members`)
  }
}
const analyzedSkillIds = new Set([...analyses.values()].map(a => a.skill_id))
for (const mid of memberSkillIdSet) {
  if (!analyzedSkillIds.has(mid)) {
    throw new Error(`Member ${mid} has no cited analysis in pack.evidence.analysis_ids`)
  }
}

// Load relations by exact evidence.relation_ids
const evidenceRelationIds = draft.evidence?.relation_ids ?? []
const relations = loadRelationsByIds(evidenceRelationIds)

// Enforce exact set equality: every evidence relation must resolve
for (const rid of evidenceRelationIds) {
  if (!relations.has(rid)) {
    throw new Error(`Evidence relation ${rid} not found in catalog`)
  }
}

// Wire validateRelationClaimBinding: all chains_with relations must pass — no missing-analysis skip
for (const relId of evidenceRelationIds) {
  const rel = relations.get(relId)
  if (rel && rel.predicate === 'chains_with') {
    const bindingCheck = validateRelationClaimBinding(rel, analyses)
    if (!bindingCheck.ok) {
      const reasons = bindingCheck.errors.map(e => `  - [${e.code}] ${e.reason}`).join('\n')
      throw new Error(`Pack candidate ${draft.pack_id} relation ${relId} claim binding failed:\n${reasons}`)
    }
  }
}

const preflight = preflightPackDagV3(draft, skills, relations, analyses)
if (!preflight.ok) {
  const reasons = preflight.errors.map(e => `  - [${e.code}] ${e.reason}`).join('\n')
  throw new Error(`Pack candidate ${draft.pack_id} failed v3 DAG preflight:\n${reasons}`)
}

const record = {
  schema_version: 3,
  pack_id: draft.pack_id,
  name: draft.name,
  status: 'candidate',
  intent: draft.intent,
  domain: draft.domain ?? 'uncategorized',
  version: draft.version ?? '0.1.0',
  description: draft.description ?? '',
  members: draft.members ?? [],
  excluded: draft.excluded ?? [],
  workflow: draft.workflow,
  compatibility: normalizeCompatibilityV3(draft.compatibility),
  evidence: {
    analysis_ids: draft.evidence?.analysis_ids ?? [],
    relation_ids: draft.evidence?.relation_ids ?? [],
  },
  mitigation: draft.mitigation ?? [],
  artifact_mapping: draft.artifact_mapping ?? [],
  created_by_run: draft.created_by_run ?? 'run_manual',
  updated_at: draft.updated_at ?? nowIso(),
}

writeYaml(packRecordPath(record.pack_id, 'candidate'), record)

// Build canonical proof record from exact evidence inputs — no checked_claim_ids
const proofRecord = buildProofRecord({ pack: record, analyses, relations, skills })
writeTextAtomic(proofPathForPack(record.pack_id), stableStringify(proofRecord))

console.log(JSON.stringify(record, null, 2))
