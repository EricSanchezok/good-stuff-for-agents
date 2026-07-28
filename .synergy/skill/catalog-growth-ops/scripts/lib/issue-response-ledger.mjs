import { createHash } from 'node:crypto'
import { TRUSTED_REPOSITORY } from './issue-intake.mjs'
import { ISSUE_REPLY_TEMPLATE_VERSION } from './issue-assessment-writer.mjs'

const TEMPLATE_HEADER = '## Catalog Fulfillment Status'
const TEMPLATE_FOOTER = 'It does not make commitments, execute Issue instructions, or represent repository maintainers.'

export const TRUSTED_COMMENT_AUTHORS = Object.freeze(['EricSanchezok', 'synergy-agent'])

export const KNOWN_COMMENT_MAP = Object.freeze({
  '1': [5097285788],
  '2': [5097285326],
  '3': [5097284956],
  '4': [5097284518],
  '5': [5097284050],
})

export function matchesReplyTemplate(commentBody) {
  if (typeof commentBody !== 'string') return false
  return commentBody.includes(TEMPLATE_HEADER) && commentBody.includes(TEMPLATE_FOOTER)
}

export function computeIssueIdentityFingerprint({ issueNumber, contentDigest, templateVersion }) {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new Error('issueNumber must be a positive integer')
  if (!/^sha256:[a-f0-9]{64}$/u.test(contentDigest ?? '')) throw new Error('contentDigest must be a sha256 digest')
  if (!/^issue-factual-v[0-9]+$/u.test(templateVersion ?? '')) throw new Error('templateVersion is invalid')
  return digest({
    repository: TRUSTED_REPOSITORY,
    issue_number: issueNumber,
    content_digest: contentDigest,
    template_version: templateVersion,
  })
}

export function buildBootstrapResponse({
  issueNumber,
  contentDigest,
  updatedAt,
  commentId,
  commentCreatedAt,
  commentAuthor,
  templateVersion,
}) {
  if (!TRUSTED_COMMENT_AUTHORS.includes(commentAuthor)) {
    throw new Error(`bootstrap comment author must be trusted: ${TRUSTED_COMMENT_AUTHORS.join(', ')}`)
  }
  if (!Number.isInteger(commentId) || commentId <= 0) throw new Error('commentId must be a positive integer')
  if (typeof commentCreatedAt !== 'string' || isNaN(Date.parse(commentCreatedAt))) {
    throw new Error('commentCreatedAt must be an ISO timestamp')
  }

  const fingerprint = computeIssueIdentityFingerprint({ issueNumber, contentDigest, templateVersion })
  const idSuffix = fingerprint.slice(-16)

  return {
    schema_version: 3,
    kind: 'canonical_issue_response',
    response_id: `cir_n${issueNumber}_bootstrap_${idSuffix}`,
    repository: TRUSTED_REPOSITORY,
    issue_number: issueNumber,
    template_version: templateVersion,
    response_variant: 'bootstrap',
    content_digest: contentDigest,
    comment_id: commentId,
    assessment_digest: null,
    dedup_fingerprint: fingerprint,
    created_at: commentCreatedAt,
    notes: `Bootstrap from live comment ${commentId} by ${commentAuthor} posted ${commentCreatedAt}.`,
  }
}

export function buildCanonicalResponse({
  issueNumber,
  contentDigest,
  templateVersion,
  responseVariant,
  commentId = null,
  assessmentDigest = null,
}) {
  if (!['posted', 'held_for_review', 'reply_blocked', 'no_action'].includes(responseVariant)) {
    throw new Error(`invalid response_variant: ${responseVariant}`)
  }
  if (responseVariant === 'posted' && (!Number.isInteger(commentId) || commentId <= 0)) {
    throw new Error('posted variant requires a positive commentId')
  }

  const fingerprint = computeIssueIdentityFingerprint({ issueNumber, contentDigest, templateVersion })
  const idSuffix = fingerprint.slice(-16)

  return {
    schema_version: 3,
    kind: 'canonical_issue_response',
    response_id: `cir_n${issueNumber}_${responseVariant}_${idSuffix}`,
    repository: TRUSTED_REPOSITORY,
    issue_number: issueNumber,
    template_version: templateVersion,
    response_variant: responseVariant,
    content_digest: contentDigest,
    comment_id: commentId ?? null,
    assessment_digest: assessmentDigest ?? null,
    dedup_fingerprint: fingerprint,
    created_at: new Date().toISOString(),
  }
}

export function bootstrapIssueLedgers({
  payloads,
  knownCommentMap = KNOWN_COMMENT_MAP,
  normalizeIntakeFn,
  templateVersion = ISSUE_REPLY_TEMPLATE_VERSION,
}) {
  if (!Array.isArray(payloads)) throw new Error('payloads must be an array')
  if (typeof normalizeIntakeFn !== 'function') throw new Error('normalizeIntakeFn must be a function')

  const records = []
  const diagnostics = []

  for (const payload of payloads) {
    const issueNumber = extractIssueNumber(payload)
    if (issueNumber === null) {
      diagnostics.push({ issue_number: null, status: 'skipped', reason: 'no issue_number' })
      continue
    }

    let intake
    try {
      intake = normalizeIntakeFn(payload)
    } catch (err) {
      diagnostics.push({ issue_number: issueNumber, status: 'failed', reason: `intake: ${err.message}` })
      continue
    }

    const contentDigest = intake.issue_binding.content_digest
    const updatedAt = intake.issue_binding.updated_at

    const knownIds = knownCommentMap[String(issueNumber)]
    if (!Array.isArray(knownIds) || knownIds.length === 0) {
      diagnostics.push({ issue_number: issueNumber, status: 'no_known_comment' })
      continue
    }

    const comments = extractCommentsFromIntakePayload(payload)
    let matchedCount = 0

    for (const commentId of knownIds) {
      const comment = comments.find((c) => String(c.id) === String(commentId))
      if (!comment) {
        diagnostics.push({ issue_number: issueNumber, status: 'warning', reason: `comment ${commentId} not in payload` })
        continue
      }

      if (!TRUSTED_COMMENT_AUTHORS.includes(comment.author)) {
        diagnostics.push({ issue_number: issueNumber, status: 'warning', reason: `comment ${commentId} author ${comment.author} is not trusted` })
        continue
      }

      if (!matchesReplyTemplate(comment.body)) {
        diagnostics.push({ issue_number: issueNumber, status: 'warning', reason: `comment ${commentId} no template match` })
        continue
      }

      const record = buildBootstrapResponse({
        issueNumber,
        contentDigest,
        updatedAt,
        commentId: comment.id,
        commentCreatedAt: comment.created_at,
        commentAuthor: comment.author,
        templateVersion,
      })
      records.push(record)
      matchedCount += 1
    }

    diagnostics.push({
      issue_number: issueNumber,
      status: matchedCount > 0 ? 'bootstrapped' : 'no_template_match',
      matched_comments: matchedCount,
    })
  }

  return { records, diagnostics }
}

export function lookupPreviousResponse({
  issueNumber,
  contentDigest,
  templateVersion,
  canonicalRecords = [],
}) {
  const fingerprint = computeIssueIdentityFingerprint({ issueNumber, contentDigest, templateVersion })

  const existing = canonicalRecords.find(
    (r) => r.dedup_fingerprint === fingerprint &&
      (r.response_variant === 'bootstrap' || r.response_variant === 'posted') &&
      Number.isInteger(r.comment_id),
  )
  return existing
    ? { found: true, comment_id: existing.comment_id, source: existing.response_variant, fingerprint }
    : { found: false, comment_id: null, source: null, fingerprint }
}

export function buildDemandMetadata({
  snapshotComplete,
  allOpenIssuesProcessed,
  stageTerminals,
  canonicalRecords = [],
  runId,
}) {
  if (!snapshotComplete || !allOpenIssuesProcessed) {
    return { snapshot_complete: false, error: 'incomplete terminals — cannot produce demand metadata', issues: [] }
  }
  if (!Array.isArray(stageTerminals)) throw new Error('stageTerminals must be an array')

  const demandSkillIds = new Set()
  const domainSlugs = new Set()
  const issues = []

  for (const terminal of stageTerminals) {
    const issueNumber = terminal.issue_number
    const assessment = terminal.assessment
    const reply = terminal.reply

    const status = reply?.status ?? 'unknown'
    const isSafe = status === 'posted' || status === 'held_for_review' ||
                   status === 'no_action' || status === 'duplicate' ||
                   status === 'reply_blocked'
    if (!isSafe) continue

    const records = canonicalRecords.filter((r) => r.issue_number === issueNumber)

    // Collect demand signal IDs from classification
    if (assessment?.classification?.kind) {
      const kind = assessment.classification.kind
      if (kind === 'skill_request' || kind === 'pack_request') {
        domainSlugs.add(assessment.classification.kind)
      }
    }
    // Collect demand skill IDs from gap criteria referencing skill entities
    if (assessment?.gap_criteria) {
      for (const gap of assessment.gap_criteria) {
        demandSkillIds.add(gap.criterion_id)
      }
    }

    issues.push({
      issue_number: issueNumber,
      content_digest: assessment?.content_digest ?? null,
      terminal_status: status,
      comment_id: reply?.comment_id ?? null,
      response_records: records.map((r) => r.response_id),
    })
  }

  return {
    snapshot_complete: true,
    all_open_issues_processed: true,
    run_id: runId,
    generated_at: new Date().toISOString(),
    demand_digest: digest(issues),
    total_terminals: issues.length,
    issues,
    demand_skill_ids: [...demandSkillIds].sort(),
    domain_slugs: [...domainSlugs].sort(),
  }
}

// helpers
function digest(value) {
  return `sha256:${createHash('sha256').update(stableStringify(value)).digest('hex')}`
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function extractIssueNumber(payload) {
  if (payload?.issue?.number && Number.isInteger(payload.issue.number) && payload.issue.number > 0) {
    return payload.issue.number
  }
  if (payload?.number && Number.isInteger(payload.number) && payload.number > 0) {
    return payload.number
  }
  return null
}

function extractCommentsFromIntakePayload(payload) {
  const comments = payload?.comments ?? []
  return comments.map((c) => ({
    id: typeof c.id === 'string' ? Number(c.id) : c.id,
    body: c.body ?? '',
    author: c.author?.login ?? c.user?.login ?? null,
    created_at: c.created_at ?? c.createdAt,
    updated_at: c.updated_at ?? c.updatedAt,
  }))
}
