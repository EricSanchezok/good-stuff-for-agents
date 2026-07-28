#!/usr/bin/env node
import assert from 'node:assert/strict'

import {
  classifyFetchError,
  classifySourceSyncError,
  isBatchProviderIncident,
  extractHttpStatus,
  SourceSyncError,
} from './lib/http-error-classifier.mjs'
import { syncApprovedSources } from './sync-sources-lib.mjs'

const tests = []
function test(name, run) { tests.push({ name, run }) }

// ---------------------------------------------------------------------------
// classifyFetchError
// ---------------------------------------------------------------------------
test('401 is provider_incident, does not increment failures', () => {
  const result = classifyFetchError({ status: 401, body: 'Unauthorized', url: null })
  assert.equal(result.category, 'provider_incident')
  assert.equal(result.incrementsFailures, false)
})

test('429 is provider_incident, does not increment failures', () => {
  const result = classifyFetchError({ status: 429, body: '', url: null })
  assert.equal(result.category, 'provider_incident')
  assert.equal(result.incrementsFailures, false)
})

test('generic 403 is provider_incident', () => {
  const result = classifyFetchError({ status: 403, body: 'API rate limit exceeded', url: null })
  assert.equal(result.category, 'provider_incident')
  assert.equal(result.incrementsFailures, false)
})

test('targeted 403 (terms of service) is source_failure', () => {
  const result = classifyFetchError({ status: 403, body: 'Repository access is disabled due to terms of service violation.', url: null })
  assert.equal(result.category, 'source_failure')
  assert.equal(result.incrementsFailures, true)
})

test('404 is source_failure, increments failures', () => {
  const result = classifyFetchError({ status: 404, body: 'Not Found', url: null })
  assert.equal(result.category, 'source_failure')
  assert.equal(result.incrementsFailures, true)
})

test('5xx are provider_incident', () => {
  for (const status of [500, 502, 503]) {
    const result = classifyFetchError({ status, body: '', url: null })
    assert.equal(result.category, 'provider_incident', `status ${status}`)
    assert.equal(result.incrementsFailures, false)
  }
})

test('null status is provider_incident (transport)', () => {
  const result = classifyFetchError({ status: null, body: '', url: null })
  assert.equal(result.category, 'provider_incident')
  assert.equal(result.incrementsFailures, false)
})

// ---------------------------------------------------------------------------
// classifySourceSyncError + SourceSyncError
// ---------------------------------------------------------------------------
test('SourceSyncError with 404 is source_failure', () => {
  const err = new SourceSyncError(404, 'Not Found', 'Not Found')
  const result = classifySourceSyncError({ error: err, sourceId: 'src_x' })
  assert.equal(result.category, 'source_failure')
  assert.equal(result.incrementsFailures, true)
  assert.equal(result.status, 404)
})

test('SourceSyncError with 403 provider-level is provider_incident', () => {
  const err = new SourceSyncError(403, 'Forbidden', '')
  const result = classifySourceSyncError({ error: err, sourceId: 'src_x' })
  assert.equal(result.category, 'provider_incident')
  assert.equal(result.incrementsFailures, false)
})

test('transport/timeout error is provider_incident', () => {
  const err = new Error('fetch transport error: ETIMEDOUT')
  const result = classifySourceSyncError({ error: err, sourceId: 'src_x' })
  assert.equal(result.category, 'provider_incident')
  assert.equal(result.incrementsFailures, false)
})

test('content/parse error is source_failure', () => {
  const err = new Error('invalid JSON response: unexpected token')
  const result = classifySourceSyncError({ error: err, sourceId: 'src_x' })
  assert.equal(result.category, 'source_failure')
  assert.equal(result.incrementsFailures, true)
})

test('isBatchProviderIncident detection', () => {
  const all403 = [
    { category: 'provider_incident', status: 403, source_id: 'a' },
    { category: 'provider_incident', status: 403, source_id: 'b' },
  ]
  assert.equal(isBatchProviderIncident(all403), true)

  const mixed = [
    { category: 'provider_incident', status: 403, source_id: 'a' },
    { category: 'source_failure', status: 404, source_id: 'b' },
  ]
  assert.equal(isBatchProviderIncident(mixed), false)
  assert.equal(isBatchProviderIncident([]), false)
})

// ---------------------------------------------------------------------------
// syncApprovedSources integration: 17×403 → 0 per-source writes
// ---------------------------------------------------------------------------
test('17x403 provider incidents: 0 writeSourceRecord calls, 1 provider incident aggregate', async () => {
  const sources = Array.from({ length: 17 }, (_, i) => ({
    source_id: `src_pi_${String(i).padStart(2, '0')}`,
    status: 'active',
    url: `https://github.com/test/repo${i}`,
    state: { consecutive_failures: 0 },
  }))

  let writeSourceRecordCalls = 0
  let writeSnapshotCalls = 0

  const fetchFn = async () => {
    throw new SourceSyncError(403, 'Forbidden', '')
  }

  const summary = await syncApprovedSources({
    sources,
    fetchFn,
    writeSourceRecord: () => { writeSourceRecordCalls++ },
    writeSnapshot: () => { writeSnapshotCalls++ },
  })

  assert.equal(writeSourceRecordCalls, 0, 'no per-source record writes for provider incidents')
  assert.equal(writeSnapshotCalls, 0, 'no snapshots for provider incidents')
  assert.equal(summary.provider_blocked, 17, 'all 17 are provider_blocked')
  assert.equal(summary.source_failed, 0, 'zero source_failed')
  assert.equal(summary.refreshed, 0)
  // Aggregated: 17 sources → 1 incident
  assert.equal(summary.provider_incidents.length, 1, '17 sources aggregated into 1 provider incident')
  assert.equal(summary.provider_incidents[0].affected_count, 17)
  assert.equal(summary.provider_incidents[0].status, 403)
  assert.equal(summary.provider_incidents[0].provider, 'github')
})

// ---------------------------------------------------------------------------
// Single 404: only one source written (others are provider incidents)
// ---------------------------------------------------------------------------
test('single 404 only writes one source record', async () => {
  const sources = [
    { source_id: 'src_pi_a', status: 'active', url: 'https://github.com/test/a', state: { consecutive_failures: 0 } },
    { source_id: 'src_404', status: 'active', url: 'https://github.com/test/nope', state: { consecutive_failures: 0 } },
    { source_id: 'src_pi_b', status: 'active', url: 'https://github.com/test/b', state: { consecutive_failures: 0 } },
  ]

  const recordsWritten = []

  const fetchFn = async (url) => {
    if (url.includes('/nope')) throw new SourceSyncError(404, 'Not Found', 'Not Found')
    throw new SourceSyncError(403, 'Forbidden', '')
  }

  const summary = await syncApprovedSources({
    sources,
    fetchFn,
    writeSourceRecord: (rec) => { recordsWritten.push(rec) },
    writeSnapshot: () => {},
  })

  assert.equal(summary.source_failed, 1, 'only one source_failed')
  assert.equal(summary.provider_blocked, 2, 'two provider_blocked')

  const src404Records = recordsWritten.filter((r) => r.source_id === 'src_404')
  assert.equal(src404Records.length, 1, 'only src_404 gets a per-source write')
  assert.equal(recordsWritten.length, 1, 'exactly 1 per-source write total')
})

// ---------------------------------------------------------------------------
// Mixed: 17×403 + 1×404
// ---------------------------------------------------------------------------
test('mixed 17x403 + 1x404: counts accurate, only 404 gets per-source write', async () => {
  const sources = []
  for (let i = 0; i < 17; i++) {
    sources.push({ source_id: `src_pi_${i}`, status: 'active', url: 'https://github.com/test/pi', state: { consecutive_failures: 0 } })
  }
  sources.push({ source_id: 'src_404', status: 'active', url: 'https://github.com/test/nope', state: { consecutive_failures: 0 } })

  const recordsWritten = []

  const fetchFn = async (url) => {
    if (url.includes('/nope')) throw new SourceSyncError(404, 'Not Found', 'Not Found')
    throw new SourceSyncError(403, 'Forbidden', '')
  }

  const summary = await syncApprovedSources({
    sources,
    fetchFn,
    writeSourceRecord: (rec) => { recordsWritten.push(rec) },
    writeSnapshot: () => {},
  })

  assert.equal(summary.provider_blocked, 17)
  assert.equal(summary.source_failed, 1)

  const src404Records = recordsWritten.filter((r) => r.source_id === 'src_404')
  assert.equal(src404Records.length, 1, 'only src_404 should have a per-source write')
  assert.equal(recordsWritten.length, 1, 'exactly 1 per-source write total')
})

// ---------------------------------------------------------------------------
// extractHttpStatus
// ---------------------------------------------------------------------------
test('extractHttpStatus from various error shapes', () => {
  assert.equal(extractHttpStatus(new SourceSyncError(404, 'x', null)), 404)
  assert.equal(extractHttpStatus(new Error('Connection timeout')), null)
  assert.equal(extractHttpStatus(new Error('HTTP 429: rate limit')), 429)
})

// ---------------------------------------------------------------------------
// Inactive sources are not attempted
// ---------------------------------------------------------------------------
test('inactive sources are skipped', async () => {
  const sources = [
    { source_id: 'src_active', status: 'active', url: 'https://github.com/test/ok', state: { consecutive_failures: 0 } },
    { source_id: 'src_inactive', status: 'deprecated', url: 'https://github.com/test/old', state: { consecutive_failures: 0 } },
  ]

  const recordsWritten = []

  const fetchFn = async () => ({ default_branch: 'main' })
  // Branch call will throw but we only test that inactive is not attempted

  const summary = await syncApprovedSources({
    sources,
    fetchFn,
    writeSourceRecord: (rec) => { recordsWritten.push(rec) },
    writeSnapshot: () => {},
  })

  assert.equal(summary.inactive, 1)
  // No record for inactive source
  assert.ok(!recordsWritten.some((r) => r.source_id === 'src_inactive'))
})

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
let failures = 0
for (const current of tests) {
  try {
    await current.run()
    process.stdout.write(`ok - ${current.name}\n`)
  } catch (error) {
    failures++
    process.stderr.write(`not ok - ${current.name}\n${error.stack}\n`)
  }
}
if (failures > 0) {
  process.stderr.write(`${failures}/${tests.length} HTTP error classifier test(s) failed\n`)
  process.exit(1)
}
process.stdout.write(`${tests.length} HTTP error classifier tests passed\n`)
