#!/usr/bin/env node
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT, validateRelationRecord } from './lib/catalog-lib.mjs'

const appendRelation = join(ROOT, '.synergy', 'skill', 'catalog-data', 'scripts', 'append-relation.mjs')

function run(input) {
  return spawnSync(process.execPath, [appendRelation, '--validate-only'], {
    cwd: ROOT,
    input: JSON.stringify(input),
    encoding: 'utf8',
  })
}

// --- valid v2 chains_with with full binding block succeeds ---
{
  const result = run({
    relation_id: 'rel_test-v2-valid_001',
    schema_version: 2,
    subject: 'skl_a',
    predicate: 'chains_with',
    object: 'skl_b',
    weight: 0.85,
    evidence: 'test evidence',
    created_by_run: 'run_test_001',
    chains_with: {
      producer_skill: 'skl_a',
      consumer_skill: 'skl_b',
      producer_claim_id: 'clm_prd_a',
      consumer_claim_id: 'clm_req_b',
      direction: 'sequential',
      description: 'A feeds B',
    },
  })
  assert.equal(result.status, 0, 'v2 chains_with should succeed')
  const record = JSON.parse(result.stdout)
  assert.equal(record.schema_version, 2)
  assert.equal(record.chains_with.producer_skill, 'skl_a')
  assert.equal(record.chains_with.consumer_claim_id, 'clm_req_b')
  assert.equal(record.chains_with.direction, 'sequential')
  assert.deepEqual(validateRelationRecord(record), [])
}

// --- valid v2 strengthens with required strengthens block succeeds ---
{
  const result = run({
    relation_id: 'rel_test-v2-strengthens_001',
    schema_version: 2,
    subject: 'skl_a',
    predicate: 'strengthens',
    object: 'skl_b',
    weight: 0.5,
    evidence: 'test evidence',
    created_by_run: 'run_test_001',
    strengthens: {
      strengthening_skill: 'skl_c',
      strengthened_skill: 'skl_b',
      reason: 'Boosts output quality',
      is_required_handoff: false,
    },
  })
  assert.equal(result.status, 0, 'v2 strengthens should succeed')
  const record = JSON.parse(result.stdout)
  assert.equal(record.predicate, 'strengthens')
  assert.equal(record.strengthens.strengthening_skill, 'skl_c')
  assert.equal(record.strengthens.reason, 'Boosts output quality')
  assert.equal(record.chains_with, undefined)
}

// --- valid v2 alternatives succeeds ---
{
  const result = run({
    relation_id: 'rel_test-v2-alternatives_001',
    schema_version: 2,
    subject: 'skl_x',
    predicate: 'alternatives',
    object: 'skl_y',
    weight: 0.7,
    evidence: 'test evidence',
    created_by_run: 'run_test_001',
    alternatives: {
      candidate_a: 'skl_x',
      candidate_b: 'skl_y',
      disposition: 'contextual',
      context_note: 'Depends on input size',
    },
  })
  assert.equal(result.status, 0, 'v2 alternatives should succeed')
  const record = JSON.parse(result.stdout)
  assert.equal(record.predicate, 'alternatives')
  assert.equal(record.alternatives.disposition, 'contextual')
}

// --- valid v2 conflicts_with succeeds ---
{
  const result = run({
    relation_id: 'rel_test-v2-conflicts_001',
    schema_version: 2,
    subject: 'skl_p',
    predicate: 'conflicts_with',
    object: 'skl_q',
    weight: 0.6,
    evidence: 'test evidence',
    created_by_run: 'run_test_001',
    conflicts_with: {
      skill_a: 'skl_p',
      skill_b: 'skl_q',
      disposition: 'mutually_exclusive',
      mitigation_note: 'Do not use together',
    },
  })
  assert.equal(result.status, 0, 'v2 conflicts_with should succeed')
  const record = JSON.parse(result.stdout)
  assert.equal(record.predicate, 'conflicts_with')
  assert.equal(record.conflicts_with.disposition, 'mutually_exclusive')
}

// --- v1 schema_version is rejected ---
{
  const result = run({
    relation_id: 'rel_test-v1-reject_001',
    schema_version: 1,
    subject: 'skl_a',
    predicate: 'chains_with',
    object: 'skl_b',
    weight: 0.5,
    evidence: 'test',
    created_by_run: 'run_test_001',
  })
  assert.notEqual(result.status, 0, 'v1 schema_version should be rejected')
}

// --- missing relation_id is rejected ---
{
  const result = run({
    schema_version: 2,
    subject: 'skl_a',
    predicate: 'strengthens',
    object: 'skl_b',
    weight: 0.5,
    evidence: 'test',
    created_by_run: 'run_test_001',
    strengthens: {
      strengthening_skill: 'skl_c',
      strengthened_skill: 'skl_b',
      reason: 'Boosts',
    },
  })
  assert.notEqual(result.status, 0, 'missing relation_id should be rejected')
}

// --- created_by_run auto-fills when missing ---
{
  const result = run({
    relation_id: 'rel_test-autofill-run_001',
    schema_version: 2,
    subject: 'skl_a',
    predicate: 'strengthens',
    object: 'skl_b',
    weight: 0.5,
    evidence: 'test',
    strengthens: {
      strengthening_skill: 'skl_c',
      strengthened_skill: 'skl_b',
      reason: 'Boosts',
    },
  })
  assert.equal(result.status, 0, 'missing created_by_run should auto-fill')
  const record = JSON.parse(result.stdout)
  assert.equal(record.created_by_run, 'manual')
}

// --- chains_with missing its required block is rejected ---
{
  const result = run({
    relation_id: 'rel_test-no-chain-block_001',
    schema_version: 2,
    subject: 'skl_a',
    predicate: 'chains_with',
    object: 'skl_b',
    weight: 0.5,
    evidence: 'test',
    created_by_run: 'run_test_001',
  })
  assert.notEqual(result.status, 0, 'chains_with missing block should be rejected')
}

// --- weight out of range is rejected ---
{
  const result = run({
    relation_id: 'rel_test-bad-weight_001',
    schema_version: 2,
    subject: 'skl_a',
    predicate: 'alternatives',
    object: 'skl_b',
    weight: 1.5,
    evidence: 'test',
    created_by_run: 'run_test_001',
    alternatives: {
      candidate_a: 'skl_a',
      candidate_b: 'skl_b',
      disposition: 'contextual',
    },
  })
  assert.notEqual(result.status, 0, 'weight > 1.0 should be rejected')
}

// --- unknown field is rejected ---
{
  const result = run({
    relation_id: 'rel_test-extra-field_001',
    schema_version: 2,
    subject: 'skl_a',
    predicate: 'chains_with',
    object: 'skl_b',
    weight: 0.5,
    evidence: 'test',
    created_by_run: 'run_test_001',
    source: 'manual',
    chains_with: {
      producer_skill: 'skl_a',
      consumer_skill: 'skl_b',
      producer_claim_id: 'clm_1',
      consumer_claim_id: 'clm_2',
      direction: 'sequential',
    },
  })
  assert.notEqual(result.status, 0, 'unknown field source should be rejected')
}

// --- auto-filled defaults: weight, evidence, created_at, created_by_run ---
{
  const result = run({
    relation_id: 'rel_test-autofill_001',
    schema_version: 2,
    subject: 'skl_a',
    predicate: 'alternatives',
    object: 'skl_b',
    alternatives: {
      candidate_a: 'skl_a',
      candidate_b: 'skl_b',
      disposition: 'contextual',
    },
  })
  assert.equal(result.status, 0, 'auto-filled defaults should succeed')
  const record = JSON.parse(result.stdout)
  assert.equal(record.weight, 0)
  assert.equal(record.evidence, '')
  assert.equal(record.created_by_run, 'manual')
  assert.ok(typeof record.created_at === 'string' && record.created_at.length > 0, 'created_at should be auto-populated')
}

// --- strengthens without strengthens block is rejected ---
{
  const result = run({
    relation_id: 'rel_test-strengthens-no-block_001',
    schema_version: 2,
    subject: 'skl_a',
    predicate: 'strengthens',
    object: 'skl_b',
    weight: 0.5,
    evidence: 'test',
    created_by_run: 'run_test_001',
  })
  assert.notEqual(result.status, 0, 'strengthens missing block should be rejected')
}

// --- chains_with with wrong direction enum is rejected ---
{
  const result = run({
    relation_id: 'rel_test-bad-direction_001',
    schema_version: 2,
    subject: 'skl_a',
    predicate: 'chains_with',
    object: 'skl_b',
    weight: 0.5,
    evidence: 'test',
    created_by_run: 'run_test_001',
    chains_with: {
      producer_skill: 'skl_a',
      consumer_skill: 'skl_b',
      producer_claim_id: 'clm_1',
      consumer_claim_id: 'clm_2',
      direction: 'invalid',
    },
  })
  assert.notEqual(result.status, 0, 'chains_with with invalid direction should be rejected')
}

console.log('relation v2 tests passed')
