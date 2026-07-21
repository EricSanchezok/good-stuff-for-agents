#!/usr/bin/env node
import assert from 'node:assert/strict'
import { isPackPromotionEligible } from './lib/catalog-lib.mjs'

const skills = new Map([
  ['skill-a', eligibleSkill('version-a')],
  ['skill-b', eligibleSkill('version-b')],
  ['blocked-skill', { ...eligibleSkill('blocked-version'), status: 'blocked' }],
])

const passingRecord = {
  evaluation: { status: 'passed', passed: true, score: 0.78 },
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
