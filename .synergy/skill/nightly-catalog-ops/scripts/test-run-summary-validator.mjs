#!/usr/bin/env node
import assert from 'node:assert/strict'
import { validateRunSummary } from './lib/run-summary-validator.mjs'

const tests = [
  ['valid v3 summary passes', () => assert.deepEqual(validateRunSummary(validSummary()), [])],
  ['legacy schema is rejected', () => assertError(mutate(validSummary(), (summary) => { summary.schema_version = 2 }), 'schema_version must be 3')],
  ['missing field is rejected', () => assertError(mutate(validSummary(), (summary) => { delete summary.ledger_digest }), 'summary.ledger_digest: missing required field')],
  ['unknown field is rejected', () => assertError(mutate(validSummary(), (summary) => { summary.authorization = {} }), 'summary.authorization: unknown field')],
  ['invalid digest is rejected', () => assertError(mutate(validSummary(), (summary) => { summary.context_digest = 'bad' }), 'context_digest must be a lowercase SHA-256')],
  ['more than two intents is rejected', () => assertError(mutate(validSummary(), (summary) => { summary.intents.push(intent('two'), intent('three')) }), 'at most 2 entries')],
  ['invalid seed skill ID is rejected', () => assertError(mutate(validSummary(), (summary) => { summary.intents[0].seed_skill_ids = ['not-a-skill'] }), 'entries must begin with "skl_"')],
  ['gate decision must match passed flag', () => assertError(mutate(validSummary(), (summary) => { summary.gate.decision = 'fail' }), 'gate.decision must be "pass"')],
  ['passing gate cannot report errors', () => assertError(mutate(validSummary(), (summary) => { summary.gate.errors = ['unexpected'] }), 'gate.errors must be empty')],
  ['failed gate requires errors', () => assertError(mutate(failedSummary(), (summary) => { summary.gate.errors = [] }), 'gate.errors must be non-empty')],
  ['outcome total must match counts', () => assertError(mutate(validSummary(), (summary) => { summary.run_outcome.total_actions = 99 }), 'summed outcome_counts')],
  ['failed status requires error count', () => assertError(mutate(failedSummary(), (summary) => { summary.run_outcome.errors = 0 }), 'requires run_outcome.errors > 0')],
  ['successful status cannot report errors', () => assertError(mutate(validSummary(), (summary) => { summary.run_outcome.errors = 1 }), 'requires run_outcome.errors = 0')],
  ['failed gate requires failed terminal status', () => assertError(mutate(failedSummary(), (summary) => { summary.run_outcome.status = 'partial' }), 'failed gate requires run_outcome.status')],
  ['passing gate cannot have failed status', () => assertError(mutate(validSummary(), (summary) => { summary.run_outcome.status = 'failed'; summary.run_outcome.errors = 1 }), 'passing gate cannot have')],
]

let failures = 0
for (const [name, run] of tests) {
  try {
    run()
    process.stdout.write(`ok - ${name}\n`)
  } catch (error) {
    failures += 1
    process.stderr.write(`not ok - ${name}\n${error.stack}\n`)
  }
}

if (failures > 0) {
  process.stderr.write(`${failures}/${tests.length} run-summary validator test(s) failed\n`)
  process.exit(1)
}
process.stdout.write(`${tests.length} run-summary validator tests passed\n`)

function validSummary() {
  return {
    schema_version: 3,
    run_id: 'run_validator-001',
    ledger_id: 'ldg_validator-001',
    context_digest: 'a'.repeat(64),
    ledger_digest: 'b'.repeat(64),
    timestamp: '2026-07-28T00:00:00Z',
    run_outcome: {
      status: 'success',
      summary: 'Run completed successfully.',
      total_actions: 2,
      errors: 0,
      warnings: 0,
    },
    gate: {
      gate_id: 'gate_validator-001',
      decision: 'pass',
      passed: true,
      errors: [],
      warnings: [],
    },
    intents: [intent('one')],
    outcome_counts: {
      sources: 0,
      skills: 0,
      relations: 0,
      packs: 1,
      issues: 1,
    },
  }
}

function failedSummary() {
  return mutate(validSummary(), (summary) => {
    summary.run_outcome.status = 'failed'
    summary.run_outcome.errors = 1
    summary.gate.decision = 'fail'
    summary.gate.passed = false
    summary.gate.errors = ['catalog validation failed']
  })
}

function intent(suffix) {
  return {
    domain: `domain-${suffix}`,
    source: 'coverage_gap',
    reason: 'A deterministic test intent.',
    score: 0.8,
    seed_skill_ids: ['skl_test-fixture_20000001'],
    max_analysis_budget: 1,
  }
}

function mutate(value, mutation) {
  const copy = structuredClone(value)
  mutation(copy)
  return copy
}

function assertError(summary, expected) {
  const errors = validateRunSummary(summary)
  assert.ok(errors.some((error) => error.includes(expected)), `Expected error containing "${expected}", got:\n${errors.join('\n')}`)
}
