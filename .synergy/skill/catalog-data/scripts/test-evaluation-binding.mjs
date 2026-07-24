#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  createEvaluationBinding,
  evaluationPathForPack,
  loadSkillRecords,
  packRecordPath,
  parseYamlFile,
  ROOT,
  stableStringify,
  writeTextAtomic,
  writeYaml,
} from './lib/catalog-lib.mjs'

const candidateWriter = join(ROOT, '.synergy', 'skill', 'pack-synthesis', 'scripts', 'write-pack-candidate.mjs')
const evaluationController = join(ROOT, '.synergy', 'skill', 'catalog-evaluation', 'scripts', 'write-evaluation-draft.mjs')
const evaluationWriter = join(ROOT, '.synergy', 'skill', 'catalog-data', 'scripts', 'write-evaluation.mjs')
const packIds = {
  normal: 'pack_test-evaluation-normal_20000001',
  stale: 'pack_test-evaluation-stale_20000002',
  contradictory: 'pack_test-evaluation-contradictory_20000003',
}

const members = loadSkillRecords()
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
assert.equal(members.length, 2, 'fixture requires two eligible catalog skills')

try {
  run(candidateWriter, [], packDraft(packIds.normal))
  run(candidateWriter, [], packDraft(packIds.stale))
  run(candidateWriter, [], packDraft(packIds.contradictory))

  const binding = run(evaluationController, ['--pack-id', packIds.normal, '--create-binding'])
  assert.equal(binding.pack_id, packIds.normal)
  assert.equal(binding.pack_status, 'candidate')
  assert.match(binding.evaluation_id, /^eval_/)
  const expectedEvalPath = `catalog/packs/candidates/${packIds.normal}/evaluation.json`.replace(/\//g, process.platform === 'win32' ? '\\' : '/')
  assert.equal(binding.expected_path, expectedEvalPath)

  for (const [field, value] of [
    ['pack_id', packIds.stale],
    ['evaluation_id', 'eval_forged_20000001'],
    ['pack_status', 'published'],
    ['output_path', `catalog/packs/published/${packIds.normal}/evaluation.json`],
  ]) {
    assertRejected(evaluationController, ['--pack-id', packIds.normal], { ...evaluationDraft(), [field]: value }, new RegExp(field))
  }

  assertRejected(evaluationController, ['--pack-id', packIds.normal], {
    binding: { ...binding, evaluation_id: 'eval_forged_20000002' },
    draft: evaluationDraft(),
  }, /evaluation_id does not match controller binding/)

  const staleBinding = createEvaluationBinding(packIds.stale)
  const stalePackPath = packRecordPath(packIds.stale, 'candidate')
  const stalePack = parseYamlFile(stalePackPath)
  stalePack.intent = 'Changed after the controller issued its binding'
  writeYaml(stalePackPath, stalePack)
  assertRejected(evaluationWriter, [], { binding: staleBinding, draft: evaluationDraft() }, /stale or mismatched/)

  const publishedPath = evaluationPathForPack(packIds.normal, 'published')
  const publishedSentinel = stableStringify({ evaluation_id: 'eval_published-sentinel_20000001', output_id: packIds.normal })
  writeTextAtomic(publishedPath, publishedSentinel)

  const result = run(evaluationController, ['--pack-id', packIds.normal], evaluationDraft())
  const evaluation = result.records[0]
  assert.equal(evaluation.output_id, packIds.normal)
  assert.equal(evaluation.evaluation_id, binding.evaluation_id)
  assert.equal(evaluation.status, 'passed')
  assert.equal(evaluation.passed, true)
  assert.equal(JSON.parse(readFileSync(publishedPath, 'utf8')).evaluation_id, 'eval_published-sentinel_20000001')
  assert.equal(JSON.parse(readFileSync(evaluationPathForPack(packIds.normal, 'candidate'), 'utf8')).evaluation_id, binding.evaluation_id)

  assertRejected(evaluationWriter, [], { binding, draft: evaluationDraft() }, /already been used/)

  const updatedPack = parseYamlFile(packRecordPath(packIds.normal, 'candidate'))
  assert.deepEqual(updatedPack.evaluation, { evaluation_id: binding.evaluation_id, score: 0.9, status: 'passed' })

  const contradictory = run(evaluationController, ['--pack-id', packIds.contradictory], {
    ...evaluationDraft(),
    passed: false,
    status: 'passed',
  }).records[0]
  assert.equal(contradictory.passed, false)
  assert.equal(contradictory.status, 'needs_work')

  console.log('evaluation binding tests passed')
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
    intent: 'Verify controller-derived evaluation destinations',
    domain: 'testing',
    members,
    excluded: [],
    workflow: {
      summary: 'Exercise both members',
      stages: members.map((member) => ({ name: member.stage, description: `Run ${member.skill_id}` })),
    },
    compatibility: { notes: 'Test members are independently eligible' },
    evidence: { analysis_paths: [], relation_edges: [] },
  }
}

function evaluationDraft() {
  return {
    metrics: { relevance: 0.9 },
    overall_score: 0.9,
    passed: true,
    status: 'passed',
    failure_modes: [],
    recommendations: [],
  }
}

function run(script, args, input) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    input: input === undefined ? undefined : JSON.stringify(input),
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return JSON.parse(result.stdout)
}

function assertRejected(script, args, input, pattern) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, input: JSON.stringify(input), encoding: 'utf8' })
  assert.notEqual(result.status, 0, 'writer should reject forged or stale control data')
  assert.match(result.stderr || result.stdout, pattern)
}
