#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { validateRunSummary } from './lib/run-summary-validator.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(scriptsDir, 'fixtures')
const published = readFixture('valid-published.json')
const bounded = readFixture('valid-bounded-no-publication.json')
const publishedFixtureId = `pack_valid_published_${process.pid}`
const publishedFixtureDomain = `validator-fixture-${process.pid}`
published.terminal_states[0].object_id = publishedFixtureId
published.terminal_states[0].path = `catalog/packs/published/${publishedFixtureId}/pack.yaml`
published.publication_progress.targets_attempted[0].object_id = publishedFixtureId
const publishedRecordDir = join(scriptsDir, '..', '..', '..', '..', 'catalog', 'packs', 'published', publishedFixtureId)
const publishedPageDir = join(scriptsDir, '..', '..', '..', '..', 'docs', 'packs', publishedFixtureDomain)
const publishedRecordPath = join(publishedRecordDir, 'pack.yaml')
const publishedPagePath = join(publishedPageDir, `${publishedFixtureId}.md`)

setupPublishedArtifacts()
process.on('exit', cleanupPublishedArtifacts)

const tests = [
  {
    name: 'valid published summary passes',
    summary: published,
    expectedError: null,
  },
  {
    name: 'valid bounded no-publication summary passes',
    summary: bounded,
    expectedError: null,
  },
  {
    name: 'schema-version-2 summary missing publication progress fails',
    summary: mutate(bounded, (summary) => {
      delete summary.publication_progress
    }),
    expectedError: 'missing required top-level field "publication_progress"',
  },
  {
    name: 'historical schema-version-1 summary without publication progress remains checkable',
    summary: mutate(published, (summary) => {
      summary.schema_version = 1
      delete summary.publication_progress
      delete summary.authorization.commits_allowed
      delete summary.starting_state.catalog_counts.published_packs
    }),
    expectedError: null,
  },
  {
    name: 'missing authorization field cannot bypass promotion enforcement',
    summary: mutate(promotionReadySummary(true), (summary) => {
      delete summary.authorization.commits_allowed
    }),
    expectedError: 'authorization.commits_allowed: missing required field',
  },
  {
    name: 'non-boolean authorization cannot bypass promotion enforcement',
    summary: mutate(promotionReadySummary(true), (summary) => {
      summary.authorization.commits_allowed = 'false'
    }),
    expectedError: 'authorization.commits_allowed must be a boolean',
  },
  {
    name: 'v2 authorization requires operator field',
    summary: mutate(bounded, (summary) => {
      delete summary.authorization.operator
    }),
    expectedError: 'authorization.operator: missing required field',
  },
  {
    name: 'v2 authorization requires trusted source field',
    summary: mutate(bounded, (summary) => {
      delete summary.authorization.source
    }),
    expectedError: 'authorization.source: missing required field',
  },
  {
    name: 'issue-derived authorization source fails',
    summary: mutate(bounded, (summary) => {
      summary.authorization.source = 'issue'
    }),
    expectedError: 'authorization.source must be one of',
  },
  {
    name: 'issue trigger cannot authorize finalization',
    summary: mutate(bounded, (summary) => {
      summary.authorization.trigger = 'issue'
    }),
    expectedError: 'authorization.trigger must be one of',
  },
  {
    name: 'issue-derived operator fails',
    summary: mutate(bounded, (summary) => {
      summary.authorization.operator = 'issue-123-demand'
    }),
    expectedError: 'authorization.operator must not be issue- or demand-derived',
  },
  {
    name: 'v2 summary requires touched paths manifest',
    summary: mutate(bounded, (summary) => {
      delete summary.touched_paths_manifest
    }),
    expectedError: 'missing required top-level field "touched_paths_manifest"',
  },
  {
    name: 'v2 summary requires valid manifest digest',
    summary: mutate(bounded, (summary) => {
      summary.touched_paths_manifest_sha256 = 'not-a-digest'
    }),
    expectedError: 'touched_paths_manifest_sha256 must be a lowercase SHA-256 hex digest',
  },
  {
    name: 'v2 push authorization requires boolean type',
    summary: mutate(bounded, (summary) => {
      summary.authorization.pushes_allowed = 'false'
    }),
    expectedError: 'authorization.pushes_allowed must be a boolean',
  },
  {
    name: 'v2 authorization flags must match mode',
    summary: mutate(bounded, (summary) => {
      summary.authorization.mode = 'read_only'
    }),
    expectedError: 'authorization.commits_allowed must be false when authorization.mode is "read_only"',
  },
  {
    name: 'missing published pack count cannot bypass seven-day recovery',
    summary: mutate(recoveryTriggerSummary({ fullRuns: 0, days: 7, mode: 'normal' }), (summary) => {
      delete summary.starting_state.catalog_counts.published_packs
    }),
    expectedError: 'starting_state.catalog_counts.published_packs: missing required field',
  },
  {
    name: 'invalid published pack count cannot bypass seven-day recovery',
    summary: mutate(recoveryTriggerSummary({ fullRuns: 0, days: 7, mode: 'normal' }), (summary) => {
      summary.starting_state.catalog_counts.published_packs = 'unknown'
    }),
    expectedError: 'starting_state.catalog_counts.published_packs must be a non-negative integer',
  },
  {
    name: 'promoted pack requires canonical published record path',
    summary: mutate(published, (summary) => {
      summary.terminal_states[0].path = 'catalog/packs/published/.gitkeep'
    }),
    expectedError: 'promoted_published pack path must be canonical published record path',
  },
  {
    name: 'early needs_work fails',
    summary: mutate(bounded, (summary) => {
      const target = summary.publication_progress.targets_attempted[0]
      target.attempts.pop()
      target.outcome = 'needs_work'
      summary.terminal_states[0].evaluation_outcome = 'needs_work'
    }),
    expectedError: 'needs_work cannot be terminal before 3 substantive repair attempts',
  },
  {
    name: 'three unsuccessful repairs must end rejected',
    summary: mutate(bounded, (summary) => {
      const target = summary.publication_progress.targets_attempted[0]
      target.attempts[2].outcome = 'needs_work'
      target.outcome = 'needs_work'
      summary.terminal_states[0].evaluation_outcome = 'needs_work'
    }),
    expectedError: 'must end as rejected',
  },
  {
    name: 'more than two targets fails',
    summary: mutate(bounded, (summary) => {
      const target = structuredClone(summary.publication_progress.targets_attempted[0])
      summary.publication_progress.targets_attempted.push(
        { ...structuredClone(target), object_id: 'pack_second' },
        { ...structuredClone(target), object_id: 'pack_third' }
      )
    }),
    expectedError: 'must contain at most 2 targets',
  },
  {
    name: 'more than three attempts fails',
    summary: mutate(bounded, (summary) => {
      summary.publication_progress.targets_attempted[0].attempts.push({
        attempt: 4,
        outcome: 'needs_work',
        evidence: 'A fourth attempt exceeds the deterministic repair bound.',
      })
    }),
    expectedError: 'must contain at most 3 substantive repair attempts',
  },
  {
    name: 'duplicate attempted target IDs fail',
    summary: mutate(bounded, (summary) => {
      summary.publication_progress.targets_attempted.push(
        structuredClone(summary.publication_progress.targets_attempted[0])
      )
    }),
    expectedError: 'duplicate object_id "pack_bounded_repair"',
  },
  {
    name: 'missing no-publication proof fails',
    summary: mutate(bounded, (summary) => {
      delete summary.publication_progress.no_publish_reason
    }),
    expectedError: 'no_publish_reason must be an object when published=false',
  },
  {
    name: 'inconsistent published state fails',
    summary: mutate(published, (summary) => {
      summary.publication_progress.published = false
      summary.publication_progress.no_publish_reason = {
        code: 'blocked',
        summary: 'Contradicts the promoted terminal state.',
        evidence: ['The fixture intentionally records inconsistent publication state.'],
      }
    }),
    expectedError: 'published must be true when terminal_states contains promoted_published',
  },
  {
    name: 'published target must match terminal object',
    summary: mutate(published, (summary) => {
      summary.publication_progress.targets_attempted[0].object_id = 'pack_other'
    }),
    expectedError: 'requires a matching pack terminal state',
  },
  {
    name: 'attempted target requires matching pack terminal state',
    summary: mutate(bounded, (summary) => {
      summary.publication_progress.targets_attempted[0].object_id = 'pack_other'
    }),
    expectedError: 'publication target "pack_other" requires a matching pack terminal state',
  },
  {
    name: 'pack terminal state requires matching attempted target',
    summary: mutate(bounded, (summary) => {
      summary.terminal_states.push({
        object_type: 'pack',
        object_id: 'pack_unattempted',
        path: 'catalog/packs/candidates/.gitkeep',
        state: 'evaluated',
        owner: 'catalog-evaluation',
        reason: 'This pack was evaluated without a publication attempt record.',
        evaluation_outcome: 'rejected',
      })
    }),
    expectedError: 'pack terminal state "pack_unattempted" requires a matching publication target',
  },
  {
    name: 'target outcome must match pack terminal state',
    summary: mutate(bounded, (summary) => {
      summary.terminal_states[0].evaluation_outcome = 'needs_work'
    }),
    expectedError: 'does not match pack terminal state',
  },
  {
    name: 'promoted public page terminal does not join pack target IDs',
    summary: mutate(published, (summary) => {
      summary.terminal_states.push({
        object_type: 'public_page',
        object_id: `public_${publishedFixtureId}`,
        path: `docs/packs/${publishedFixtureDomain}/${publishedFixtureId}.md`,
        state: 'promoted_published',
        owner: 'catalog-publishing',
        reason: 'The published pack page was rendered and checked.',
        verification: ['npm --prefix .synergy run publish:check'],
      })
    }),
    expectedError: null,
  },
  {
    name: 'promotion-ready may stop when commits are unavailable',
    summary: promotionReadySummary(false),
    expectedError: null,
  },
  {
    name: 'promotion-ready cannot stop when commits are allowed',
    summary: promotionReadySummary(true),
    expectedError: 'cannot remain unpublished when authorization.commits_allowed is true',
  },
  {
    name: 'promotion-ready requires a next action',
    summary: mutate(promotionReadySummary(false), (summary) => {
      delete summary.terminal_states[0].next_action
    }),
    expectedError: 'promotion_ready state requires non-empty "next_action"',
  },
  {
    name: 'published run cannot retain another promotion-ready terminal state',
    summary: mutate(published, (summary) => {
      summary.terminal_states.push({
        object_type: 'pack',
        object_id: 'pack_dangling_promotion',
        path: 'catalog/packs/candidates/.gitkeep',
        state: 'promotion_ready',
        owner: 'catalog-evaluation',
        reason: 'A second pack passed evaluation but was not promoted.',
        next_action: 'catalog-data',
      })
    }),
    expectedError: 'promotion_ready terminal state cannot remain when authorization.commits_allowed is true',
  },
  {
    name: 'non-pack terminal state does not invalidate exhausted target proof',
    summary: mutate(bounded, (summary) => {
      summary.terminal_states.push({
        object_type: 'analysis',
        object_id: 'analysis_not_selected',
        path: 'catalog/packs/candidates/.gitkeep',
        state: 'evaluated',
        owner: 'catalog-evaluation',
        reason: 'This public-readiness analysis was evaluated outside the publication target set.',
        evaluation_outcome: 'passed',
      })
    }),
    expectedError: null,
  },
  {
    name: 'no eligible targets proof passes with no attempted targets',
    summary: mutate(bounded, (summary) => {
      summary.terminal_states = [{
        object_type: 'report',
        object_id: 'publication_target_scan',
        path: 'catalog/packs/candidates/.gitkeep',
        state: 'no_op',
        owner: 'nightly-catalog-ops',
        reason: 'Candidate ranking found no pack eligible for a publication attempt.',
      }]
      summary.next_run_priorities = []
      summary.publication_progress.targets_attempted = []
      summary.publication_progress.no_publish_reason = {
        code: 'no_eligible_targets',
        summary: 'No candidate satisfied the target eligibility prerequisites.',
        evidence: ['Candidate ranking found no pack with complete evidence and current members.'],
      }
    }),
    expectedError: null,
  },
  {
    name: 'no eligible targets proof fails when a target was attempted',
    summary: mutate(bounded, (summary) => {
      summary.publication_progress.no_publish_reason.code = 'no_eligible_targets'
    }),
    expectedError: 'cannot be "no_eligible_targets" when targets were attempted',
  },
  {
    name: 'run threshold requires recovery mode',
    summary: recoveryTriggerSummary({ fullRuns: 3, days: 0, mode: 'normal' }),
    expectedError: 'mode must be "recovery"',
  },
  {
    name: 'day threshold requires recovery mode after a prior publication',
    summary: mutate(recoveryTriggerSummary({ fullRuns: 0, days: 7, mode: 'normal' }), (summary) => {
      summary.starting_state.catalog_counts.published_packs = 1
    }),
    expectedError: 'mode must be "recovery"',
  },
  {
    name: 'day threshold alone does not trigger recovery before the first publication',
    summary: recoveryTriggerSummary({ fullRuns: 0, days: 7, mode: 'normal' }),
    expectedError: null,
  },
  {
    name: 'run threshold permits recovery mode',
    summary: recoveryTriggerSummary({ fullRuns: 3, days: 0, mode: 'recovery' }),
    expectedError: null,
  },
  {
    name: 'recovery mode below both thresholds fails',
    summary: recoveryTriggerSummary({ fullRuns: 2, days: 6, mode: 'recovery' }),
    expectedError: 'requires at least 3 completed full runs or 7 days',
  },
  {
    name: 'invalid partial recovery evidence fails explicitly',
    summary: mutate(bounded, (summary) => {
      delete summary.publication_progress.recovery_trigger.completed_full_runs_since_publication
    }),
    expectedError: 'completed_full_runs_since_publication must be a non-negative integer',
  },
]

let failures = 0
for (const test of tests) {
  try {
    const errors = validateRunSummary(test.summary)
    if (test.expectedError === null) {
      assert.deepEqual(errors, [])
    } else {
      assert.ok(
        errors.some((error) => error.includes(test.expectedError)),
        `Expected an error containing "${test.expectedError}", got:\n${errors.join('\n')}`
      )
    }
    process.stdout.write(`ok - ${test.name}\n`)
  } catch (error) {
    failures += 1
    process.stderr.write(`not ok - ${test.name}\n${error.stack}\n`)
  }
}

for (const cli of ['check-terminal-states.mjs', 'check-run-report.mjs']) {
  try {
    assertCli(cli, published, true)
    assertCli(cli, tests[2].summary, false)
    process.stdout.write(`ok - ${cli} preserves success and failure JSON behavior\n`)
  } catch (error) {
    failures += 1
    process.stderr.write(`not ok - ${cli} preserves success and failure JSON behavior\n${error.stack}\n`)
  }
}

try {
  const missingPath = mutate(published, (summary) => {
    summary.terminal_states[0].object_id = 'pack_not_on_disk'
    summary.terminal_states[0].path = 'catalog/packs/published/pack_not_on_disk/pack.yaml'
    summary.publication_progress.targets_attempted[0].object_id = 'pack_not_on_disk'
  })
  assertCli('check-terminal-states.mjs', missingPath, true)
  const output = assertCli('check-run-report.mjs', missingPath, false)
  assert.ok(output.errors.some((error) => error.includes('does not exist on disk')))
  process.stdout.write('ok - report checker retains report-only disk path checks\n')
} catch (error) {
  failures += 1
  process.stderr.write(`not ok - report checker retains report-only disk path checks\n${error.stack}\n`)
}

try {
  rmSync(publishedPagePath)
  assertCli('check-terminal-states.mjs', published, true)
  const output = assertCli('check-run-report.mjs', published, false)
  assert.ok(output.errors.some((error) => error.includes('published pack public page') && error.includes('does not exist on disk')))
  process.stdout.write('ok - full report checker requires the rendered published pack page\n')
} catch (error) {
  failures += 1
  process.stderr.write(`not ok - full report checker requires the rendered published pack page\n${error.stack}\n`)
} finally {
  writeFileSync(publishedPagePath, '# Validator Fixture\n')
}

try {
  const invalidPriority = mutate(published, (summary) => {
    summary.next_run_priorities = [{
      priority: 1,
      object_id: 'pack_not_touched',
      action: 'Invalid back-reference.',
      owner: 'catalog-evaluation',
    }]
  })
  for (const cli of ['check-terminal-states.mjs', 'check-run-report.mjs']) {
    const output = assertCli(cli, invalidPriority, false)
    assert.ok(output.errors.some((error) => error.includes('is not in terminal_states')))
  }
  process.stdout.write('ok - both checkers retain next-run priority back-reference checks\n')
} catch (error) {
  failures += 1
  process.stderr.write(`not ok - both checkers retain next-run priority back-reference checks\n${error.stack}\n`)
}

try {
  const output = assertWriteCli(tests[2].summary)
  assert.ok(output.errors.some((error) => error.includes('publication_progress')))
  process.stdout.write('ok - write-run-report rejects invalid summaries before writing\n')
} catch (error) {
  failures += 1
  process.stderr.write(`not ok - write-run-report rejects invalid summaries before writing\n${error.stack}\n`)
}

if (failures > 0) {
  process.stderr.write(`${failures} focused nightly validator test(s) failed\n`)
  process.exit(1)
}

process.stdout.write(`${tests.length + 6} focused nightly validator tests passed\n`)

function readFixture(filename) {
  return JSON.parse(readFileSync(join(fixturesDir, filename), 'utf8'))
}

function setupPublishedArtifacts() {
  assert.equal(existsSync(publishedRecordDir), false, `${publishedRecordDir} already exists`)
  assert.equal(existsSync(publishedPageDir), false, `${publishedPageDir} already exists`)
  mkdirSync(publishedRecordDir, { recursive: true })
  mkdirSync(publishedPageDir, { recursive: true })
  writeFileSync(publishedRecordPath, [
    'schema_version: 1',
    `pack_id: ${publishedFixtureId}`,
    'name: Validator Fixture',
    'status: published',
    `domain: ${publishedFixtureDomain}`,
    '',
  ].join('\n'))
  writeFileSync(publishedPagePath, '# Validator Fixture\n')
}

function cleanupPublishedArtifacts() {
  rmSync(publishedRecordDir, { recursive: true, force: true })
  rmSync(publishedPageDir, { recursive: true, force: true })
}

function mutate(summary, mutation) {
  const copy = structuredClone(summary)
  mutation(copy)
  return copy
}

function promotionReadySummary(commitsAllowed) {
  return mutate(bounded, (summary) => {
    summary.authorization.mode = commitsAllowed ? 'commit' : 'local_write'
    summary.authorization.commits_allowed = commitsAllowed
    summary.authorization.pushes_allowed = false
    summary.terminal_states[0].state = 'promotion_ready'
    delete summary.terminal_states[0].evaluation_outcome
    summary.terminal_states[0].reason = 'Evaluation passed but publication requires commit authorization.'
    summary.terminal_states[0].next_action = 'catalog-data'
    summary.publication_progress.targets_attempted[0].attempts = [
      {
        attempt: 1,
        outcome: 'promotion_ready',
        evidence: 'Evaluation passed at 0.82; commit authorization determines publication.',
      },
    ]
    summary.publication_progress.targets_attempted[0].outcome = 'promotion_ready'
    summary.publication_progress.no_publish_reason = {
      code: 'blocked',
      summary: 'Publication cannot proceed without commit authorization.',
      evidence: ['The selected target passed evaluation and authorization.commits_allowed is false.'],
    }
  })
}

function recoveryTriggerSummary({ fullRuns, days, mode }) {
  return mutate(bounded, (summary) => {
    summary.publication_progress.mode = mode
    summary.publication_progress.recovery_trigger.completed_full_runs_since_publication = fullRuns
    summary.publication_progress.recovery_trigger.days_since_publication = days
  })
}

function assertCli(filename, summary, shouldPass) {
  const result = spawnSync(process.execPath, [join(scriptsDir, filename)], {
    input: JSON.stringify(summary),
    encoding: 'utf8',
  })
  const output = JSON.parse(result.stdout)
  assert.equal(result.status, shouldPass ? 0 : 2, result.stderr || result.stdout)
  assert.equal(output.ok, shouldPass)
  assert.ok(Array.isArray(output.errors))
  assert.equal(typeof output.counts, 'object')
  return output
}

function assertWriteCli(summary) {
  const result = spawnSync(process.execPath, [join(scriptsDir, 'write-run-report.mjs')], {
    input: JSON.stringify(summary),
    encoding: 'utf8',
  })
  const output = JSON.parse(result.stdout)
  assert.equal(result.status, 2, result.stderr || result.stdout)
  assert.equal(output.ok, false)
  assert.ok(Array.isArray(output.errors))
  return output
}
