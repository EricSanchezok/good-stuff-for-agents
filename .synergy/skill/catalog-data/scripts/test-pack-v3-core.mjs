#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  computePackProof,
  validateRelationClaimBinding,
  preflightPackDagV3,
  evaluatePackV3,
  PROOF_RULES_VERSION,
  buildProofRecord,
  recomputeContentDigest,
} from './lib/pack-v3-lib.mjs'

// ============================================================================
// Fixture builders
// ============================================================================

function makeSkill(id, status = 'active', versionId = 'v1') {
  return { canonical_skill_id: id, status, identity: { current_version_id: versionId } }
}

function makeAnalysis(skillId, overrides = {}) {
  return {
    schema_version: 2,
    analysis_id: `anl_${skillId}`,
    skill_id: skillId,
    source_hash: 'sha256:test',
    analysis_version: 1,
    claims: {
      requires: {
        required: [{ claim_id: `clm_req_${skillId}`, content: `Hard requirement for ${skillId}` }],
        optional: [{ claim_id: `clm_opt_${skillId}`, content: `Optional for ${skillId}` }],
      },
      produces: [{ claim_id: `clm_prd_${skillId}`, content: `Produces artifact for ${skillId}` }],
      preconditions: [{ claim_id: `clm_pre_${skillId}`, content: `Precondition for ${skillId}` }],
      refusal: [{ claim_id: `clm_ref_${skillId}`, content: `Refusal for ${skillId}` }],
      failure_warnings: [{ claim_id: `clm_fw_${skillId}`, content: `May fail on large inputs for ${skillId}`, severity: 'medium' }],
      tool_constraints: [{ claim_id: `clm_tc_${skillId}`, content: `Tool constraint for ${skillId}` }],
      alternatives: [],
      judgement: [{ claim_id: `clm_jud_${skillId}`, content: `Judgement for ${skillId}` }],
    },
    confidence: 'high',
    updated_at: '2026-07-27T12:00:00Z',
    created_by_run: 'run_test-fixture',
    ...overrides,
  }
}

function makeRelation(id, overrides = {}) {
  const base = {
    schema_version: 2,
    relation_id: id,
    predicate: 'chains_with',
    subject: 'skl_producer',
    object: 'skl_consumer',
    weight: 0.85,
    evidence: 'Test relation evidence',
    created_at: '2026-07-27T12:00:00Z',
    created_by_run: 'run_test-fixture',
    chains_with: {
      producer_skill: 'skl_producer',
      consumer_skill: 'skl_consumer',
      producer_claim_id: 'clm_prd_skl_producer',
      consumer_claim_id: 'clm_req_skl_consumer',
      direction: 'sequential',
      description: 'Producer feeds consumer',
    },
  }
  return { ...base, ...overrides }
}

function makePackV3(overrides = {}) {
  return {
    schema_version: 3,
    pack_id: 'pack_test-core_20000001',
    name: 'Test Pack',
    status: 'candidate',
    intent: 'Test v3 core chain',
    domain: 'testing',
    version: '1.0.0',
    description: 'A test v3 pack',
    members: [
      { skill_id: 'skl_producer', version_id: 'v1', role: 'entry', inclusion_reason: 'Produces initial artifact' },
      { skill_id: 'skl_consumer', version_id: 'v1', role: 'processor', inclusion_reason: 'Consumes and transforms' },
    ],
    excluded: [],
    workflow: {
      nodes: [
        {
          node_id: 'n1', type: 'task', member_ids: ['skl_producer'],
          entry_contract: { required_claim_ids: ['clm_req_skl_producer'], precondition_claim_ids: ['clm_pre_skl_producer'], refusal_claim_ids: ['clm_ref_skl_producer'], tool_constraint_claim_ids: ['clm_tc_skl_producer'], description: 'User input' },
          output_contract: { produces_claim_ids: ['clm_prd_skl_producer'], description: 'Intermediate' },
          label: 'Produce',
        },
        {
          node_id: 'n2', type: 'task', member_ids: ['skl_consumer'],
          entry_contract: { required_claim_ids: [], precondition_claim_ids: ['clm_pre_skl_consumer'], refusal_claim_ids: ['clm_ref_skl_consumer'], tool_constraint_claim_ids: ['clm_tc_skl_consumer'], description: 'Receives intermediate' },
          output_contract: { produces_claim_ids: ['clm_prd_skl_consumer'], description: 'Final' },
          label: 'Consume',
        },
      ],
      edges: [
        {
          edge_id: 'e1', from_node: 'n1', to_node: 'n2', direction: 'sequential',
          artifact_handoff: {
            relation_id: 'rel_test-chain',
            producer_skill_id: 'skl_producer',
            producer_claim_id: 'clm_prd_skl_producer',
            consumer_skill_id: 'skl_consumer',
            consumer_claim_id: 'clm_req_skl_consumer',
            produced: 'intermediate',
            consumed_as: 'input',
          },
        },
      ],
      entry_roots: ['n1'],
      terminal_sinks: ['n2'],
    },
    compatibility: {
      notes: 'Test compatibility',
      chains: [
        { relation_id: 'rel_test-chain', state: 'used', disposition: 'required' },
      ],
      strengthens: [],
      alternatives: [],
      conflicts: [],
    },
    evidence: { analysis_ids: ['anl_skl_producer', 'anl_skl_consumer'], relation_ids: ['rel_test-chain'] },
    mitigation: [],
    artifact_mapping: [
      { node_id: 'n1', claim_id: 'clm_prd_skl_producer', artifact: 'intermediate.json', description: 'Intermediate' },
      { node_id: 'n2', artifact: 'final.json', description: 'Final output' },
    ],
    created_by_run: 'run_test-fixture',
    updated_at: '2026-07-27T12:00:00Z',
    ...overrides,
  }
}

function makeMetrics(overrides = {}) {
  const base = {
    relevance: { score: 0.85 },
    coverage: { score: 0.80 },
    non_redundancy: { score: 0.90 },
    workflow_coherence: { score: 0.88 },
    compatibility: { score: 0.82 },
    conflict_control: { score: 0.95 },
    evidence_quality: { score: 0.75 },
    actionability: { score: 0.80 },
    freshness: { score: 0.78 },
    source_quality: { score: 0.85 },
  }
  for (const [k, v] of Object.entries(overrides)) {
    base[k] = typeof v === 'number' ? { score: v } : v
  }
  return base
}

// ============================================================================
// 1. Content-addressed proof
// ============================================================================

{
  const pack = makePackV3()
  const analyses = new Map([
    ['anl_skl_producer', makeAnalysis('skl_producer')],
    ['anl_skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])

  const proof = computePackProof({ pack, analyses, relations, skills })
  assert.ok(proof.digest.startsWith('sha256:'), 'proof digest should be sha256')
  assert.strictEqual(proof.proofInput.proof_rules_version, PROOF_RULES_VERSION)
  assert.strictEqual(proof.proofInput.pack.pack_id, pack.pack_id)

  // Proof should be deterministic
  const proof2 = computePackProof({ pack, analyses, relations, skills })
  assert.strictEqual(proof.digest, proof2.digest, 'proof digest must be deterministic')

  // Different edge structure produces different proof
  const pack2 = makePackV3()
  pack2.workflow.edges[0].edge_id = 'e_changed'
  const proof3 = computePackProof({ pack: pack2, analyses, relations, skills })
  assert.notStrictEqual(proof.digest, proof3.digest, 'different packs must have different proofs')
}

// ============================================================================
// 2. Claim-bound relation validation
// ============================================================================

{
  // Valid chains_with
  const rel = makeRelation('rel_valid')
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const result = validateRelationClaimBinding(rel, analyses)
  assert.ok(result.ok, `valid chains_with should pass: ${result.errors.map(e => e.code).join(', ')}`)

  // Non-chains_with predicate should skip
  const rel2 = makeRelation('rel_strengthen', { predicate: 'strengthens', chains_with: undefined })
  const result2 = validateRelationClaimBinding(rel2, analyses)
  assert.ok(result2.ok, 'non-chains_with relations should pass without checks')
}

{
  // Producer claim not found
  const rel = makeRelation('rel_bad_prod')
  rel.chains_with.producer_claim_id = 'nonexistent_claim'
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const result = validateRelationClaimBinding(rel, analyses)
  assert.ok(!result.ok, 'should fail when producer claim not found')
  assert.ok(result.errors.some(e => e.code === 'relation_producer_claim_not_found'))
}

{
  // Consumer claim not found
  const rel = makeRelation('rel_bad_cons')
  rel.chains_with.consumer_claim_id = 'nonexistent_claim'
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const result = validateRelationClaimBinding(rel, analyses)
  assert.ok(!result.ok, 'should fail when consumer claim not found')
  assert.ok(result.errors.some(e => e.code === 'relation_consumer_claim_not_found'))
}

{
  // Consumer claim is optional — should be flagged
  const rel = makeRelation('rel_opt_input')
  rel.chains_with.consumer_claim_id = 'clm_opt_skl_consumer'
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const result = validateRelationClaimBinding(rel, analyses)
  assert.ok(!result.ok, 'should fail when consumer claim is optional')
  assert.ok(result.errors.some(e => e.code === 'relation_required_input_mislabeled_optional'))
}

{
  // Missing analysis — canonical lifecycle must throw, not return soft error
  const rel = makeRelation('rel_missing_analysis')
  rel.chains_with.producer_skill = 'skl_nonexistent'
  const analyses = new Map([
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  assert.throws(
    () => validateRelationClaimBinding(rel, analyses),
    /No analysis found for producer skill/,
    'should throw when producer analysis missing — canonical lifecycle fails closed'
  )
}

{
  // Subject/object mismatch
  const rel = makeRelation('rel_mismatch', {
    subject: 'skl_wrong_a',
    object: 'skl_wrong_b',
  })
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const result = validateRelationClaimBinding(rel, analyses)
  assert.ok(!result.ok, 'should fail when subject/object mismatch chains_with')
  assert.ok(result.errors.some(e => e.code === 'relation_subject_mismatch'))
  assert.ok(result.errors.some(e => e.code === 'relation_object_mismatch'))
}

// ============================================================================
// 3. DAG preflight
// ============================================================================

{
  const pack = makePackV3()
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])

  const result = preflightPackDagV3(pack, skills, relations, analyses)
  assert.ok(result.ok, `valid linear DAG should pass: ${result.errors.map(e => `${e.code}: ${e.reason}`).join('; ')}`)
}

{
  // Blocked member
  const pack = makePackV3()
  pack.members[0].skill_id = 'skl_blocked'
  pack.workflow.nodes[0].member_ids = ['skl_blocked']
  const skills = new Map([
    ['skl_blocked', makeSkill('skl_blocked', 'blocked', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])

  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  assert.ok(!result.ok, 'should reject blocked member')
  assert.ok(result.errors.some(e => e.code === 'member_blocked'))
}

{
  // Stale version
  const pack = makePackV3()
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v99')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  assert.ok(!result.ok, 'should reject stale version')
  assert.ok(result.errors.some(e => e.code === 'member_version_stale'))
}

{
  // Missing member
  const pack = makePackV3()
  pack.members.push({ skill_id: 'skl_nonexistent', version_id: 'v1', role: 'extra', inclusion_reason: 'test' })
  pack.workflow.nodes.push({ node_id: 'nx', type: 'task', member_ids: ['skl_nonexistent'], entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'x' }, output_contract: { produces_claim_ids: [], description: 'x' } })
  pack.workflow.edges.push({ edge_id: 'ex', from_node: 'n1', to_node: 'nx', direction: 'sequential', artifact_handoff: { relation_id: 'rel_test-chain', producer_skill_id: 'skl_producer', producer_claim_id: 'clm_prd_skl_producer', consumer_skill_id: 'skl_nonexistent', consumer_claim_id: 'clm_req_skl_nonexistent', produced: 'x', consumed_as: 'x' } })
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  assert.ok(!result.ok, 'should reject missing member')
  assert.ok(result.errors.some(e => e.code === 'member_missing'))
}

{
  // Duplicate member assignment across nodes
  const pack = makePackV3()
  pack.workflow.nodes[1].member_ids = ['skl_producer', 'skl_consumer']
  pack.workflow.nodes[1].entry_contract = { required_claim_ids: [], precondition_claim_ids: ['clm_pre_skl_producer', 'clm_pre_skl_consumer'], refusal_claim_ids: ['clm_ref_skl_producer', 'clm_ref_skl_consumer'], tool_constraint_claim_ids: ['clm_tc_skl_producer', 'clm_tc_skl_consumer'], description: 'test' }
  pack.workflow.nodes[1].output_contract = { produces_claim_ids: ['clm_prd_skl_producer', 'clm_prd_skl_consumer'], description: 'test' }
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  assert.ok(!result.ok, 'should reject duplicate member assignment')
  assert.ok(result.errors.some(e => e.code === 'node_member_duplicate'))
}

{
  // Unknown entry root
  const pack = makePackV3()
  pack.workflow.entry_roots = ['n_nonexistent']
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  assert.ok(!result.ok, 'should reject unknown entry root')
  assert.ok(result.errors.some(e => e.code === 'dag_entry_root_unknown'))
}

{
  // Unknown terminal sink
  const pack = makePackV3()
  pack.workflow.terminal_sinks = ['n_nonexistent']
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  assert.ok(!result.ok, 'should reject unknown terminal sink')
  assert.ok(result.errors.some(e => e.code === 'dag_terminal_sink_unknown'))
}

{
  // Edge self-loop
  const pack = makePackV3()
  pack.workflow.edges[0].to_node = 'n1'
  pack.workflow.edges[0].artifact_handoff.consumer_skill_id = 'skl_producer'
  pack.workflow.edges[0].artifact_handoff.consumer_claim_id = 'clm_req_skl_producer'
  // n1 already has entry contract covering clm_req_skl_producer, so this won't fail on coverage
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  assert.ok(result.errors.some(e => e.code === 'edge_self_loop'))
}

{
  // DAG with cycle
  const pack = makePackV3()
  pack.workflow.nodes[1].entry_contract = { required_claim_ids: [], precondition_claim_ids: ['clm_pre_skl_consumer'], refusal_claim_ids: ['clm_ref_skl_consumer'], tool_constraint_claim_ids: ['clm_tc_skl_consumer'], description: 'test' }
  pack.workflow.edges.push({
    edge_id: 'e2', from_node: 'n2', to_node: 'n1', direction: 'sequential',
    artifact_handoff: { relation_id: 'rel_test-chain', producer_skill_id: 'skl_consumer', producer_claim_id: 'clm_prd_skl_consumer', consumer_skill_id: 'skl_producer', consumer_claim_id: 'clm_req_skl_producer', produced: 'x', consumed_as: 'x' },
  })
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  assert.ok(result.errors.some(e => e.code === 'dag_cycle_detected'))
}

{
  // Valid fan-in DAG
  const pack = {
    ...makePackV3(),
    members: [
      { skill_id: 'skl_src_a', version_id: 'v1', role: 'source', inclusion_reason: 'test' },
      { skill_id: 'skl_src_b', version_id: 'v1', role: 'source', inclusion_reason: 'test' },
      { skill_id: 'skl_merger', version_id: 'v1', role: 'merger', inclusion_reason: 'test' },
    ],
    workflow: {
      nodes: [
        { node_id: 'na', type: 'task', member_ids: ['skl_src_a'], label: 'A', entry_contract: { required_claim_ids: ['clm_req_skl_src_a'], precondition_claim_ids: ['clm_pre_skl_src_a'], refusal_claim_ids: ['clm_ref_skl_src_a'], tool_constraint_claim_ids: ['clm_tc_skl_src_a'], description: 'a' }, output_contract: { produces_claim_ids: ['clm_prd_skl_src_a'], description: 'a out' } },
        { node_id: 'nb', type: 'task', member_ids: ['skl_src_b'], label: 'B', entry_contract: { required_claim_ids: ['clm_req_skl_src_b'], precondition_claim_ids: ['clm_pre_skl_src_b'], refusal_claim_ids: ['clm_ref_skl_src_b'], tool_constraint_claim_ids: ['clm_tc_skl_src_b'], description: 'b' }, output_contract: { produces_claim_ids: ['clm_prd_skl_src_b'], description: 'b out' } },
        { node_id: 'nm', type: 'fan_in', member_ids: ['skl_merger'], label: 'Merge', entry_contract: { required_claim_ids: [], precondition_claim_ids: ['clm_pre_skl_merger'], refusal_claim_ids: ['clm_ref_skl_merger'], tool_constraint_claim_ids: ['clm_tc_skl_merger'], description: 'merge' }, output_contract: { produces_claim_ids: ['clm_prd_skl_merger'], description: 'merged' } },
      ],
      edges: [
        { edge_id: 'ea', from_node: 'na', to_node: 'nm', direction: 'fan_in', artifact_handoff: { relation_id: 'rel_fan_a', producer_skill_id: 'skl_src_a', producer_claim_id: 'clm_prd_skl_src_a', consumer_skill_id: 'skl_merger', consumer_claim_id: 'clm_req_skl_merger', produced: 'a_out', consumed_as: 'a_in' } },
        { edge_id: 'eb', from_node: 'nb', to_node: 'nm', direction: 'fan_in', artifact_handoff: { relation_id: 'rel_fan_b', producer_skill_id: 'skl_src_b', producer_claim_id: 'clm_prd_skl_src_b', consumer_skill_id: 'skl_merger', consumer_claim_id: 'clm_opt_skl_merger', produced: 'b_out', consumed_as: 'b_in' } },
      ],
      entry_roots: ['na', 'nb'],
      terminal_sinks: ['nm'],
    },
    compatibility: {
      notes: 'test',
      chains: [
        { relation_id: 'rel_fan_a', state: 'used', disposition: 'required' },
        { relation_id: 'rel_fan_b', state: 'used', disposition: 'required' },
      ],
      strengthens: [], alternatives: [], conflicts: [],
    },
    evidence: { analysis_ids: ['anl_skl_src_a', 'anl_skl_src_b', 'anl_skl_merger'], relation_ids: ['rel_fan_a', 'rel_fan_b'] },
  }
  const skills = new Map([
    ['skl_src_a', makeSkill('skl_src_a', 'active', 'v1')],
    ['skl_src_b', makeSkill('skl_src_b', 'active', 'v1')],
    ['skl_merger', makeSkill('skl_merger', 'active', 'v1')],
  ])
  const relations = new Map([
    ['rel_fan_a', makeRelation('rel_fan_a', {
      subject: 'skl_src_a', object: 'skl_merger',
      chains_with: { producer_skill: 'skl_src_a', consumer_skill: 'skl_merger', producer_claim_id: 'clm_prd_skl_src_a', consumer_claim_id: 'clm_req_skl_merger', direction: 'fan_in', description: 'A to merge' },
    })],
    ['rel_fan_b', makeRelation('rel_fan_b', {
      subject: 'skl_src_b', object: 'skl_merger',
      chains_with: { producer_skill: 'skl_src_b', consumer_skill: 'skl_merger', producer_claim_id: 'clm_prd_skl_src_b', consumer_claim_id: 'clm_opt_skl_merger', direction: 'fan_in', description: 'B to merge' },
    })],
  ])
  const analyses = new Map([
    ['skl_src_a', makeAnalysis('skl_src_a')],
    ['skl_src_b', makeAnalysis('skl_src_b')],
    ['skl_merger', makeAnalysis('skl_merger')],
  ])

  const result = preflightPackDagV3(pack, skills, relations, analyses)
  // Should fail because fan_in edge 'eb' has consumer claim in optional
  assert.ok(!result.ok, 'fan-in edge with optional consumer claim should fail')
}

{
  // Unreachable node
  const pack = makePackV3()
  pack.workflow.nodes.push({ node_id: 'n_orphan', type: 'task', member_ids: [], entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'x' }, output_contract: { produces_claim_ids: [], description: 'x' } })
  pack.workflow.entry_roots = ['n1']
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  assert.ok(result.errors.some(e => e.code === 'dag_unreachable_node'))
}

// ============================================================================
// 4. MIN-gate evaluation
// ============================================================================

{
  // Passing evaluation
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    metrics: makeMetrics(),
    blockers: [],
    checked_claim_ids: [
      'clm_prd_skl_producer', 'clm_req_skl_producer', 'clm_req_skl_consumer',
      'clm_prd_skl_consumer', 'clm_pre_skl_producer', 'clm_pre_skl_consumer',
      'clm_ref_skl_producer', 'clm_ref_skl_consumer',
      'clm_tc_skl_producer', 'clm_tc_skl_consumer',
      'clm_jud_skl_producer', 'clm_jud_skl_consumer',
    ],
    warnings: [
      { message: 'Failure warning covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'Failure warning covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  const pack = makePackV3()
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])

  const result = evaluatePackV3({
    evaluation,
    pack,
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations,
    analyses,
  })

  assert.equal(result.passed, true, `should pass MIN-gate: ${result.blockers.map(b => b.code).join(', ')}`)
  assert.equal(result.blockers.length, 0, 'should have no blockers')
  assert.equal(result.decision.level, 'passed')
  assert.equal(result.decision.min_metric, 0.75, 'min_metric should be lowest score')
}

{
  // Same session — should be blocked
  const evaluation = {
    synthesis_session_id: 'same_session_id',
    evaluation_session_id: 'same_session_id',
    metrics: makeMetrics(),
    blockers: [],
    checked_claim_ids: [],
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])

  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations,
    analyses,
  })

  assert.equal(result.passed, false, 'should reject on same session')
  assert.equal(result.decision.level, 'rejected')
  assert.ok(result.blockers.some(b => b.code === 'same_session'))
}

{
  // Metric below 0.50 — reject
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    metrics: makeMetrics({ relevance: 0.45 }),
    blockers: [],
    checked_claim_ids: [],
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])

  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations,
    analyses,
  })

  assert.equal(result.passed, false, 'should reject on metric below 0.50')
  assert.equal(result.decision.level, 'rejected')
}

{
  // Metric in 0.50–0.69 range — needs_work (checked_claim_ids populated to avoid structural blockers)
  const allClaimIds = [
    'clm_prd_skl_producer', 'clm_req_skl_producer', 'clm_req_skl_consumer',
    'clm_prd_skl_consumer', 'clm_pre_skl_producer', 'clm_pre_skl_consumer',
    'clm_ref_skl_producer', 'clm_ref_skl_consumer',
    'clm_tc_skl_producer', 'clm_tc_skl_consumer',
    'clm_jud_skl_producer', 'clm_jud_skl_consumer',
  ]
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    metrics: makeMetrics({ relevance: 0.65 }),
    blockers: [],
    checked_claim_ids: allClaimIds,
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])

  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations,
    analyses,
  })

  assert.equal(result.passed, false, 'needs_work on metric between 0.50 and 0.70')
  assert.equal(result.decision.level, 'needs_work')
  assert.ok(result.decision.findings.some(f => f.kind === 'metric_below_min' && f.metric === 'relevance'))
}

{
  // Missing metric — rejected (invalid)
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    metrics: { relevance: { score: 0.85 } },
    blockers: [],
    checked_claim_ids: [],
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])

  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations,
    analyses,
  })

  assert.equal(result.passed, false, 'should reject on missing metrics (invalid)')
  assert.equal(result.decision.level, 'rejected')
  assert.ok(result.decision.findings.some(f => f.kind === 'metric_missing'))
}

{
  // Stale proof
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    proof_digest: 'sha256:wrong_proof',
    metrics: makeMetrics(),
    blockers: [],
    checked_claim_ids: [],
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])

  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:correct_proof',
    skills: new Map(),
    relations,
    analyses,
  })

  assert.equal(result.passed, false, 'should reject on stale proof')
  assert.equal(result.decision.level, 'rejected')
  assert.ok(result.blockers.some(b => b.code === 'stale_proof'))
}

{
  // Alternative not disposed
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    metrics: makeMetrics(),
    blockers: [],
    checked_claim_ids: [
      'clm_alt_cons',
    ],
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer', {
      claims: {
        ...makeAnalysis('skl_consumer').claims,
        alternatives: [{ claim_id: 'clm_alt_cons', content: 'Alternative is jq' }],
      },
    })],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])

  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations,
    analyses,
  })

  assert.equal(result.passed, false, 'should reject on undisposed alternative')
  assert.equal(result.decision.level, 'rejected')
  assert.ok(result.blockers.some(b => b.code === 'alternative_not_disposed'))
}

{
  // Failure warning not disposed
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    metrics: makeMetrics(),
    blockers: [],
    checked_claim_ids: [],
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
    ],
  }
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])

  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations,
    analyses,
  })

  assert.equal(result.passed, false, 'should reject on undisposed failure warning')
  assert.equal(result.decision.level, 'rejected')
  assert.ok(result.blockers.some(b => b.code === 'failure_warning_not_disposed'))
}

{
  // Required input mislabeled optional (via evaluatePackV3)
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    metrics: makeMetrics(),
    blockers: [],
    checked_claim_ids: [],
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const rel = makeRelation('rel_opt_inp')
  rel.chains_with.consumer_claim_id = 'clm_opt_skl_consumer'
  const relations = new Map([['rel_opt_inp', rel]])

  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations,
    analyses,
  })

  assert.equal(result.passed, false, 'should reject on required input mislabeled optional')
  assert.equal(result.decision.level, 'rejected')
  assert.ok(result.blockers.some(b => b.code === 'required_input_mislabeled_optional'))
}

{
  // Externally provided blockers force rejection
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    metrics: makeMetrics(),
    blockers: [
      { code: 'claim_mismatch', description: 'Producer claim does not match consumer need' },
    ],
    checked_claim_ids: ['clm_prd_skl_producer', 'clm_req_skl_producer', 'clm_req_skl_consumer', 'clm_prd_skl_consumer', 'clm_pre_skl_producer', 'clm_pre_skl_consumer', 'clm_ref_skl_producer', 'clm_ref_skl_consumer', 'clm_tc_skl_producer', 'clm_tc_skl_consumer', 'clm_jud_skl_producer', 'clm_jud_skl_consumer'],
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])

  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations,
    analyses,
  })

  assert.equal(result.passed, false, 'should reject on external blocker')
  assert.equal(result.decision.level, 'rejected')
  assert.ok(result.blockers.some(b => b.code === 'claim_mismatch'))
}

// ============================================================================
// 5. Missing proof
// ============================================================================

{
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    metrics: makeMetrics(),
    blockers: [],
    checked_claim_ids: [],
    warnings: [],
  }
  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: null,
    skills: new Map(),
    relations: new Map(),
    analyses: new Map(),
  })
  assert.equal(result.passed, false, 'should reject on missing proof')
  assert.equal(result.decision.level, 'rejected')
  assert.ok(result.blockers.some(b => b.code === 'missing_proof'))
}

// ============================================================================
// 6. Missing session IDs
// ============================================================================

{
  const evaluation = {
    metrics: makeMetrics(),
    blockers: [],
    checked_claim_ids: [],
    warnings: [],
  }
  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations: new Map(),
    analyses: new Map(),
  })
  assert.equal(result.passed, false, 'should reject on missing session IDs')
  assert.equal(result.decision.level, 'rejected')
  assert.ok(result.blockers.some(b => b.code === 'missing_session_ids'))
}

// ============================================================================
// 7. Proof determinism across edge cases
// ============================================================================

{
  // sort-order invariance
  const pack = makePackV3()
  pack.workflow.entry_roots = ['n2', 'n1']
  const pack2 = makePackV3()
  pack2.workflow.entry_roots = ['n1', 'n2']

  const analyses = new Map([
    ['anl_skl_producer', makeAnalysis('skl_producer')],
    ['anl_skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])

  const p1 = computePackProof({ pack, analyses, relations, skills })
  const p2 = computePackProof({ pack: pack2, analyses, relations, skills })

  assert.strictEqual(p1.digest, p2.digest, 'proof should be order-invariant for sorted sets')
}

// ============================================================================
// 8. Regression: fan-in edge without exact handoff fails
// ============================================================================

{
  const pack = makePackV3()
  pack.workflow.nodes.push({ node_id: 'n3', type: 'fan_in', member_ids: [], entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'merge' }, output_contract: { produces_claim_ids: [], description: 'out' } })
  pack.workflow.edges.push({
    edge_id: 'e_fan_bad', from_node: 'n1', to_node: 'n3', direction: 'fan_in',
    artifact_handoff: {
      relation_id: 'rel_test-chain',
      producer_skill_id: 'skl_producer',
      producer_claim_id: 'clm_prd_skl_producer',
      consumer_skill_id: 'skl_consumer',
      consumer_claim_id: 'clm_req_skl_consumer',
      produced: 'x', consumed_as: 'x',
    },
  })
  pack.workflow.entry_roots = ['n1']
  pack.workflow.terminal_sinks = ['n3']
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const result = preflightPackDagV3(pack, skills, relations, analyses)
  // fan_in edge direction mismatch (sequential relation for fan_in edge)
  assert.ok(result.errors.some(e => e.code === 'edge_direction_mismatch'), 'fan-in edge with sequential relation should fail direction mismatch')
}

// ============================================================================
// 9. Regression: wrong topology fails
// ============================================================================

{
  const pack = makePackV3()
  // Wrong entry root: n2 is not an entry
  pack.workflow.entry_roots = ['n2']
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  // n1 becomes unreachable from entry n2
  assert.ok(result.errors.some(e => e.code === 'dag_unreachable_node'), 'wrong entry root should make node unreachable')
}

{
  // Node cannot reach terminal
  const pack = makePackV3()
  pack.workflow.nodes.push({ node_id: 'n3', type: 'task', member_ids: [], entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'x' }, output_contract: { produces_claim_ids: [], description: 'x' } })
  // n2->n3 but n3 is not a terminal sink
  pack.workflow.edges = [
    { edge_id: 'e1', from_node: 'n1', to_node: 'n2', direction: 'sequential', artifact_handoff: { relation_id: 'rel_test-chain', producer_skill_id: 'skl_producer', producer_claim_id: 'clm_prd_skl_producer', consumer_skill_id: 'skl_consumer', consumer_claim_id: 'clm_req_skl_consumer', produced: 'x', consumed_as: 'x' } },
    { edge_id: 'e2', from_node: 'n2', to_node: 'n3', direction: 'sequential', artifact_handoff: { relation_id: 'rel_test-chain', producer_skill_id: 'skl_producer', producer_claim_id: 'clm_prd_skl_producer', consumer_skill_id: 'skl_consumer', consumer_claim_id: 'clm_req_skl_consumer', produced: 'x', consumed_as: 'x' } },
  ]
  pack.workflow.terminal_sinks = ['n2']
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), new Map())
  assert.ok(result.errors.some(e => e.code === 'dag_node_cannot_reach_terminal'), 'node that cannot reach terminal should fail')
}

// ============================================================================
// 10. Regression: entry/output/constraint coverage fails
// ============================================================================

{
  const pack = makePackV3()
  // Remove clm_prd_skl_producer from output_contract (coverage missing)
  pack.workflow.nodes[0].output_contract = { produces_claim_ids: [], description: 'Intermediate' }
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), analyses)
  assert.ok(result.errors.some(e => e.code === 'node_output_coverage_missing'), 'missing output coverage should fail')
}

{
  const pack = makePackV3()
  // Missing precondition coverage
  pack.workflow.nodes[0].entry_contract.precondition_claim_ids = []
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const result = preflightPackDagV3(pack, skills, new Map(), analyses)
  assert.ok(result.errors.some(e => e.code === 'node_precondition_coverage_missing'), 'missing precondition coverage should fail')
}

// ============================================================================
// 11. Regression: undisposed alternative/conflict fails
// ============================================================================

{
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    metrics: makeMetrics(),
    blockers: [],
    checked_claim_ids: ['clm_alt_cons'],
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  // Analysis with alternatives but no alternatives relation in compatibility
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer', {
      claims: {
        ...makeAnalysis('skl_consumer').claims,
        alternatives: [{ claim_id: 'clm_alt_cons', content: 'Alternative' }],
      },
    })],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])
  const result = evaluatePackV3({
    evaluation,
    pack: makePackV3(),
    proofDigest: 'sha256:test_proof',
    skills: new Map(),
    relations,
    analyses,
  })
  assert.ok(result.blockers.some(b => b.code === 'alternative_not_disposed'), 'undisposed alternative should be a blocker')
}

// ============================================================================
// 12. Regression: stale analysis/relation invalidates proof at evaluation
// ============================================================================

{
  const evaluation = {
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    proof_digest: 'sha256:stale_digest_12345',
    metrics: makeMetrics(),
    blockers: [],
    checked_claim_ids: [],
    warnings: [
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_producer' },
      { message: 'FW covered', disposition: 'acknowledged', claim_id: 'clm_fw_skl_consumer' },
    ],
  }
  const pack = makePackV3()
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const relations = new Map([['rel_test-chain', makeRelation('rel_test-chain')]])
  const result = evaluatePackV3({
    evaluation,
    pack,
    proofDigest: 'sha256:correct_proof_xyz',
    skills: new Map(),
    relations,
    analyses,
  })
  assert.equal(result.passed, false, 'stale proof should reject')
  assert.ok(result.blockers.some(b => b.code === 'stale_proof'))
}

// ============================================================================
// 13. Regression: optional consumer in edge fails
// ============================================================================

{
  const pack = makePackV3()
  // Edge uses optional claim as consumer — also update relation to match
  const rel = makeRelation('rel_test-chain', {
    chains_with: {
      ...makeRelation('rel_test-chain').chains_with,
      consumer_claim_id: 'clm_opt_skl_consumer',
    },
  })
  pack.workflow.edges[0].artifact_handoff.consumer_claim_id = 'clm_opt_skl_consumer'
  pack.workflow.edges[0].artifact_handoff.relation_id = 'rel_test-chain'
  const skills = new Map([
    ['skl_producer', makeSkill('skl_producer', 'active', 'v1')],
    ['skl_consumer', makeSkill('skl_consumer', 'active', 'v1')],
  ])
  const relations = new Map([['rel_test-chain', rel]])
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const result = preflightPackDagV3(pack, skills, relations, analyses)
  assert.ok(result.errors.some(e => e.code === 'relation_required_input_mislabeled_optional'), 'optional consumer claim in edge should fail')
}

// ============================================================================
// 14. Regression: edge direction mismatch against relation
// ============================================================================

{
  const pack = makePackV3()
  // Edge is sequential but relation says fan_in
  const rel = makeRelation('rel_test-chain', {
    chains_with: {
      ...makeRelation('rel_test-chain').chains_with,
      direction: 'fan_in',
    },
  })
  const relations = new Map([['rel_test-chain', rel]])
  const analyses = new Map([
    ['skl_producer', makeAnalysis('skl_producer')],
    ['skl_consumer', makeAnalysis('skl_consumer')],
  ])
  const result = preflightPackDagV3(pack, new Map(), relations, analyses)
  assert.ok(result.errors.some(e => e.code === 'edge_direction_mismatch'), 'direction mismatch should fail')
}

console.log('pack v3 core tests passed')
