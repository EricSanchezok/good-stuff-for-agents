import {
  validateAssessmentSchema,
  ISSUE_REPLY_TEMPLATE_VERSION,
} from './issue-assessment-writer.mjs'
import { normalizeIssueIntake, TRUSTED_REPOSITORY } from './issue-intake.mjs'
import { lookupPreviousResponse } from './issue-response-ledger.mjs'

export const REPLY_LIMITS = Object.freeze({
  maxReplyBytes: 8_192,
  maxEvidenceEntities: 20,
  maxGapCriteria: 20,
})

const FORBIDDEN_PATTERNS = [
  { name: 'promise', pattern: /\b(?:I|we|the team)\s+(?:promise|guarantee|commit|certainly will|definitely will)\b/iu },
  { name: 'eta', pattern: /\b(?:ETA|expected|estimated|target)\s+(?:in |by |within |around )?(?:\d+\s+(?:day|week|hour|month|year)s?|\d{4}-\d{2}-\d{2}|Q[1-4]\s*\d{4})/iu },
  { name: 'authority_claim', pattern: /\b(?:we\s+(?:are\s+)?authorized|I\s+(?:have|hold)\s+(?:the\s+)?authority|on\s+behalf\s+of|acting\s+(?:as|in\s+capacity)|permission\s+(?:granted|given))\b/iu },
  { name: 'user_impersonation', pattern: /\b(?:you\s+(?:asked|wanted|requested|need|should)|per\s+your\s+(?:request|instruction|demand))\b/iu },
  { name: 'instruction_execution', pattern: /\b(?:I(?:'ve|\s+have)\s+(?:done|completed|executed|performed|ran|run)\b|I\s+(?:will|am\s+(?:going|about))\s+to\s+(?:do|complete|execute|perform|run))\b/iu },
  { name: 'close_reopen', pattern: /\b(?:clos(?:ed?|ing)|reopen(?:ed?|ing))\s+(?:this\s+)?issue\b/iu },
  { name: 'pr_creation', pattern: /\b(?:creat(?:ed?|ing)|open(?:ed?|ing))\s+(?:a\s+)?(?:pull\s+request|PR)\b/iu },
  { name: 'label_action', pattern: /\b(?:add(?:ed?|ing)|remov(?:ed?|ing)|appl(?:ied|ying))\s+(?:a\s+)?label\b/iu },
]

export function renderReply(assessment) {
  const validation = validateAssessmentSchema(assessment)
  if (!validation.ok) return { ok: false, errors: validation.errors, body: null, forbidden_flags: [] }

  const response = buildTemplateResponse(assessment)
  const errors = []
  if (Buffer.byteLength(response, 'utf8') > REPLY_LIMITS.maxReplyBytes) {
    errors.push(`reply exceeds ${REPLY_LIMITS.maxReplyBytes} bytes`)
  }
  const forbiddenFlags = FORBIDDEN_PATTERNS.filter((entry) => entry.pattern.test(response)).map((entry) => entry.name)
  if (forbiddenFlags.length > 0) errors.push(`forbidden language detected: ${forbiddenFlags.join(', ')}`)
  return { ok: errors.length === 0, errors, body: errors.length === 0 ? response : null, forbidden_flags: forbiddenFlags }
}

export function checkTOCTOU({ intake, currentPayload }) {
  if (!intake?.issue_binding?.content_digest || intake.issue_binding.repository !== TRUSTED_REPOSITORY) {
    return unknownTOCTOU(intake, 'missing or invalid intake binding')
  }

  let currentIntake
  try {
    currentIntake = normalizeIssueIntake(currentPayload)
  } catch (error) {
    return unknownTOCTOU(intake, `current issue failed intake validation: ${error.message}`)
  }
  if (currentIntake.issue_binding.issue_number !== intake.issue_binding.issue_number) {
    return unknownTOCTOU(intake, 'current issue number does not match intake binding', currentIntake.issue_binding.content_digest)
  }

  const boundUpdatedAt = intake.issue_binding.updated_at
  const currentUpdatedAt = currentIntake.issue_binding.updated_at
  const boundDigest = intake.issue_binding.content_digest
  const currentDigest = currentIntake.issue_binding.content_digest
  const base = {
    checked_at: new Date().toISOString(),
    issue_updated_at: currentUpdatedAt,
    bound_digest: boundDigest,
    current_digest: currentDigest,
  }

  if (currentUpdatedAt !== boundUpdatedAt) {
    return { ...base, staleness: 'stale_issue', changed: true, reason: 'issue updated_at changed after assessment binding' }
  }
  if (currentDigest !== boundDigest) {
    return { ...base, staleness: 'stale_response', changed: true, reason: 'canonical issue content changed after assessment binding' }
  }
  return { ...base, staleness: 'current', changed: false, reason: null }
}

export async function runRestrictedIssueReply({
  intake,
  assessment,
  canonicalRecords = [],
  fetchCurrentIssue,
  commentRunner,
  apply = false,
  persistCanonical = null,
  templateVersion = ISSUE_REPLY_TEMPLATE_VERSION,
}) {
  assertAssessmentBinding(intake, assessment)
  if (typeof fetchCurrentIssue !== 'function') throw new Error('fetchCurrentIssue must be a function')

  // Security requires human review — held_for_review immediately
  if (intake.security?.requires_human_review) {
    if (persistCanonical) {
      const { buildCanonicalResponse } = await import('./issue-response-ledger.mjs')
      const record = buildCanonicalResponse({
        issueNumber: assessment.issue_number,
        contentDigest: assessment.content_digest,
        templateVersion,
        responseVariant: 'held_for_review',
      })
      persistCanonical(record)
    }
    return { status: 'held_for_review', posted: false, comment_id: null, body: null }
  }

  // Re-fetch current state for TOCTOU check
  const currentPayload = await fetchCurrentIssue({
    repository: TRUSTED_REPOSITORY,
    issueNumber: assessment.issue_number,
  })
  const toctouState = checkTOCTOU({ intake, currentPayload })
  if (toctouState.staleness !== 'current') {
    if (persistCanonical) {
      const { buildCanonicalResponse } = await import('./issue-response-ledger.mjs')
      const record = buildCanonicalResponse({
        issueNumber: assessment.issue_number,
        contentDigest: assessment.content_digest,
        templateVersion,
        responseVariant: 'reply_blocked',
      })
      persistCanonical(record)
    }
    return { status: 'reply_blocked', posted: false, comment_id: null, body: null }
  }

  // Unified dedup: check canonical records only
  const prev = lookupPreviousResponse({
    issueNumber: assessment.issue_number,
    contentDigest: assessment.content_digest,
    templateVersion,
    canonicalRecords,
  })
  if (prev.found) {
    if (persistCanonical) {
      const { buildCanonicalResponse } = await import('./issue-response-ledger.mjs')
      const record = buildCanonicalResponse({
        issueNumber: assessment.issue_number,
        contentDigest: assessment.content_digest,
        templateVersion,
        responseVariant: 'no_action',
      })
      persistCanonical(record)
    }
    return { status: 'duplicate', posted: false, comment_id: prev.comment_id, body: null }
  }

  const reply = renderReply(assessment)
  if (!reply.ok) {
    if (persistCanonical) {
      const { buildCanonicalResponse } = await import('./issue-response-ledger.mjs')
      const record = buildCanonicalResponse({
        issueNumber: assessment.issue_number,
        contentDigest: assessment.content_digest,
        templateVersion,
        responseVariant: 'reply_blocked',
      })
      persistCanonical(record)
    }
    return { status: 'reply_blocked', posted: false, comment_id: null, body: null }
  }

  if (!apply) {
    return { status: 'dry_run', posted: false, comment_id: null, body: reply.body }
  }
  if (typeof commentRunner !== 'function') throw new Error('commentRunner must be a function when apply=true')

  const result = await commentRunner({
    repository: TRUSTED_REPOSITORY,
    issueNumber: assessment.issue_number,
    body: reply.body,
  })
  const commentId = Number.isInteger(result) ? result : result?.comment_id
  if (!Number.isInteger(commentId) || commentId <= 0) throw new Error('commentRunner must return a positive comment ID')

  if (persistCanonical) {
    const { buildCanonicalResponse } = await import('./issue-response-ledger.mjs')
    const record = buildCanonicalResponse({
      issueNumber: assessment.issue_number,
      contentDigest: assessment.content_digest,
      templateVersion,
      responseVariant: 'posted',
      commentId,
      assessmentDigest: assessment.assessment_digest,
    })
    persistCanonical(record)
  }
  return { status: 'posted', posted: true, comment_id: commentId, body: reply.body }
}

function assertAssessmentBinding(intake, assessment) {
  const validation = validateAssessmentSchema(assessment)
  if (!validation.ok) throw new Error(`assessment is invalid: ${validation.errors.join('; ')}`)
  if (!intake || intake.intake_status !== 'accepted') throw new Error('intake must be accepted')
  if (intake.issue_binding.repository !== TRUSTED_REPOSITORY) throw new Error('intake repository is not trusted')
  if (assessment.issue_number !== intake.issue_binding.issue_number) throw new Error('assessment issue number does not match intake')
  if (assessment.content_digest !== intake.issue_binding.content_digest) throw new Error('assessment content digest does not match intake')
  if (assessment.updated_at_bound !== intake.issue_binding.updated_at) throw new Error('assessment updated_at does not match intake')
}

function buildTemplateResponse(assessment) {
  const lines = [
    '## Catalog Fulfillment Status',
    '',
    `**${stateLabels[assessment.fulfillment_state]}** (classified as ${assessment.classification.kind}).`,
  ]

  const entities = assessment.public_evidence.related_entities.slice(0, REPLY_LIMITS.maxEvidenceEntities)
  if (entities.length > 0) {
    lines.push('', '### Matching Catalog Evidence', '')
    for (const entity of entities) lines.push(`- ${entity.entity_type} \`${entity.entity_id}\` — \`${entity.path}\``)
  }

  const gaps = assessment.gap_criteria.slice(0, REPLY_LIMITS.maxGapCriteria)
  if (gaps.length > 0) {
    lines.push('', '### Unmet Criteria', '')
    for (const gap of gaps) lines.push(`- Criterion \`${gap.criterion_id}\` remains unmet.`)
  }

  lines.push(
    '',
    '---',
    '',
    'This catalog status reply reports only validated catalog evidence and unmet criteria.',
    'It does not make commitments, execute Issue instructions, or represent repository maintainers.',
  )
  return lines.join('\n')
}

function unknownTOCTOU(intake, reason, currentDigest = null) {
  return {
    checked_at: new Date().toISOString(),
    issue_updated_at: intake?.issue_binding?.updated_at ?? new Date(0).toISOString(),
    bound_digest: intake?.issue_binding?.content_digest ?? `sha256:${'0'.repeat(64)}`,
    current_digest: currentDigest,
    staleness: 'unknown',
    changed: true,
    reason,
  }
}

const stateLabels = Object.freeze({
  fulfilled: 'Fulfilled — matching published catalog evidence satisfies all criteria',
  partially_fulfilled: 'Partially fulfilled — published catalog evidence satisfies some criteria',
  not_started: 'Not fulfilled — no matching published catalog evidence was found',
  in_progress: 'In progress — matching catalog records are not yet published',
  blocked: 'Blocked — one or more stated criteria cannot currently be assessed',
  out_of_scope: 'Out of scope — the request is outside the catalog domain',
  duplicate: 'Duplicate — the request is already represented by another assessed Issue',
})
