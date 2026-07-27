#!/usr/bin/env node
import assert from 'node:assert/strict'
import { isPackPromotionEligible } from './lib/catalog-lib.mjs'

const skills = new Map([
  ['skill-a', eligibleSkill('version-a')],
  ['skill-b', eligibleSkill('version-b')],
  ['blocked-skill', { ...eligibleSkill('blocked-version'), status: 'blocked' }],
])

const validWorkflow = {
  summary: 'test',
  entry: { description: 'Start', input_contract: 'An input' },
  terminal: { description: 'End', output_contract: 'An output' },
  stages: [
    {
      stage_id: 'stage-1',
      name: 'Stage 1',
      description: 'First',
      member_ids: ['skill-a'],
      handoffs: [
        {
          from_stage: 'stage-1',
          from_skill: 'skill-a',
          to_stage: 'stage-2',
          to_skill: 'skill-b',
          produced_artifact: 'result-a',
          consumed_as: 'input-b',
        },
      ],
    },
    {
      stage_id: 'stage-2',
      name: 'Stage 2',
      description: 'Second',
      member_ids: ['skill-b'],
      handoffs: [],
    },
  ],
  branches: [],
}

const passingRecord = {
  schema_version: 2,
  evaluation: { status: 'passed', passed: true, score: 0.78 },
  workflow: validWorkflow,
  compatibility: { notes: 'ok', chains: [], strengthens: [], alternatives: [], conflicts: [], unresolved: [] },
  members: [
    { skill_id: 'skill-a', version_id: 'version-a' },
    { skill_id: 'skill-b', version_id: 'version-b' },
  ],
}

const tests = [
  {
    name: 'rejects contradictory status passed and passed false in evaluation file',
    record: passingRecord,
    fileEvaluation: { status: 'passed', passed: false, score: 0.9 },
    expected: false,
  },
  {
    name: 'rejects contradictory needs_work status and passed true in evaluation file',
    record: passingRecord,
    fileEvaluation: { status: 'needs_work', passed: true, score: 0.9 },
    expected: false,
  },
  {
    name: 'rejects contradictory status passed and passed false inline',
    record: withEvaluation(passingRecord, { status: 'passed', passed: false, score: 0.9 }),
    expected: false,
  },
  {
    name: 'rejects contradictory needs_work status and passed true inline',
    record: withEvaluation(passingRecord, { status: 'needs_work', passed: true, score: 0.9 }),
    expected: false,
  },
  {
    name: 'rejects explicit inline failure when evaluation file passes',
    record: withEvaluation(passingRecord, { status: 'needs_work' }),
    fileEvaluation: { status: 'passed', passed: true, score: 0.9 },
    expected: false,
  },
  {
    name: 'accepts consistent passing evaluation file at threshold',
    record: passingRecord,
    fileEvaluation: { status: 'passed', passed: true, overall_score: 0.78 },
    expected: true,
  },
  {
    name: 'accepts inline passed signal at threshold',
    record: withEvaluation(passingRecord, { passed: true, score: 0.78 }),
    expected: true,
  },
  {
    name: 'rejects evaluation file score below threshold',
    record: passingRecord,
    fileEvaluation: { status: 'passed', passed: true, score: 0.779 },
    expected: false,
  },
  {
    name: 'rejects inline score below threshold',
    record: withEvaluation(passingRecord, { status: 'passed', score: 0.779 }),
    expected: false,
  },
  {
    name: 'rejects fewer than two members',
    record: { ...passingRecord, members: passingRecord.members.slice(0, 1) },
    expected: false,
  },
  {
    name: 'rejects stale member version',
    record: {
      ...passingRecord,
      members: [passingRecord.members[0], { skill_id: 'skill-b', version_id: 'old-version' }],
    },
    expected: false,
  },
  {
    name: 'rejects blocked member',
    record: {
      ...passingRecord,
      members: [passingRecord.members[0], { skill_id: 'blocked-skill', version_id: 'blocked-version' }],
    },
    expected: false,
  },
  {
    name: 'rejects promotion for preflight-failed pack (missing handoff)',
    record: withWorkflow(passingRecord, {
      ...validWorkflow,
      stages: [
        { ...validWorkflow.stages[0], handoffs: [] },
        validWorkflow.stages[1],
      ],
    }),
    fileEvaluation: { status: 'passed', passed: true, overall_score: 0.85 },
    expected: false,
  },
  {
    name: 'rejects promotion for preflight-failed pack (empty terminal)',
    record: withWorkflow(passingRecord, {
      ...validWorkflow,
      terminal: { description: 'TBD', output_contract: 'TBD' },
    }),
    fileEvaluation: { status: 'passed', passed: true, overall_score: 0.85 },
    expected: false,
  },
  {
    name: 'rejects promotion for preflight-failed pack (unknown member)',
    record: withWorkflow(passingRecord, {
      ...validWorkflow,
      stages: [
        {
          stage_id: 'stage-1',
          name: 'S1',
          description: 'First',
          member_ids: ['skill-a', 'unknown-skill'],
          handoffs: [
            { from_stage: 'stage-1', from_skill: 'skill-a', to_stage: 'stage-2', to_skill: 'skill-b', produced_artifact: 'a', consumed_as: 'b' },
          ],
        },
        validWorkflow.stages[1],
      ],
    }),
    fileEvaluation: { status: 'passed', passed: true, overall_score: 0.85 },
    expected: false,
  },
  {
    name: 'rejects promotion for unresolved compatibility',
    record: {
      ...passingRecord,
      compatibility: { notes: 'test', chains: [], strengthens: [], alternatives: [], conflicts: [], unresolved: [{ why: 'gap' }] },
    },
    fileEvaluation: { status: 'passed', passed: true, overall_score: 0.85 },
    expected: false,
  },
]

for (const test of tests) {
  assert.equal(
    isPackPromotionEligible(test.record, test.fileEvaluation ?? null, skills),
    test.expected,
    test.name
  )
}

console.log(`pack promotion tests passed (${tests.length})`)

function eligibleSkill(versionId) {
  return { status: 'active', identity: { current_version_id: versionId } }
}

function withEvaluation(record, evaluation) {
  return { ...record, evaluation }
}

function withWorkflow(record, workflow) {
  return { ...record, workflow }
}
