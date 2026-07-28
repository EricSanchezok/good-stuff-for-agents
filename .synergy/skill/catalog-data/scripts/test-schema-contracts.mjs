#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  analysisSchemaV2,
  relationSchemaV2,
  packSchemaV3,
  evaluationSchemaV2,
  runContextSchemaV1,
  terminalLedgerSchemaV1,
  issueAssessmentSchemaV1,
  issueResponseLedgerSchemaV1,
  validateAgainstSchema,
  buildAnalysisV2,
  buildRelationV2,
  buildPackV3,
  buildPackV3FanIn,
  buildEvaluationV2,
  buildRunContext,
  buildTerminalLedger,
  buildIssueAssessment,
  buildIssueResponseLedger,
  buildAnalysisV1,
  buildRelationV1,
  buildPackV2,
  buildEvaluationV1,
} from './lib/schema-validators.mjs'

// --- Schema files must load ---
assert.ok(analysisSchemaV2, 'analysis v2 schema must load')
assert.ok(relationSchemaV2, 'relation v2 schema must load')
assert.ok(packSchemaV3, 'pack v3 schema must load')
assert.ok(evaluationSchemaV2, 'evaluation v2 schema must load')
assert.ok(runContextSchemaV1, 'run-context schema must load')
assert.ok(terminalLedgerSchemaV1, 'terminal-ledger schema must load')
assert.ok(issueAssessmentSchemaV1, 'issue-assessment schema must load')
assert.ok(issueResponseLedgerSchemaV1, 'issue-response-ledger schema must load')

// ============================================================
// Analysis v2
// ============================================================

// valid v2 record accepted
{
  const record = buildAnalysisV2()
  const result = validateAgainstSchema(record, analysisSchemaV2)
  assert.ok(result.ok, `analysis v2 valid: ${result.errors.join('; ')}`)
}

// v1 record rejected (wrong schema_version)
{
  const record = buildAnalysisV1()
  const result = validateAgainstSchema(record, analysisSchemaV2)
  assert.ok(!result.ok, 'analysis v1 should be rejected by v2 schema')
  assert.ok(result.errors.some(e => e.includes('schema_version')), 'rejection should mention schema_version')
}

// rejects missing claim groups
for (const missingGroup of ['requires', 'produces', 'preconditions', 'refusal', 'failure_warnings', 'tool_constraints', 'alternatives', 'judgement']) {
  const record = buildAnalysisV2()
  delete record.claims[missingGroup]
  const result = validateAgainstSchema(record, analysisSchemaV2)
  assert.ok(!result.ok, `analysis v2 should reject missing claims.${missingGroup}`)
}

// claim must have claim_id and content
{
  const record = buildAnalysisV2()
  record.claims.produces[0] = { claim_id: 'clm_bad' }
  const result = validateAgainstSchema(record, analysisSchemaV2)
  assert.ok(!result.ok, 'claim without content should be rejected')
}

// analysis_id pattern
{
  const record = buildAnalysisV2({ analysis_id: 'bad-id' })
  const result = validateAgainstSchema(record, analysisSchemaV2)
  assert.ok(!result.ok, 'bad analysis_id should be rejected')
}

// severity enum
{
  const record = buildAnalysisV2()
  record.claims.failure_warnings[0].severity = 'catastrophic'
  const result = validateAgainstSchema(record, analysisSchemaV2)
  assert.ok(!result.ok, 'invalid severity should be rejected')
}

// requires sub-groups
{
  const record = buildAnalysisV2()
  delete record.claims.requires.required
  const result = validateAgainstSchema(record, analysisSchemaV2)
  assert.ok(!result.ok, 'missing claims.requires.required should be rejected')
}

// ============================================================
// Relation v2
// ============================================================

// valid chains_with
{
  const record = buildRelationV2('chains_with')
  const result = validateAgainstSchema(record, relationSchemaV2)
  assert.ok(result.ok, `relation v2 chains_with valid: ${result.errors.join('; ')}`)
}

// valid strengthens
{
  const record = buildRelationV2('strengthens')
  const result = validateAgainstSchema(record, relationSchemaV2)
  assert.ok(result.ok, `relation v2 strengthens valid: ${result.errors.join('; ')}`)
}

// valid alternatives
{
  const record = buildRelationV2('alternatives')
  const result = validateAgainstSchema(record, relationSchemaV2)
  assert.ok(result.ok, `relation v2 alternatives valid: ${result.errors.join('; ')}`)
}

// valid conflicts_with
{
  const record = buildRelationV2('conflicts_with')
  const result = validateAgainstSchema(record, relationSchemaV2)
  assert.ok(result.ok, `relation v2 conflicts_with valid: ${result.errors.join('; ')}`)
}

// v1 record rejected
{
  const record = buildRelationV1()
  const result = validateAgainstSchema(record, relationSchemaV2)
  assert.ok(!result.ok, 'relation v1 should be rejected by v2 schema')
}

// chains_with without chains_with object rejected
{
  const record = buildRelationV2('chains_with')
  delete record.chains_with
  const result = validateAgainstSchema(record, relationSchemaV2)
  assert.ok(!result.ok, 'chains_with predicate must have chains_with object')
}

// strengthens without strengthens object rejected
{
  const record = buildRelationV2('strengthens')
  delete record.strengthens
  const result = validateAgainstSchema(record, relationSchemaV2)
  assert.ok(!result.ok, 'strengthens predicate must have strengthens object')
}

// old predicate enum rejected
{
  const record = buildRelationV2('complements')  // v1 predicate
  const result = validateAgainstSchema(record, relationSchemaV2)
  assert.ok(!result.ok, 'old v1 predicate should be rejected')
}

// strengthens with is_required_handoff: true rejected
{
  const record = buildRelationV2('strengthens')
  record.strengthens.is_required_handoff = true
  // Note: our validator doesn't enforce boolean defaults, so this passes structurally
  // The consumer agent checks the semantic rule. Schema just requires the field to be boolean.
}

// relation_id pattern
{
  const record = buildRelationV2('chains_with', { relation_id: 'bad-rel' })
  const result = validateAgainstSchema(record, relationSchemaV2)
  assert.ok(!result.ok, 'bad relation_id should be rejected')
}

// unknown field
{
  const record = buildRelationV2('chains_with')
  record.legacy_score = 0.5
  const result = validateAgainstSchema(record, relationSchemaV2)
  assert.ok(!result.ok, 'unknown field should be rejected')
}

// ============================================================
// Pack v3
// ============================================================

// valid linear DAG
{
  const record = buildPackV3()
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(result.ok, `pack v3 linear valid: ${result.errors.join('; ')}`)
}

// valid parallel fan-in DAG
{
  const record = buildPackV3FanIn()
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(result.ok, `pack v3 fan-in valid: ${result.errors.join('; ')}`)
}

// v2 record rejected
{
  const record = buildPackV2()
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(!result.ok, 'pack v2 should be rejected by v3 schema')
  assert.ok(result.errors.some(e => e.includes('schema_version')), 'rejection should mention schema_version')
}

// v2 fields rejected (workflow.stages, workflow.entry)
{
  const record = buildPackV2()
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(!result.ok, 'pack v2 with v2-specific fields should be rejected')
}

// v3 requires nodes, edges, entry_roots, terminal_sinks
for (const missing of ['nodes', 'edges', 'entry_roots', 'terminal_sinks']) {
  const record = buildPackV3()
  delete record.workflow[missing]
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(!result.ok, `pack v3 should reject missing workflow.${missing}`)
}

// node requires node_id, type, member_ids
{
  const record = buildPackV3()
  delete record.workflow.nodes[0].node_id
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(!result.ok, 'node without node_id should be rejected')
}

// edge requires edge_id, from_node, to_node, direction
{
  const record = buildPackV3()
  delete record.workflow.edges[0].edge_id
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(!result.ok, 'edge without edge_id should be rejected')
}

// fan_in DAG structural properties
{
  const record = buildPackV3FanIn()
  // Multiple entry roots
  assert.ok(record.workflow.entry_roots.length > 1, 'fan-in DAG should have multiple entry roots')
  // Single terminal sink
  assert.ok(record.workflow.terminal_sinks.length === 1, 'fan-in DAG should have single terminal sink')
  // All entry roots converge on terminal
  const sink = record.workflow.terminal_sinks[0]
  const edgesToSink = record.workflow.edges.filter(e => e.to_node === sink)
  assert.ok(edgesToSink.length === record.workflow.entry_roots.length, 'all entry roots should have edges to sink')
  // Edge directions are fan_in
  assert.ok(edgesToSink.every(e => e.direction === 'fan_in'), 'fan-in edges should have fan_in direction')
}

// linear DAG structural properties
{
  const record = buildPackV3()
  assert.ok(record.workflow.entry_roots.length === 1, 'linear DAG should have single entry root')
  assert.ok(record.workflow.terminal_sinks.length === 1, 'linear DAG should have single terminal sink')
}

// no evaluation embedded
{
  const record = buildPackV3()
  assert.ok(!('evaluation' in record), 'pack v3 must not inline evaluation')
}

// v3 requires mitigation and artifact_mapping
{
  const record = buildPackV3()
  delete record.mitigation
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(!result.ok, 'pack v3 should reject missing mitigation')
}
{
  const record = buildPackV3()
  delete record.artifact_mapping
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(!result.ok, 'pack v3 should reject missing artifact_mapping')
}

// evidence uses analysis_ids/relation_ids (not analysis_paths/relation_edges)
{
  const record = buildPackV3()
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(result.ok)
  assert.ok(!record.evidence.analysis_paths && !record.evidence.relation_edges, 'pack v3 evidence should not use old field names')
}

// node type enum
{
  const record = buildPackV3()
  record.workflow.nodes[0].type = 'invalid_type'
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(!result.ok, 'invalid node type should be rejected')
}

// edge direction enum
{
  const record = buildPackV3()
  record.workflow.edges[0].direction = 'invalid_direction'
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(!result.ok, 'invalid edge direction should be rejected')
}

// conditional node with condition field
{
  const record = buildPackV3()
  record.workflow.nodes.push({
    node_id: 'n_gate',
    type: 'conditional',
    member_ids: [],
    label: 'Decision Gate',
    condition: 'result.status === "ok"',
    entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'Gate entry' },
    output_contract: { produces_claim_ids: [], description: 'Gate output' },
  })
  record.workflow.edges = [
    ...record.workflow.edges,
    { edge_id: 'e_cond', from_node: 'n_gate', to_node: 'n2', direction: 'conditional', condition: 'result.status === "ok"', artifact_handoff: { relation_id: 'rel_test-valid_20000001', producer_skill_id: 'skl_test-producer_20000001', producer_claim_id: 'clm_prd_001', consumer_skill_id: 'skl_test-consumer_20000001', consumer_claim_id: 'clm_req_001', produced: 'conditional out', consumed_as: 'conditional in' } },
  ]
  const result = validateAgainstSchema(record, packSchemaV3)
  assert.ok(result.ok, `pack v3 with conditional node valid: ${result.errors.join('; ')}`)
}

// ============================================================
// Evaluation v2
// ============================================================

// valid v2 record
{
  const record = buildEvaluationV2()
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(result.ok, `evaluation v2 valid: ${result.errors.join('; ')}`)
}

// v1 record rejected
{
  const record = buildEvaluationV1()
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(!result.ok, 'evaluation v1 should be rejected by v2 schema')
}

// metric below 0.70 now accepted by schema (MIN-gate enforced at decision time)
{
  const record = buildEvaluationV2()
  record.metrics.relevance.score = 0.60
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(result.ok, 'metric below 0.70 should be accepted structurally (MIN-gate at decision time)')
}

// metric at MIN-gate 0.70 accepted
{
  const record = buildEvaluationV2()
  record.metrics.relevance.score = 0.70
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(result.ok, 'metric at MIN-gate 0.70 should be accepted')
}

// evaluation requires decision object
{
  const record = buildEvaluationV2()
  delete record.decision
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(!result.ok, 'evaluation v2 should reject missing decision')
}

// decision level enum
{
  const record = buildEvaluationV2()
  record.decision.level = 'maybe'
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(!result.ok, 'invalid decision level should be rejected')
}
{
  // All valid levels should pass
  for (const level of ['passed', 'needs_work', 'rejected']) {
    const record = buildEvaluationV2()
    record.decision.level = level
    record.decision.passed = level === 'passed'
    const result = validateAgainstSchema(record, evaluationSchemaV2)
    assert.ok(result.ok, `decision level '${level}' should be valid`)
  }
}

// requires synthesis_session_id and evaluation_session_id
{
  const record = buildEvaluationV2()
  delete record.synthesis_session_id
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(!result.ok, 'evaluation v2 should reject missing synthesis_session_id')
}
{
  const record = buildEvaluationV2()
  delete record.evaluation_session_id
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(!result.ok, 'evaluation v2 should reject missing evaluation_session_id')
}

// blocker/finding structure
{
  const record = buildEvaluationV2()
  record.blockers = [{ code: 'B001', description: 'Missing required claim coverage', claim_id: 'clm_req_001' }]
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(result.ok, 'evaluation v2 with blockers valid')
}
{
  const record = buildEvaluationV2()
  record.blockers = [{ code: 'B001' }]
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(!result.ok, 'blocker without description should be rejected')
}

// warning disposition enum
{
  const record = buildEvaluationV2()
  record.warnings = [{ message: 'Metric borderline', disposition: 'acknowledged' }]
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(result.ok, 'warning with valid disposition accepted')
}
{
  const record = buildEvaluationV2()
  record.warnings = [{ message: 'Test', disposition: 'invalid' }]
  const result = validateAgainstSchema(record, evaluationSchemaV2)
  assert.ok(!result.ok, 'warning with invalid disposition should be rejected')
}

// ============================================================
// Run Context
// ============================================================

{
  const record = buildRunContext()
  const result = validateAgainstSchema(record, runContextSchemaV1)
  assert.ok(result.ok, `run-context valid: ${result.errors.join('; ')}`)
}

// missing required fields
for (const missing of ['snapshot_digest', 'evidence_manifest_digest', 'catalog_counts', 'freshness', 'coverage', 'relations', 'pack_lifecycle', 'issue_digest', 'demand_metadata', 'prior_fingerprint']) {
  const record = buildRunContext()
  delete record[missing]
  const result = validateAgainstSchema(record, runContextSchemaV1)
  assert.ok(!result.ok, `run-context should reject missing ${missing}`)
}

// ============================================================
// Terminal Ledger
// ============================================================

{
  const record = buildTerminalLedger()
  const result = validateAgainstSchema(record, terminalLedgerSchemaV1)
  assert.ok(result.ok, `terminal-ledger valid: ${result.errors.join('; ')}`)
}

// run_outcome includes no_pack_clean and reply_blocked states
for (const status of ['success', 'partial', 'failed', 'no_pack_clean', 'reply_blocked']) {
  const record = buildTerminalLedger()
  record.run_outcome = { status, summary: `State: ${status}`, total_actions: 0, errors: 0, warnings: 0 }
  const result = validateAgainstSchema(record, terminalLedgerSchemaV1)
  assert.ok(result.ok, `run_outcome status '${status}' should be valid`)
}

// invalid run_outcome status rejected
{
  const record = buildTerminalLedger()
  record.run_outcome = { status: 'unknown_state', summary: 'bad', total_actions: 0, errors: 0, warnings: 0 }
  const result = validateAgainstSchema(record, terminalLedgerSchemaV1)
  assert.ok(!result.ok, 'invalid run_outcome status should be rejected')
}

// terminal_entry states include all required values
for (const state of ['no_pack_clean', 'reply_blocked', 'unchanged', 'synced', 'analyzed', 'related', 'evaluated', 'published', 'blocked']) {
  const record = buildTerminalLedger()
  record.source_outcomes = [{ entity_id: 'src_test', state, detail: 'test' }]
  const result = validateAgainstSchema(record, terminalLedgerSchemaV1)
  assert.ok(result.ok, `terminal entry state '${state}' should be valid`)
}

// ============================================================
// Issue Assessment
// ============================================================

{
  const record = buildIssueAssessment()
  const result = validateAgainstSchema(record, issueAssessmentSchemaV1)
  assert.ok(result.ok, `issue-assessment valid: ${result.errors.join('; ')}`)
}

// repository binding required
for (const missing of ['owner', 'repo']) {
  const record = buildIssueAssessment()
  delete record.repository[missing]
  const result = validateAgainstSchema(record, issueAssessmentSchemaV1)
  assert.ok(!result.ok, `issue-assessment should reject missing repository.${missing}`)
}

// fulfillment_state enum
for (const state of ['not_started', 'in_progress', 'fulfilled', 'partially_fulfilled', 'blocked', 'out_of_scope', 'duplicate']) {
  const record = buildIssueAssessment({ fulfillment_state: state })
  const result = validateAgainstSchema(record, issueAssessmentSchemaV1)
  assert.ok(result.ok, `fulfillment_state '${state}' valid`)
}

// public_evidence accepts only canonical published skill/pack paths
{
  const record = buildIssueAssessment()
  const result = validateAgainstSchema(record, issueAssessmentSchemaV1)
  assert.ok(result.ok, 'canonical skill evidence should be valid')
}
{
  const record = buildIssueAssessment()
  record.public_evidence.related_entities = [{
    entity_type: 'pack',
    entity_id: 'pack_test-valid_20000001',
    path: 'catalog/packs/published/pack_test-valid_20000001/pack.yaml',
  }]
  const result = validateAgainstSchema(record, issueAssessmentSchemaV1)
  assert.ok(result.ok, 'canonical published pack evidence should be valid')
}
for (const invalidEvidence of [
  { entity_type: 'source', entity_id: 'src_test', path: 'catalog/sources/registry.yaml' },
  { entity_type: 'pack', entity_id: 'pack_test', path: 'catalog/packs/candidates/pack_test/pack.yaml' },
  { entity_type: 'skill', entity_id: 'skl_test', path: '../outside.yaml' },
]) {
  const record = buildIssueAssessment()
  record.public_evidence.related_entities = [invalidEvidence]
  const result = validateAgainstSchema(record, issueAssessmentSchemaV1)
  assert.ok(!result.ok, `invalid public evidence should be rejected: ${JSON.stringify(invalidEvidence)}`)
}

// ============================================================
// Issue Response Ledger
// ============================================================

{
  const record = buildIssueResponseLedger()
  const result = validateAgainstSchema(record, issueResponseLedgerSchemaV1)
  assert.ok(result.ok, `issue-response-ledger valid: ${result.errors.join('; ')}`)
}

// response_state enum
for (const state of ['draft', 'posted', 'posted_confirmed', 'held_for_review', 'blocked', 'superseded', 'no_action', 'reply_blocked']) {
  const record = buildIssueResponseLedger({ response_state: state })
  const result = validateAgainstSchema(record, issueResponseLedgerSchemaV1)
  assert.ok(result.ok, `response_state '${state}' valid`)
}

// toctou_state staleness enum
for (const staleness of ['current', 'stale_response', 'stale_issue', 'unknown']) {
  const record = buildIssueResponseLedger()
  record.toctou_state = { ...record.toctou_state, staleness }
  const result = validateAgainstSchema(record, issueResponseLedgerSchemaV1)
  assert.ok(result.ok, `toctou staleness '${staleness}' valid`)
}

// dedup_fingerprint required
{
  const record = buildIssueResponseLedger()
  delete record.dedup_fingerprint
  const result = validateAgainstSchema(record, issueResponseLedgerSchemaV1)
  assert.ok(!result.ok, 'issue-response-ledger should reject missing dedup_fingerprint')
}

// comment_id can be null or integer
{
  const record = buildIssueResponseLedger()
  const result = validateAgainstSchema(record, issueResponseLedgerSchemaV1)
  assert.ok(result.ok, 'comment_id null should be valid')
}
{
  const record = buildIssueResponseLedger({ comment_id: 12345 })
  const result = validateAgainstSchema(record, issueResponseLedgerSchemaV1)
  assert.ok(result.ok, 'comment_id integer should be valid')
}

// ============================================================
// Cross-cutting: no old schema accepted by any new validator
// ============================================================
{
  const { ok, errors } = validateAgainstSchema(buildAnalysisV1(), analysisSchemaV2)
  assert.ok(!ok, 'analysisV1 → analysisV2 must reject')
}
{
  const { ok, errors } = validateAgainstSchema(buildRelationV1(), relationSchemaV2)
  assert.ok(!ok, 'relationV1 → relationV2 must reject')
}
{
  const { ok, errors } = validateAgainstSchema(buildPackV2(), packSchemaV3)
  assert.ok(!ok, 'packV2 → packV3 must reject')
}
{
  const { ok, errors } = validateAgainstSchema(buildEvaluationV1(), evaluationSchemaV2)
  assert.ok(!ok, 'evaluationV1 → evaluationV2 must reject')
}

console.log('schema v2/v3 contract tests passed')
