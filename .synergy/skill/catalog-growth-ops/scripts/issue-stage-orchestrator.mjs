#!/usr/bin/env node
/**
* Deterministic Issue-stage orchestrator for Nightly Catalog v3.
*
* Two-phase CLI:
*   issue-stage-orchestrator.mjs --prepare --run-id <id> --workload <path>
*   issue-stage-orchestrator.mjs --finalize --run-id <id> --workload <path> --drafts <path> --output <path> [--apply]
*
* Programmatic exports accept explicit workload/output paths from the
* controller. No default catalog/runs paths are decided by this module.
* All exported functions accept injected exec/client functions for testing.
* gh auth/API failures are isolated — they never crash the Nightly and
* produce explicit reply_blocked diagnostics instead.
*/

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

import { assertCatalogId } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { createIssueLedgerStore } from '../../catalog-data/scripts/lib/issue-ledger-store.mjs'
import { TRUSTED_REPOSITORY } from './lib/issue-intake.mjs'
import { scanIssues } from './lib/issue-scan.mjs'
import { createGhIssueClient } from './lib/issue-github-client.mjs'
import { createGhIssueCommentRunner } from './lib/issue-comment-runner.mjs'
import { buildAssessmentFromFulfillment } from './lib/issue-assessment-writer.mjs'
import { ISSUE_REPLY_TEMPLATE_VERSION } from './lib/issue-assessment-writer.mjs'
import { runRestrictedIssueReply } from './lib/issue-reply-controller.mjs'
import { computeIssueIdentityFingerprint } from './lib/issue-response-ledger.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Path helpers for controller output — write to explicit paths only
function ensureDirAnywhere(p) { mkdirSync(resolve(p), { recursive: true }); return resolve(p) }
function writeAtomicAnywhere(p, content) { const abs = resolve(p); mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, content, 'utf8'); return abs }

// ---------------------------------------------------------------------------
// gh auth check — isolate failure
// ---------------------------------------------------------------------------

export function checkGhAuth(execFile = execFileSync) {
  try {
    execFile('gh', ['auth', 'status'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, authenticated: true, error: null }
  } catch (err) {
    const message = extractGhError(err)
    if (isGhNotFound(err)) {
      return { ok: false, authenticated: false, error: `gh CLI not available: ${message}` }
    }
    return { ok: true, authenticated: false, error: `gh auth check failed: ${message}` }
  }
}

function isGhNotFound(err) {
  if (err.code === 'ENOENT') return true
  const stderr = err.stderr ? String(err.stderr) : ''
  return /command not found|not found|not recognized/i.test(stderr)
}

function extractGhError(err) {
  if (err.stderr) {
    const stderr = String(err.stderr).trim()
    if (stderr) return stderr.split('\n')[0].slice(0, 200)
  }
  if (err.message) return err.message.slice(0, 200)
  return String(err).slice(0, 200)
}

// ---------------------------------------------------------------------------
// Prepare phase
// ---------------------------------------------------------------------------

/**
 * @param {object} opts
 * @param {string} opts.runId
 * @param {string} opts.workloadPath  — explicit path from controller (required)
 * @param {Function} [opts.execFile]
 * @param {object} [opts.storeOptions]
 * @returns {object}
 */
export function prepareIssueStage({
  runId,
  execFile = execFileSync,
  workloadPath,
  storeOptions = {},
}) {
  const errors = []
  const normalizedRunId = normalizeRunId(runId, errors)
  if (errors.length > 0) {
    return failPrepare(errors)
  }
  if (!workloadPath) {
    errors.push('workloadPath is required')
    return failPrepare(errors)
  }

  const ghAuth = checkGhAuth(execFile)
  const ghAvailable = ghAuth.ok && ghAuth.authenticated

  let fetchedIssues = []
  let fetchError = null
  if (ghAvailable) {
    try {
      const client = createGhIssueClient({ execFile })
      fetchedIssues = client.listOpenIssues()
    } catch (err) {
      fetchError = extractGhError(err)
    }
  }

  const snapshotComplete = ghAvailable && fetchError === null

  // Scan all fetched issues
  const scan = scanIssues(fetchedIssues, normalizedRunId)
  const acceptedResults = scan.results.filter((r) => r.intake_status === 'accepted')
  const rejectedResults = scan.results.filter((r) => r.intake_status !== 'accepted')

  // Bind canonical response records for each accepted issue
  const store = createIssueLedgerStore(storeOptions)
  const allCanonicalRecords = store.loadAllCanonicalResponses()
  const allAcceptedIssues = []
  for (const result of acceptedResults) {
    const issueRecords = allCanonicalRecords.filter((r) => r.issue_number === result.issue_number)
    allAcceptedIssues.push({
      issue_number: result.issue_number,
      intake: result.intake,
      canonical_records: issueRecords,
    })
  }

  ensureDirAnywhere(dirname(workloadPath))

  const workloadDoc = {
    schema_version: 1,
    kind: 'issue_workload',
    run_id: normalizedRunId,
    repository: TRUSTED_REPOSITORY,
    snapshot_complete: snapshotComplete,
    snapshot_diagnostics: !snapshotComplete
      ? (fetchError || ghAuth.error || 'gh not available')
      : null,
    gh_available: ghAvailable,
    gh_authenticated: ghAuth.authenticated,
    scan_summary: scan.summary,
    all_accepted_issues: allAcceptedIssues,
    rejected_issues: rejectedResults.map((r) => ({
      issue_number: r.issue_number,
      intake_status: r.intake_status,
      scan_error: r.scan_error,
    })),
  }

  const digest = computeStableDigest(workloadDoc)
  workloadDoc.workload_digest = digest
  workloadDoc.prepared_at = new Date().toISOString()

  writeAtomicAnywhere(workloadPath, JSON.stringify(workloadDoc, null, 2) + '\n')

  return {
    ok: true,
    snapshot_complete: snapshotComplete,
    snapshot_diagnostics: workloadDoc.snapshot_diagnostics,
    gh_available: ghAvailable,
    workload_digest: digest,
    scan: scan.summary,
    workload_path: workloadPath,
    workload_summary: {
      total_fetched: fetchedIssues.length,
      accepted: acceptedResults.length,
      rejected: rejectedResults.length,
      snapshot_complete: snapshotComplete,
    },
    errors: [],
  }
}

// ---------------------------------------------------------------------------
// Finalize phase
// ---------------------------------------------------------------------------

/**
 * @param {object} opts
 * @param {string} opts.runId
 * @param {string} opts.workloadPath
 * @param {string} opts.draftsPath
 * @param {string} opts.outputPath  — explicit output path from controller (required)
 * @param {boolean} [opts.apply=false]
 * @param {Function} [opts.execFile]
 * @param {Function} [opts.fetchCurrentIssue]   — overrides gh client for testing
 * @param {Function} [opts.commentRunner]       — overrides gh comment runner for testing
 * @param {object} [opts.storeOptions]
 * @returns {Promise<object>}
 */
export async function finalizeIssueStage({
  runId,
  workloadPath,
  draftsPath,
  outputPath,
  apply = false,
  execFile = execFileSync,
  fetchCurrentIssue = null,
  commentRunner = null,
  storeOptions = {},
}) {
  const errors = []
  const normalizedRunId = normalizeRunId(runId, errors)
  if (errors.length > 0) {
    return failFinalize(errors)
  }
  if (!outputPath) {
    errors.push('outputPath is required')
    return failFinalize(errors)
  }

  // 1. Load & validate workload
  let workload
  try {
    workload = JSON.parse(readFileSync(workloadPath, 'utf8'))
  } catch (err) {
    errors.push(`workload_read_failed: ${err.message}`)
    return failFinalize(errors)
  }
  const wlErrors = validateWorkloadFull(workload, normalizedRunId)
  if (wlErrors.length > 0) {
    return failFinalize(wlErrors)
  }

  // 2. Early fail for incomplete snapshot
  if (workload.snapshot_complete !== true) {
    const stage = buildIncompleteStage(workload)
    try {
      ensureDirAnywhere(dirname(outputPath))
      writeAtomicAnywhere(outputPath, JSON.stringify(stage, null, 2) + '\n')
    } catch (err) { errors.push(`output_write_failed: ${err.message}`) }
    return {
      ok: true,
      snapshot_complete: false,
      stages_issues: stage,
      diagnostics: [`snapshot incomplete: ${workload.snapshot_diagnostics || 'unknown'}`],
      output_path: outputPath,
      errors,
    }
  }

  // 3. Load & validate semantic drafts
  let draftsDoc
  try {
    draftsDoc = JSON.parse(readFileSync(draftsPath, 'utf8'))
  } catch (err) {
    errors.push(`drafts_read_failed: ${err.message}`)
    return failFinalize(errors)
  }
  const draftsByIssue = validateDraftsComplete(draftsDoc, workload, errors)
  if (errors.length > 0) {
    return failFinalize(errors)
  }

  // 4. Instantiate production gh client/runner ONCE (defect #1 fix)
  const ghClient = fetchCurrentIssue ? null : createGhIssueClient({ execFile })
  const ghCommentRunner = commentRunner ? null : createGhIssueCommentRunner({ execFile })

  const effectiveFetch = fetchCurrentIssue || (({ issueNumber }) => {
    return ghClient.fetchIssue({ repository: TRUSTED_REPOSITORY, issueNumber })
  })
  const effectiveCommentRunner = commentRunner || (({ issueNumber, body }) => {
    return ghCommentRunner({ repository: TRUSTED_REPOSITORY, issueNumber, body })
  })

  // Process each accepted issue
  const store = createIssueLedgerStore(storeOptions)
  const canonicalRecords = store.loadAllCanonicalResponses()
  const assessments = []
  const stageErrors = []

  for (const wlIssue of workload.all_accepted_issues) {
    const issueNumber = wlIssue.issue_number
    const intake = wlIssue.intake
    const draft = draftsByIssue.get(issueNumber)

    // Build canonical assessment (MUST succeed — draft is validated)
    let assessmentRecord
    try {
      const result = buildAssessmentFromFulfillment({
        intake,
        fulfillmentAssessment: draft.fulfillment_assessment,
        evidenceIndex: draft.evidence_index,
        publicEvidenceBoundary: draft.public_evidence_boundary,
        runId: normalizedRunId,
        notes: draft.notes,
      })
      assessmentRecord = result.record
    } catch (err) {
      errors.push(`issue #${issueNumber}: assessment build failed — ${err.message}`)
      return failFinalize(errors)
    }

    // Run restricted reply
    let replyResult
    try {
      replyResult = await runRestrictedIssueReply({
        intake,
        assessment: assessmentRecord,
        canonicalRecords,
        fetchCurrentIssue: effectiveFetch,
        commentRunner: effectiveCommentRunner,
        apply,
        persistCanonical: (rec) => store.persistCanonicalResponse(rec),
      })
    } catch (err) {
      stageErrors.push(`issue #${issueNumber}: reply crashed — ${err.message}`)
      try {
        store.persistCanonicalResponse({
          schema_version: 3,
          kind: 'canonical_issue_response',
          response_id: `cir_n${issueNumber}_reply_blocked_${'0'.repeat(16)}`,
          repository: TRUSTED_REPOSITORY,
          issue_number: issueNumber,
          template_version: ISSUE_REPLY_TEMPLATE_VERSION,
          response_variant: 'reply_blocked',
          content_digest: intake.issue_binding.content_digest,
          comment_id: null,
          assessment_digest: null,
          dedup_fingerprint: computeIssueIdentityFingerprint({
            issueNumber, contentDigest: intake.issue_binding.content_digest,
            templateVersion: ISSUE_REPLY_TEMPLATE_VERSION,
          }),
          created_at: new Date().toISOString(),
          notes: `reply crashed: ${err.message}`,
        })
      } catch { /* non-fatal */ }
      assessments.push({
        issue_number: issueNumber,
        intake,
        assessment: assessmentRecord,
        reply: { status: 'reply_blocked', posted: false, comment_id: null },
      })
      continue
    }

    assessments.push({
      issue_number: issueNumber,
      intake,
      assessment: assessmentRecord,
      reply: {
        status: replyResult.status,
        posted: replyResult.posted ?? false,
        comment_id: replyResult.comment_id ?? null,
      },
    })
  }

  // Build stages.issues
  const rejectedEntries = buildRejectedEntries(workload.rejected_issues)
  const allAssessments = [...assessments, ...rejectedEntries]

  const scanTotal = workload.scan_summary.total_scanned
  const acceptedCount = assessments.length
  const blockedCount = assessments.filter((a) =>
    ['held_for_review', 'reply_blocked', 'blocked'].includes(a.reply.status),
  ).length
  const fulfilledCount = assessments.filter((a) =>
    ['posted', 'dry_run', 'draft', 'duplicate', 'no_action'].includes(a.reply.status),
  ).length
  const openCount = acceptedCount - blockedCount - fulfilledCount
  const rejectedBlocked = rejectedEntries.length

  const stagesIssues = {
    all_open_issues_processed: true,
    scan: {
      total: scanTotal,
      by_state: {
        open: openCount,
        acknowledged: 0,
        fulfilled: fulfilledCount,
        blocked: blockedCount + rejectedBlocked,
      },
    },
    assessments: allAssessments,
  }

  // Write output to explicit path
  try {
    ensureDirAnywhere(dirname(outputPath))
    writeAtomicAnywhere(outputPath, JSON.stringify(stagesIssues, null, 2) + '\n')
  } catch (err) { errors.push(`output_write_failed: ${err.message}`) }

  return {
    ok: true,
    stages_issues: stagesIssues,
    diagnostics: stageErrors,
    output_path: outputPath,
    errors,
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function computeStableDigest(doc) {
  const stable = {
    run_id: doc.run_id,
    repository: doc.repository,
    snapshot_complete: doc.snapshot_complete,
    snapshot_diagnostics: doc.snapshot_diagnostics,
    gh_available: doc.gh_available,
    gh_authenticated: doc.gh_authenticated,
    scan_summary: {
      total_scanned: doc.scan_summary?.total_scanned,
      accepted: doc.scan_summary?.accepted,
      rejected: doc.scan_summary?.rejected,
      run_id: doc.scan_summary?.run_id,
    },
    all_accepted_issues: doc.all_accepted_issues.map((iss) => ({
      issue_number: iss.issue_number,
      content_digest: iss.intake?.issue_binding?.content_digest ?? null,
      updated_at: iss.intake?.issue_binding?.updated_at ?? null,
    })),
    rejected_issues: doc.rejected_issues.map((r) => ({
      issue_number: r.issue_number,
      intake_status: r.intake_status,
    })),
  }
  return `sha256:${createHash('sha256').update(canonicalStringify(stable)).digest('hex')}`
}

function canonicalStringify(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalStringify(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function normalizeRunId(runId, errors) {
  try {
    return assertCatalogId('run', runId)
  } catch (err) {
    errors.push(`invalid_run_id: ${err.message}`)
    return null
  }
}

function validateWorkloadFull(workload, expectedRunId) {
  const errors = []
  if (!workload || typeof workload !== 'object') {
    return ['workload_invalid: must be a non-null object']
  }
  if (workload.kind !== 'issue_workload') errors.push('workload_invalid: kind must be "issue_workload"')
  if (workload.run_id !== expectedRunId) errors.push(`workload_invalid: run_id mismatch — workload=${workload.run_id} requested=${expectedRunId}`)
  if (workload.repository !== TRUSTED_REPOSITORY) errors.push(`workload_invalid: repository must be ${TRUSTED_REPOSITORY}`)
  if (typeof workload.snapshot_complete !== 'boolean') errors.push('workload_invalid: snapshot_complete must be a boolean')
  if (!workload.workload_digest || !/^sha256:[a-f0-9]{64}$/u.test(workload.workload_digest)) {
    errors.push('workload_invalid: workload_digest must be a sha256 digest')
  } else {
    const expected = computeStableDigest(workload)
    if (workload.workload_digest !== expected) {
      errors.push(`workload_invalid: workload_digest mismatch — expected=${expected} got=${workload.workload_digest}`)
    }
  }
  if (!Array.isArray(workload.all_accepted_issues)) errors.push('workload_invalid: all_accepted_issues must be an array')
  if (!Array.isArray(workload.rejected_issues)) errors.push('workload_invalid: rejected_issues must be an array')
  return errors
}

function validateDraftsComplete(draftsDoc, workload, errors) {
  if (!draftsDoc || typeof draftsDoc !== 'object') {
    errors.push('drafts_invalid: must be a non-null object')
    return new Map()
  }
  if (draftsDoc.schema_version !== 1) errors.push('drafts_invalid: schema_version must be 1')
  if (draftsDoc.kind !== 'issue_semantic_drafts') errors.push('drafts_invalid: kind must be "issue_semantic_drafts"')
  if (draftsDoc.run_id !== workload.run_id) {
    errors.push(`drafts_invalid: run_id mismatch — drafts=${draftsDoc.run_id} workload=${workload.run_id}`)
  }
  if (draftsDoc.workload_digest !== workload.workload_digest) {
    errors.push(`drafts_invalid: workload_digest mismatch`)
  }
  if (!Array.isArray(draftsDoc.drafts)) {
    errors.push('drafts_invalid: drafts must be an array')
    return new Map()
  }

  if (errors.length > 0) return new Map()

  const map = new Map()
  const seenNumbers = new Set()
  for (const draft of draftsDoc.drafts) {
    if (!Number.isInteger(draft.issue_number) || draft.issue_number <= 0) {
      errors.push('drafts_invalid: draft has invalid issue_number')
      continue
    }
    if (seenNumbers.has(draft.issue_number)) {
      errors.push(`drafts_invalid: duplicate draft for issue #${draft.issue_number}`)
      continue
    }
    seenNumbers.add(draft.issue_number)

    // Every draft must have exact issue_binding (defect #2)
    const binding = draft.issue_binding
    if (!binding || typeof binding !== 'object') {
      errors.push(`drafts_invalid: draft for #${draft.issue_number} missing issue_binding`)
      continue
    }
    if (binding.repository !== TRUSTED_REPOSITORY) {
      errors.push(`drafts_invalid: draft for #${draft.issue_number} has wrong repository`)
    }
    if (binding.issue_number !== draft.issue_number) {
      errors.push(`drafts_invalid: draft for #${draft.issue_number} has issue_number mismatch in binding`)
    }
    if (!binding.content_digest || !/^sha256:[a-f0-9]{64}$/u.test(binding.content_digest)) {
      errors.push(`drafts_invalid: draft for #${draft.issue_number} has invalid content_digest`)
    }
    if (!isTimestamp(binding.updated_at)) {
      errors.push(`drafts_invalid: draft for #${draft.issue_number} has invalid updated_at`)
    }

    map.set(draft.issue_number, draft)
  }

  if (errors.length > 0) return map

  // Exactly one draft for every accepted issue, no extras (defect #3)
  const workloadIssueNumbers = new Set(workload.all_accepted_issues.map((iss) => iss.issue_number))
  for (const wlNum of workloadIssueNumbers) {
    if (!map.has(wlNum)) {
      errors.push(`drafts_invalid: missing draft for accepted issue #${wlNum}`)
    }
  }
  for (const draftNum of map.keys()) {
    if (!workloadIssueNumbers.has(draftNum)) {
      errors.push(`drafts_invalid: draft for unknown issue #${draftNum} (not in workload)`)
    }
  }

  // Verify each draft's binding matches workload intake
  if (errors.length === 0) {
    for (const wlIssue of workload.all_accepted_issues) {
      const draft = map.get(wlIssue.issue_number)
      const intake = wlIssue.intake
      if (draft.issue_binding.content_digest !== intake.issue_binding.content_digest) {
        errors.push(`drafts_invalid: draft for #${wlIssue.issue_number} content_digest does not match workload intake`)
      }
      if (draft.issue_binding.updated_at !== intake.issue_binding.updated_at) {
        errors.push(`drafts_invalid: draft for #${wlIssue.issue_number} updated_at does not match workload intake`)
      }
    }
  }

  return map
}

function buildRejectedEntries(rejectedIssues) {
  if (!Array.isArray(rejectedIssues)) return []
  return rejectedIssues.map((r) => ({
    issue_number: r.issue_number ?? null,
    intake: null,
    assessment: null,
    reply: {
      status: 'reply_blocked',
      posted: false,
      comment_id: null,
    },
    scan_error: r.scan_error ?? { status: r.intake_status ?? 'rejected_schema', message: 'Issue rejected at intake' },
  }))
}

function buildIncompleteStage(workload) {
  const rejectedEntries = buildRejectedEntries(workload.rejected_issues || [])
  const total = (workload.scan_summary?.total_scanned || 0)
  return {
    all_open_issues_processed: false,
    scan: {
      total,
      by_state: {
        open: 0,
        acknowledged: 0,
        fulfilled: 0,
        blocked: total,
      },
    },
    assessments: rejectedEntries,
  }
}

function failPrepare(errors) {
  return {
    ok: false,
    snapshot_complete: false,
    snapshot_diagnostics: null,
    gh_available: false,
    workload_digest: null,
    scan: null,
    workload_path: null,
    workload_summary: null,
    errors,
  }
}

function failFinalize(errors) {
  return {
    ok: false,
    snapshot_complete: null,
    stages_issues: null,
    diagnostics: [],
    output_path: null,
    errors,
  }
}

function isTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(value)
    && !Number.isNaN(Date.parse(value))
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const VALID_FLAGS = new Set([
  '--prepare', '--finalize', '--workload', '--drafts', '--apply', '--run-id', '--output',
])

function parseArgs(argv) {
  const opts = {
    mode: null,
    workload: null,
    drafts: null,
    apply: false,
    runId: null,
    outputPath: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--') && !VALID_FLAGS.has(arg)) {
      throw new Error(`unknown flag: ${arg}`)
    }
    switch (arg) {
      case '--prepare': opts.mode = 'prepare'; break
      case '--finalize': opts.mode = 'finalize'; break
      case '--workload': opts.workload = argv[++i]; break
      case '--drafts': opts.drafts = argv[++i]; break
      case '--apply': opts.apply = true; break
      case '--run-id': opts.runId = argv[++i]; break
      case '--output': opts.outputPath = argv[++i]; break
    }
  }
  return opts
}

function main(args = process.argv.slice(2)) {
  let opts
  try {
    opts = parseArgs(args)
  } catch (err) {
    process.stderr.write(`issue-stage-orchestrator: ${err.message}\n`)
    process.exit(1)
  }

  if (!opts.mode) {
    process.stderr.write('issue-stage-orchestrator: --prepare or --finalize is required\n')
    process.exit(1)
  }

  if (opts.mode === 'prepare') {
    const runId = opts.runId || null
    if (!runId) {
      process.stderr.write('issue-stage-orchestrator: --run-id is required for --prepare\n')
      process.exit(1)
    }
    const wlPath = opts.workload || null
    if (!wlPath) {
      process.stderr.write('issue-stage-orchestrator: --workload is required for --prepare\n')
      process.exit(1)
    }

    const result = prepareIssueStage({ runId, workloadPath: wlPath })
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    if (!result.ok) process.exit(1)
    return
  }

  if (opts.mode === 'finalize') {
    if (!opts.workload || !opts.drafts) {
      process.stderr.write('issue-stage-orchestrator: --workload and --drafts are required for --finalize\n')
      process.exit(1)
    }
    const runId = opts.runId || null
    if (!runId) {
      process.stderr.write('issue-stage-orchestrator: --run-id is required for --finalize\n')
      process.exit(1)
    }
    const outPath = opts.outputPath || null
    if (!outPath) {
      process.stderr.write('issue-stage-orchestrator: --output is required for --finalize\n')
      process.exit(1)
    }

    finalizeIssueStage({
      runId,
      workloadPath: opts.workload,
      draftsPath: opts.drafts,
      apply: opts.apply,
      outputPath: outPath,
    }).then((result) => {
      process.stdout.write(JSON.stringify({
        ok: result.ok,
        stages_issues: result.stages_issues ? { ...result.stages_issues, assessments: `[${result.stages_issues.assessments.length} entries]` } : null,
        diagnostics: result.diagnostics,
        errors: result.errors,
      }, null, 2) + '\n')
      process.exit(result.ok ? 0 : 1)
    }).catch((err) => {
      process.stderr.write(`issue-stage-orchestrator: finalize crashed: ${err.message}\n`)
      process.exit(1)
    })
    return
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/issue-stage-orchestrator.mjs')
if (isMain) {
  main()
}
