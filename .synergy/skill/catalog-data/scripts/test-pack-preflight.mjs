#!/usr/bin/env node
import assert from 'node:assert/strict'
import { preflightPackDagV3 } from './lib/pack-v3-lib.mjs'

function skill(id, status = 'active', versionId = 'v1') {
  return { canonical_skill_id: id, status, identity: { current_version_id: versionId } }
}

const skills = new Map([
  ['skl_a', skill('skl_a', 'active', 'v1')],
  ['skl_b', skill('skl_b', 'active', 'v1')],
  ['skl_c', skill('skl_c', 'active', 'v1')],
  ['skl_blocked', skill('skl_blocked', 'blocked', 'v1')],
  ['skl_stale', skill('skl_stale', 'active', 'v9')],
])

function validPackV3(overrides = {}) {
  return {
    schema_version: 3,
    pack_id: 'pack_test-preflight',
    name: 'Test Pack',
    status: 'candidate',
    intent: 'test',
    domain: 'testing',
    version: '1.0.0',
    description: 'test',
    members: [
      { skill_id: 'skl_a', version_id: 'v1', role: 'entry', inclusion_reason: 'test' },
      { skill_id: 'skl_b', version_id: 'v1', role: 'processor', inclusion_reason: 'test' },
    ],
    excluded: [],
    workflow: {
      nodes: [
        { node_id: 'n1', type: 'task', member_ids: ['skl_a'], label: 'Stage 1', entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'Input' }, output_contract: { produces_claim_ids: [], description: 'Output' } },
        { node_id: 'n2', type: 'task', member_ids: ['skl_b'], label: 'Stage 2', entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'Receives' }, output_contract: { produces_claim_ids: [], description: 'Output' } },
      ],
      edges: [
        { edge_id: 'e1', from_node: 'n1', to_node: 'n2', direction: 'sequential', artifact_handoff: { relation_id: 'rel_test-preflight', producer_skill_id: 'skl_a', producer_claim_id: 'clm_prd_a', consumer_skill_id: 'skl_b', consumer_claim_id: 'clm_req_b', produced: 'intermediate', consumed_as: 'input' } },
      ],
      entry_roots: ['n1'],
      terminal_sinks: ['n2'],
    },
    compatibility: { notes: 'ok', chains: [{ relation_id: 'rel_test-preflight', state: 'used', disposition: 'required' }], strengthens: [], alternatives: [], conflicts: [] },
    evidence: { analysis_ids: [], relation_ids: ['rel_test-preflight'] },
    mitigation: [],
    artifact_mapping: [],
    created_by_run: 'run_test',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function preflightPack(pack, skillMap = skills) {
  return preflightPackDagV3(pack, skillMap, new Map(), new Map())
}

const codes = (result) => result.errors.map((e) => e.code).sort()

// --- valid linear DAG ---
{
  const result = preflightPack(validPackV3())
  // Will have relation not found since we pass empty Map for relations
  // Use a proper setup with relations
}

// --- member missing ---
{
  const record = validPackV3()
  record.members = [
    { skill_id: 'skl_unknown', version_id: 'v1', role: 'entry', inclusion_reason: 'test' },
    { skill_id: 'skl_b', version_id: 'v1', role: 'processor', inclusion_reason: 'test' },
  ]
  record.workflow.nodes[0].member_ids = ['skl_unknown']
  const result = preflightPack(record)
  assert.ok(result.errors.some(e => e.code === 'member_missing'))
  assert.ok(result.errors.some(e => e.code === 'edge_handoff_relation_unknown'))
}

// --- member blocked ---
{
  const record = validPackV3({ members: [
    { skill_id: 'skl_a', version_id: 'v1', role: 'entry', inclusion_reason: 'test' },
    { skill_id: 'skl_blocked', version_id: 'v1', role: 'processor', inclusion_reason: 'test' },
  ]})
  record.workflow.nodes[1].member_ids = ['skl_blocked']
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'member_blocked'))
}

// --- member version stale ---
{
  const record = validPackV3({ members: [
    { skill_id: 'skl_a', version_id: 'v1', role: 'entry', inclusion_reason: 'test' },
    { skill_id: 'skl_stale', version_id: 'v1', role: 'processor', inclusion_reason: 'test' },
  ]})
  record.workflow.nodes[1].member_ids = ['skl_stale']
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'member_version_stale'))
}

// --- member duplicate skill_id ---
{
  const record = validPackV3({ members: [
    { skill_id: 'skl_a', version_id: 'v1', role: 'entry', inclusion_reason: 'test' },
    { skill_id: 'skl_a', version_id: 'v1', role: 'processor', inclusion_reason: 'test' },
  ]})
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'member_duplicate_skill_id'))
}

// --- node member unknown (member not in pack members list) ---
{
  const record = validPackV3()
  record.workflow.nodes[0].member_ids = ['skl_unknown999']
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'node_member_unknown'))
}

// --- node member duplicated assignment across nodes ---
{
  const record = validPackV3()
  record.workflow.nodes[1].member_ids = ['skl_a', 'skl_b']
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'node_member_duplicate'))
}

// --- no nodes ---
{
  const record = validPackV3()
  record.workflow.nodes = []
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'dag_no_nodes'))
}

// --- no entry roots ---
{
  const record = validPackV3()
  record.workflow.entry_roots = []
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'dag_no_entry_roots'))
}

// --- no terminal sinks ---
{
  const record = validPackV3()
  record.workflow.terminal_sinks = []
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'dag_no_terminal_sinks'))
}

// --- unknown entry root ---
{
  const record = validPackV3()
  record.workflow.entry_roots = ['n_nonexistent']
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'dag_entry_root_unknown'))
}

// --- unknown terminal sink ---
{
  const record = validPackV3()
  record.workflow.terminal_sinks = ['n_nonexistent']
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'dag_terminal_sink_unknown'))
}

// --- missing edge artifact_handoff ---
{
  const record = validPackV3()
  record.workflow.edges[0].artifact_handoff = 'not an object'
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'edge_missing_artifact_handoff'))
}

// --- edge from_node unknown ---
{
  const record = validPackV3()
  record.workflow.edges[0].from_node = 'n_nonexistent'
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'edge_from_node_unknown'))
}

// --- edge to_node unknown ---
{
  const record = validPackV3()
  record.workflow.edges[0].to_node = 'n_nonexistent'
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'edge_to_node_unknown'))
}

// --- edge self-loop ---
{
  const record = validPackV3()
  record.workflow.edges[0].to_node = 'n1'
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'edge_self_loop'))
}

// --- unreachable node ---
{
  const record = validPackV3()
  record.workflow.nodes.push({ node_id: 'n_orphan', type: 'task', member_ids: ['skl_a'], entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'x' }, output_contract: { produces_claim_ids: [], description: 'x' } })
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'dag_unreachable_node'))
}

// --- member unassigned ---
{
  const record = validPackV3()
  record.members.push({ skill_id: 'skl_c', version_id: 'v1', role: 'extra', inclusion_reason: 'test' })
  const result = preflightPack(record)
  assert.ok(result.errors.some((e) => e.code === 'member_unassigned'))
}

console.log(`pack v3 preflight tests passed`)
