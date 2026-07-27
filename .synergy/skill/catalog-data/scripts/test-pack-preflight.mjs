#!/usr/bin/env node
import assert from 'node:assert/strict'
import { preflightPackWorkflow } from './lib/catalog-lib.mjs'

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

function member(id, versionId = 'v1') {
  return { skill_id: id, version_id: versionId, role: 'core', stage: id, inclusion_reason: 'test' }
}

function validRecord(overrides = {}) {
  return {
    pack_id: 'pack_test',
    schema_version: 2,
    name: 'Test Pack',
    members: [member('skl_a'), member('skl_b')],
    compatibility: { notes: 'ok', chains: [], strengthens: [], alternatives: [], conflicts: [], unresolved: [] },
    workflow: {
      entry: { description: 'Start', input_contract: 'An input string' },
      terminal: { description: 'End', output_contract: 'An output string' },
      stages: [
        {
          stage_id: 'stage-1',
          name: 'Stage 1',
          description: 'First stage',
          member_ids: ['skl_a'],
          handoffs: [
            {
              from_stage: 'stage-1',
              from_skill: 'skl_a',
              to_stage: 'stage-2',
              to_skill: 'skl_b',
              produced_artifact: 'artifact',
              consumed_as: 'input',
            },
          ],
        },
        {
          stage_id: 'stage-2',
          name: 'Stage 2',
          description: 'Second stage',
          member_ids: ['skl_b'],
          handoffs: [],
        },
      ],
      branches: [],
    },
    ...overrides,
  }
}

function preflight(record, skillMap = skills) {
  return preflightPackWorkflow(record, skillMap)
}

const codes = (result) => result.errors.map((e) => e.code).sort()

// --- valid closed loop v2 ---
{
  const result = preflight(validRecord())
  assert.equal(result.ok, true, 'valid closed-loop pack should pass')
  assert.deepEqual(result.errors, [])
}

// --- schema v2 valid ---
// (tested implicitly by validRecord using schema_version: 2 - preflight doesn't check schema directly)
// validation layer does that

// --- member missing ---
{
  const record = validRecord({ members: [member('skl_a'), member('skl_unknown')] })
  record.workflow.stages[1].member_ids = ['skl_unknown']
  record.workflow.stages[0].handoffs[0].to_skill = 'skl_unknown'
  const result = preflight(record)
  assert.deepEqual(codes(result), ['member_missing'])
}

// --- member blocked ---
{
  const record = validRecord({ members: [member('skl_a'), member('skl_blocked')] })
  record.workflow.stages[1].member_ids = ['skl_blocked']
  record.workflow.stages[0].handoffs[0].to_skill = 'skl_blocked'
  const result = preflight(record)
  assert.deepEqual(codes(result), ['member_blocked'])
}

// --- member version stale ---
{
  const record = validRecord({ members: [member('skl_a'), member('skl_stale', 'v1')] })
  record.workflow.stages[1].member_ids = ['skl_stale']
  record.workflow.stages[0].handoffs[0].to_skill = 'skl_stale'
  const result = preflight(record)
  assert.deepEqual(codes(result), ['member_version_stale'])
}

// --- member duplicate skill_id ---
{
  const record = validRecord({ members: [member('skl_a'), member('skl_a')] })
  record.workflow.stages[1].member_ids = ['skl_a']
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'member_duplicate_skill_id'))
}

// --- stage member unknown (member not in pack members list, only in stage) ---
{
  const record = validRecord()
  record.workflow.stages[1].member_ids = ['skl_unknown999']
  record.workflow.stages[0].handoffs[0].to_skill = 'skl_unknown999'
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'stage_member_unknown'))
}

// --- stage member duplicated assignment ---
{
  const record = validRecord()
  record.workflow.stages[0].member_ids = ['skl_a', 'skl_b']
  record.workflow.stages[1].member_ids = ['skl_b']
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'stage_member_duplicate'))
}

// --- missing adjacent main-path handoff ---
{
  const record = validRecord()
  record.workflow.stages[0].handoffs = []
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'missing_main_handoff'))
}

// --- handoff not adjacent (jump, forward skip) ---
{
  const record = validRecord()
  record.members = [member('skl_a'), member('skl_b'), member('skl_c')]
  record.workflow.stages = [
    {
      stage_id: 'stage-1',
      name: 'S1',
      description: 'First',
      member_ids: ['skl_a'],
      handoffs: [
        { from_stage: 'stage-1', from_skill: 'skl_a', to_stage: 'stage-3', to_skill: 'skl_c', produced_artifact: 'a', consumed_as: 'b' },
        { from_stage: 'stage-1', from_skill: 'skl_a', to_stage: 'stage-2', to_skill: 'skl_b', produced_artifact: 'a2', consumed_as: 'b2' },
      ],
    },
    {
      stage_id: 'stage-2', name: 'S2', description: 'Second',
      member_ids: ['skl_b'],
      handoffs: [
        { from_stage: 'stage-2', from_skill: 'skl_b', to_stage: 'stage-3', to_skill: 'skl_c', produced_artifact: 'b', consumed_as: 'c' },
      ],
    },
    {
      stage_id: 'stage-3', name: 'S3', description: 'Third',
      member_ids: ['skl_c'],
      handoffs: [],
    },
  ]
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'handoff_not_adjacent'))
}

// --- reverse adjacent handoff does not satisfy closure ---
{
  const record = validRecord()
  record.workflow.stages[0].handoffs = []
  record.workflow.stages[1].handoffs = [
    { from_stage: 'stage-2', from_skill: 'skl_b', to_stage: 'stage-1', to_skill: 'skl_a', produced_artifact: 'back', consumed_as: 'ref' },
  ]
  const result = preflight(record)
  // reverse handoff must be in stage-2 (its from_stage), and it is not forward
  assert.ok(result.errors.some((e) => e.code === 'handoff_not_adjacent'), 'reverse handoff is not forward adjacent')
  // also missing forward handoff from stage-1 to stage-2
  assert.ok(result.errors.some((e) => e.code === 'missing_main_handoff'), 'reverse adjacent does not satisfy forward closure')
}

// --- handoff misplaced: stored in wrong stage ---
{
  const record = validRecord()
  // Put stage-1's handoff in stage-2
  record.workflow.stages[0].handoffs = []
  record.workflow.stages[1].handoffs = [
    { from_stage: 'stage-1', from_skill: 'skl_a', to_stage: 'stage-2', to_skill: 'skl_b', produced_artifact: 'a', consumed_as: 'b' },
  ]
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'handoff_misplaced'))
}

// --- missing entry contract ---
{
  const record = validRecord({ workflow: { entry: undefined, terminal: { description: 'End', output_contract: 'x' }, stages: validRecord().workflow.stages, branches: [] } })
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'missing_entry'))
}

// --- empty entry description ---
{
  const record = validRecord()
  record.workflow.entry.description = 'TBD'
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'empty_entry_description'))
}

// --- empty entry contract ---
{
  const record = validRecord()
  record.workflow.entry.input_contract = '...'
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'empty_entry_contract'))
}

// --- missing terminal ---
{
  const record = validRecord({ workflow: { entry: { description: 'Start', input_contract: 'x' }, terminal: undefined, stages: validRecord().workflow.stages, branches: [] } })
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'missing_terminal'))
}

// --- empty stage description ---
{
  const record = validRecord()
  record.workflow.stages[0].description = 'PLACEHOLDER'
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'empty_stage_description'))
}

// --- empty artifact contract ---
{
  const record = validRecord()
  record.workflow.stages[0].handoffs[0].produced_artifact = ''
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'empty_artifact_contract'))
}

// --- handoff from_stage unknown ---
{
  const record = validRecord()
  record.workflow.stages[0].handoffs[0].from_stage = 'nonexistent'
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'handoff_from_stage_unknown'))
  // also misplaced because it no longer matches stage-1
}

// --- handoff to_stage unknown ---
{
  const record = validRecord()
  record.workflow.stages[0].handoffs[0].to_stage = 'nonexistent'
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'handoff_to_stage_unknown'))
}

// --- handoff from_skill not in from_stage ---
{
  const record = validRecord()
  record.workflow.stages[0].handoffs[0].from_skill = 'skl_b'
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'handoff_member_not_in_stage'))
}

// --- handoff to_skill not in to_stage ---
{
  const record = validRecord()
  record.workflow.stages[0].handoffs[0].to_skill = 'skl_a'
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'handoff_member_not_in_stage'))
}

// --- unresolved main-path gap (3 stages, only one handoff leaving stage-2 unreachable) ---
{
  const record = validRecord()
  record.members = [member('skl_a'), member('skl_b'), member('skl_c')]
  record.workflow.stages = [
    {
      stage_id: 'stage-1', name: 'S1', description: 'First',
      member_ids: ['skl_a'],
      handoffs: [
        { from_stage: 'stage-1', from_skill: 'skl_a', to_stage: 'stage-3', to_skill: 'skl_c', produced_artifact: 'a', consumed_as: 'b' },
      ],
    },
    {
      stage_id: 'stage-2', name: 'S2', description: 'Second',
      member_ids: ['skl_b'],
      handoffs: [],
    },
    {
      stage_id: 'stage-3', name: 'S3', description: 'Third',
      member_ids: ['skl_c'],
      handoffs: [],
    },
  ]
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'unresolved_gap'))
  assert.ok(result.errors.some((e) => e.code === 'missing_main_handoff'))
  assert.ok(result.errors.some((e) => e.code === 'handoff_not_adjacent'))
}

// --- stage no members ---
{
  const record = validRecord()
  record.workflow.stages[0].member_ids = []
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'stage_no_members'))
}

// --- stage duplicate id ---
{
  const record = validRecord()
  record.workflow.stages[1].stage_id = 'stage-1'
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'stage_duplicate_id'))
}

// --- 3-stage valid closed loop ---
{
  const record = validRecord()
  record.members = [member('skl_a'), member('skl_b'), member('skl_c')]
  record.workflow.stages = [
    {
      stage_id: 'stage-1', name: 'S1', description: 'First',
      member_ids: ['skl_a'],
      handoffs: [
        { from_stage: 'stage-1', from_skill: 'skl_a', to_stage: 'stage-2', to_skill: 'skl_b', produced_artifact: 'a', consumed_as: 'b' },
      ],
    },
    {
      stage_id: 'stage-2', name: 'S2', description: 'Second',
      member_ids: ['skl_b'],
      handoffs: [
        { from_stage: 'stage-2', from_skill: 'skl_b', to_stage: 'stage-3', to_skill: 'skl_c', produced_artifact: 'b', consumed_as: 'c' },
      ],
    },
    {
      stage_id: 'stage-3', name: 'S3', description: 'Third',
      member_ids: ['skl_c'],
      handoffs: [],
    },
  ]
  const result = preflight(record)
  assert.equal(result.ok, true, '3-stage valid closed loop should pass')
}

// --- branches with valid from/to stage ---
{
  const record = validRecord()
  record.workflow.branches = [{ condition: 'x > 0', description: 'alt path', from_stage: 'stage-1', to_stage: 'stage-2' }]
  const result = preflight(record)
  assert.equal(result.ok, true, 'valid branches should not cause failure')
}

// --- branch with unknown from_stage ---
{
  const record = validRecord()
  record.workflow.branches = [{ condition: 'x', description: 'bad', from_stage: 'nonexistent', to_stage: 'stage-2' }]
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'branch_from_stage_unknown'))
}

// --- branch with empty condition ---
{
  const record = validRecord()
  record.workflow.branches = [{ condition: '', description: 'desc', from_stage: 'stage-1', to_stage: 'stage-2' }]
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'empty_branch_condition'))
}

// --- branch with empty description ---
{
  const record = validRecord()
  record.workflow.branches = [{ condition: 'x', description: 'TODO', from_stage: 'stage-1', to_stage: 'stage-2' }]
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'empty_branch_description'))
}

// --- stage no id ---
{
  const record = validRecord()
  record.workflow.stages[0].stage_id = undefined
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'stage_no_id'))
}

// --- member unassigned ---
{
  const record = validRecord({ members: [member('skl_a'), member('skl_b'), member('skl_c')] })
  record.workflow.stages[0].member_ids = ['skl_a']
  record.workflow.stages[1].member_ids = ['skl_b']
  // skl_c is in members but not in any stage
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'member_unassigned'))
}

// --- same-stage handoff is valid but doesn't satisfy adjacent closure ---
{
  const record = validRecord()
  record.workflow.stages[0].handoffs = [
    { from_stage: 'stage-1', from_skill: 'skl_a', to_stage: 'stage-1', to_skill: 'skl_a', produced_artifact: 'self-loop', consumed_as: 'ref' },
  ]
  const result = preflight(record)
  // same-stage handoff is fine, but missing forward handoff to stage-2
  assert.ok(result.errors.some((e) => e.code === 'missing_main_handoff'), 'same-stage handoff does not close adjacent gap')
  // no handoff_not_adjacent for same-stage
  assert.ok(!result.errors.some((e) => e.code === 'handoff_not_adjacent'), 'same-stage handoff should not trigger non-adjacent error')
}

// --- compatibility.unresolved non-empty blocks ---
{
  const record = validRecord({ compatibility: { notes: 'test', chains: [], strengthens: [], alternatives: [], conflicts: [], unresolved: [{ why: 'gap between stages' }] } })
  const result = preflight(record)
  assert.ok(result.errors.some((e) => e.code === 'compatibility_unresolved'))
}

// --- compatibility arrays preserved ---
{
  const record = validRecord({
    compatibility: {
      notes: 'test',
      chains: [{ a: 1 }],
      strengthens: [{ b: 2 }],
      alternatives: [{ c: 3 }],
      conflicts: [],
      unresolved: [],
    },
  })
  const result = preflight(record)
  assert.equal(result.ok, true, 'populated canonical compat arrays should not cause failure')
}

console.log(`pack preflight tests passed`)
