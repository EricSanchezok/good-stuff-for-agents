import { createHash } from 'node:crypto'
import { normalizeIssueIntake } from './issue-intake.mjs'

export function scanIssues(issues, runId) {
  const errors = []
  if (typeof runId !== 'string' || !runId.startsWith('run_')) {
    errors.push('runId must start with run_')
  }
  if (!Array.isArray(issues)) {
    errors.push('issues must be an array')
    return { ok: false, errors, results: [] }
  }
  const results = []
  const seenIssueNumbers = new Set()
  for (const raw of issues) {
    try {
      const issueNumber = extractIssueNumber(raw)
      const issueState = raw?.issue?.state ?? raw?.state
      if (typeof issueState !== 'string' || issueState.toLowerCase() !== 'open') {
        throw Object.assign(new Error('nightly Issue scan only accepts open Issues'), { status: 'rejected_schema' })
      }
      const intake = normalizeIssueIntake(raw)
      if (seenIssueNumbers.has(intake.issue_binding.issue_number)) {
        throw Object.assign(new Error(`duplicate Issue number in scan: ${intake.issue_binding.issue_number}`), { status: 'rejected_schema' })
      }
      seenIssueNumbers.add(intake.issue_binding.issue_number)
      results.push({
        issue_number: intake.issue_binding.issue_number,
        intake_status: 'accepted',
        intake,
        scan_error: null,
      })
    } catch (err) {
      const issueNumber = extractIssueNumber(raw)
      results.push({
        issue_number: issueNumber,
        intake_status: err.status ?? 'rejected_schema',
        intake: null,
        scan_error: { status: err.status ?? 'rejected_schema', message: err.message },
      })
    }
  }

  const acceptedCount = results.filter((r) => r.intake_status === 'accepted').length
  const scanDigest = computeScanDigest(results, runId)

  return {
    ok: errors.length === 0,
    errors,
    results,
    summary: {
      total_scanned: results.length,
      accepted: acceptedCount,
      rejected: results.length - acceptedCount,
      run_id: runId,
      scanned_at: new Date().toISOString(),
      scan_digest: scanDigest,
    },
  }
}

function extractIssueNumber(raw) {
  if (raw?.issue?.number && Number.isInteger(raw.issue.number) && raw.issue.number > 0) {
    return raw.issue.number
  }
  if (raw?.number && Number.isInteger(raw.number) && raw.number > 0) {
    return raw.number
  }
  return null
}

function computeScanDigest(results, runId) {
  const canonical = results.map((r) => ({
    issue_number: r.issue_number,
    status: r.intake_status,
    digest: r.intake?.issue_binding?.content_digest ?? null,
    updated_at: r.intake?.issue_binding?.updated_at ?? null,
  }))
  return `sha256:${createHash('sha256').update(JSON.stringify({ run_id: runId, results: canonical })).digest('hex')}`
}
