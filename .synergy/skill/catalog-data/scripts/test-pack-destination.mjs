#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  evaluationPathForPack,
  loadSkillRecords,
  packRecordPath,
  parseYamlFile,
  promotePassingCandidates,
  ROOT,
  stableStringify,
  validateCatalog,
  writeTextAtomic,
  writeYaml,
} from './lib/catalog-lib.mjs'

const candidateWriter = join(ROOT, '.synergy', 'skill', 'pack-synthesis', 'scripts', 'write-pack-candidate.mjs')
const recordWriter = join(ROOT, '.synergy', 'skill', 'catalog-data', 'scripts', 'write-pack-record.mjs')
const packIds = {
  normal: 'pack_test-destination-normal_10000001',
  missingEvaluation: 'pack_test-published-missing-evaluation_10000002',
  lowScore: 'pack_test-published-low-score_10000003',
  staleMember: 'pack_test-published-stale-member_10000004',
  promotion: 'pack_test-promotion-normal_10000005',
}

const eligibleMembers = loadSkillRecords()
  .map(({ record }) => record)
  .filter((record) => ['active', 'preview'].includes(record.status) && record.identity?.current_version_id)
  .slice(0, 2)
  .map((record, index) => ({
    skill_id: record.canonical_skill_id,
    version_id: record.identity.current_version_id,
    role: `role-${index + 1}`,
    stage: `stage-${index + 1}`,
    inclusion_reason: `test member ${index + 1}`,
  }))
assert.equal(eligibleMembers.length, 2, 'fixture requires two eligible catalog skills')

try {
  assertRejected(candidateWriter, { ...packDraft(packIds.normal), status: 'published' }, /status must be candidate/)
  assertRejected(candidateWriter, { ...packDraft(packIds.normal), record_bucket: 'published' }, /record_bucket/)
  assertRejected(recordWriter, { ...packDraft(packIds.normal), status: 'published' }, /status must be candidate/)
  assertRejected(recordWriter, { ...packDraft(packIds.normal), record_bucket: 'published' }, /record_bucket/)

  const normal = runWriter(candidateWriter, packDraft(packIds.normal))
  assert.equal(normal.record.status, 'candidate')
  assert.equal(existsSync(packRecordPath(packIds.normal, 'candidate')), true)
  assert.equal(existsSync(packRecordPath(packIds.normal, 'published')), false)

  writePublished(packIds.missingEvaluation, passingPack(packIds.missingEvaluation))
  assertValidationError(packIds.missingEvaluation, /passing evaluation file is required/)

  writePublished(packIds.lowScore, passingPack(packIds.lowScore))
  writeEvaluation(packIds.lowScore, { overall_score: 0.77, passed: true, status: 'passed' })
  assertValidationError(packIds.lowScore, /score must be at least 0\.78/)

  writePublished(packIds.staleMember, {
    ...passingPack(packIds.staleMember),
    members: [{ ...eligibleMembers[0], version_id: 'sha256:stale' }, eligibleMembers[1]],
  })
  writeEvaluation(packIds.staleMember, passingEvaluation(packIds.staleMember))
  assertValidationError(packIds.staleMember, /does not pin its current version/)

  runWriter(candidateWriter, packDraft(packIds.promotion))
  const promotionPath = packRecordPath(packIds.promotion, 'candidate')
  const promotionRecord = parseYamlFile(promotionPath)
  promotionRecord.evaluation = { evaluation_id: `eval_${packIds.promotion}`, score: 0.9, status: 'passed' }
  writeYaml(promotionPath, promotionRecord)
  writeEvaluation(packIds.promotion, passingEvaluation(packIds.promotion), 'candidate')
  const changed = promotePassingCandidates(false, new Set([packIds.promotion]))
  const expectedPath = `catalog/packs/published/${packIds.promotion}/pack.yaml`.replace(/\//g, process.platform === 'win32' ? '\\' : '/')
  assert.deepEqual(changed, [expectedPath])
  assert.equal(parseYamlFile(packRecordPath(packIds.promotion, 'published')).status, 'published')
  assert.equal(validationErrorsFor(packIds.promotion).length, 0)

  console.log('pack destination tests passed')
} finally {
  for (const packId of Object.values(packIds)) {
    rmSync(dirname(packRecordPath(packId, 'candidate')), { recursive: true, force: true })
    rmSync(dirname(packRecordPath(packId, 'published')), { recursive: true, force: true })
  }
}

function packDraft(packId) {
  return {
    pack_id: packId,
    name: `Test ${packId}`,
    intent: 'Verify controller-derived pack destinations',
    domain: 'testing',
    members: eligibleMembers,
    excluded: [],
    workflow: {
      summary: 'Exercise both members',
      stages: eligibleMembers.map((member) => ({ name: member.stage, description: `Run ${member.skill_id}` })),
    },
    compatibility: { notes: 'Test members are independently eligible' },
    evidence: { analysis_paths: [], relation_edges: [] },
  }
}

function passingPack(packId) {
  const record = runWriter(candidateWriter, packDraft(packId)).record
  return {
    ...record,
    status: 'published',
    evaluation: { evaluation_id: `eval_${packId}`, score: 0.9, status: 'passed' },
  }
}

function passingEvaluation(packId) {
  return { overall_score: 0.9, passed: true, status: 'passed', evaluation_id: `eval_${packId}` }
}

function writePublished(packId, record) {
  writeYaml(packRecordPath(packId, 'published'), record)
}

function writeEvaluation(packId, overrides, bucket = 'published') {
  const evaluation = {
    schema_version: 1,
    evaluation_id: `eval_${packId}`,
    output_id: packId,
    kind: 'pack',
    metrics: {},
    failure_modes: [],
    recommendations: [],
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
  writeTextAtomic(evaluationPathForPack(packId, bucket), stableStringify(evaluation))
}

function runWriter(script, draft) {
  const result = spawnSync(process.execPath, [script], { cwd: ROOT, input: JSON.stringify(draft), encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return JSON.parse(result.stdout)
}

function assertRejected(script, draft, pattern) {
  const result = spawnSync(process.execPath, [script], { cwd: ROOT, input: JSON.stringify(draft), encoding: 'utf8' })
  assert.notEqual(result.status, 0, 'writer should reject controller fields')
  assert.match(result.stderr || result.stdout, pattern)
}

function validationErrorsFor(packId) {
  return validateCatalog({ strict: true }).errors.filter((error) => error.includes(packId))
}

function assertValidationError(packId, pattern) {
  assert.ok(validationErrorsFor(packId).some((error) => pattern.test(error)), `expected ${pattern} for ${packId}`)
}
