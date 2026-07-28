import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateAgainstSchema } from '../../../catalog-data/scripts/lib/schema-validators.mjs'
import { TRUSTED_REPOSITORY } from './issue-intake.mjs'
import { validateFulfillmentAssessment } from './issue-fulfillment.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_ROOT = join(__dirname, '..', '..', '..', 'catalog-data', 'references', 'schemas', 'v2')

const issueAssessmentSchema = JSON.parse(readFileSync(join(SCHEMA_ROOT, 'issue-assessment.schema.json'), 'utf8'))
const issueResponseLedgerSchema = JSON.parse(readFileSync(join(SCHEMA_ROOT, 'issue-response-ledger.schema.json'), 'utf8'))

export const ISSUE_REPLY_TEMPLATE_VERSION = 'issue-factual-v1'

export function buildAssessment({ intake, classification, fulfillmentState, publicEvidenceBoundary, publicEvidenceEntities, runId, notes }) {
  if (!intake || intake.intake_status !== 'accepted') {
    throw new Error('intake must be an accepted github_issue_intake')
  }
  if (intake.issue_binding.repository !== TRUSTED_REPOSITORY) {
    throw new Error(`intake repository must be ${TRUSTED_REPOSITORY}`)
  }

  const normalizedClassification = normalizeClassification(classification)
  const relatedEntities = normalizeEvidenceEntities(publicEvidenceEntities ?? [])
  const gapCriteria = normalizedClassification.criteria
    .filter((criterion) => criterion.status !== 'satisfied')
    .map(({ criterion_id: criterionId, text }) => ({ criterion_id: criterionId, text }))

  validateFulfillmentConsistency(fulfillmentState, normalizedClassification.criteria)

  const stableAssessment = assessmentDigestInput({
    issue_number: intake.issue_binding.issue_number,
    content_digest: intake.issue_binding.content_digest,
    updated_at_bound: intake.issue_binding.updated_at,
    classification: normalizedClassification,
    fulfillment_state: fulfillmentState,
    public_evidence: {
      boundary: publicEvidenceBoundary ?? '',
      related_entities: relatedEntities,
    },
    gap_criteria: gapCriteria,
  })
  const assessmentDigest = digest(stableAssessment)
  const record = {
    schema_version: 1,
    assessment_id: `asm_n${stableAssessment.issue_number}_${assessmentDigest.slice(-16)}`,
    assessment_digest: assessmentDigest,
    issue_number: stableAssessment.issue_number,
    repository: { owner: 'EricSanchezok', repo: 'good-stuff-for-agents' },
    issue_title: intake.untrusted_request?.title ?? '',
    content_digest: stableAssessment.content_digest,
    updated_at_bound: stableAssessment.updated_at_bound,
    classification: normalizedClassification,
    fulfillment_state: fulfillmentState,
    public_evidence: stableAssessment.public_evidence,
    gap_criteria: gapCriteria,
    assessed_at: new Date().toISOString(),
    assessed_by_run: runId,
  }
  if (notes != null && notes !== '') record.notes = notes

  const validation = validateAssessmentSchema(record)
  if (!validation.ok) {
    throw new Error(`Assessment validation failed: ${validation.errors.join('; ')}`)
  }
  return { record, validation }
}

export function buildAssessmentFromFulfillment({ intake, fulfillmentAssessment, evidenceIndex, publicEvidenceBoundary, runId, notes }) {
  const errors = validateFulfillmentAssessment({ intake, assessment: fulfillmentAssessment, evidenceIndex })
  if (errors.length > 0) {
    throw new Error(`Fulfillment assessment validation failed: ${errors.join('; ')}`)
  }

  const fulfillmentByCriterion = new Map(
    fulfillmentAssessment.fulfillment.criteria.map((criterion) => [criterion.criterion_id, criterion]),
  )
  const classification = {
    kind: fulfillmentAssessment.classification.kind,
    criteria: fulfillmentAssessment.classification.criteria.map((criterion) => {
      const result = fulfillmentByCriterion.get(criterion.id)
      return {
        criterion_id: criterion.id,
        text: criterion.text,
        status: mapCriterionStatus(result.status),
      }
    }),
  }
  const evidenceEntities = []
  const seen = new Set()
  for (const criterion of fulfillmentAssessment.fulfillment.criteria) {
    for (const evidence of criterion.evidence) {
      const key = `${evidence.kind}:${evidence.id}:${evidence.path}`
      if (seen.has(key)) continue
      seen.add(key)
      evidenceEntities.push({ entity_type: evidence.kind, entity_id: evidence.id, path: evidence.path })
    }
  }

  return buildAssessment({
    intake,
    classification,
    fulfillmentState: mapFulfillmentState(fulfillmentAssessment),
    publicEvidenceBoundary,
    publicEvidenceEntities: evidenceEntities,
    runId,
    notes: notes ?? fulfillmentAssessment.fulfillment.rationale,
  })
}

export function buildResponseLedger({ assessment, responseState, commentId, toctouState, runId, notes, templateVersion = ISSUE_REPLY_TEMPLATE_VERSION }) {
  const assessmentValidation = validateAssessmentSchema(assessment)
  if (!assessmentValidation.ok) {
    throw new Error(`Assessment validation failed: ${assessmentValidation.errors.join('; ')}`)
  }
  if ((responseState === 'posted' || responseState === 'posted_confirmed') && !Number.isInteger(commentId)) {
    throw new Error(`${responseState} response requires a positive commentId`)
  }
  if (responseState === 'posted' || responseState === 'posted_confirmed') {
    if (toctouState?.staleness !== 'current') throw new Error(`${responseState} response requires current TOCTOU state`)
  } else if (commentId != null) {
    throw new Error(`${responseState} response must not carry a commentId`)
  }

  const repository = `${assessment.repository.owner}/${assessment.repository.repo}`
  const dedupFingerprint = computeDedupFingerprint({
    repository,
    issueNumber: assessment.issue_number,
    assessmentDigest: assessment.assessment_digest,
    templateVersion,
  })
  const record = {
    schema_version: 1,
    response_id: `rsp_n${assessment.issue_number}_${dedupFingerprint.slice(-16)}_${responseState}`,
    assessment_id: assessment.assessment_id,
    assessment_digest: assessment.assessment_digest,
    repository,
    issue_number: assessment.issue_number,
    template_version: templateVersion,
    response_state: responseState,
    comment_id: commentId ?? null,
    dedup_fingerprint: dedupFingerprint,
    toctou_state: normalizeTOCTOUState(toctouState),
    created_at: new Date().toISOString(),
    created_by_run: runId,
  }
  if (notes != null && notes !== '') record.notes = notes

  const validation = validateAgainstSchema(record, issueResponseLedgerSchema)
  if (!validation.ok) {
    throw new Error(`Response ledger validation failed: ${validation.errors.join('; ')}`)
  }
  return { record, validation }
}

export function computeDedupFingerprint({ repository, issueNumber, assessmentDigest, templateVersion = ISSUE_REPLY_TEMPLATE_VERSION }) {
  if (repository !== TRUSTED_REPOSITORY) throw new Error(`repository must be ${TRUSTED_REPOSITORY}`)
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new Error('issueNumber must be a positive integer')
  if (!/^sha256:[a-f0-9]{64}$/u.test(assessmentDigest ?? '')) throw new Error('assessmentDigest must be a sha256 digest')
  if (!/^issue-factual-v[0-9]+$/u.test(templateVersion ?? '')) throw new Error('templateVersion is invalid')
  return digest({ repository, issue_number: issueNumber, assessment_digest: assessmentDigest, template_version: templateVersion })
}

export function validateAssessmentSchema(record) {
  const structural = validateAgainstSchema(record, issueAssessmentSchema)
  if (!structural.ok) return structural

  const errors = []
  const expectedDigest = digest(assessmentDigestInput(record))
  if (record.assessment_digest !== expectedDigest) errors.push('assessment_digest does not match stable assessment content')
  const expectedId = `asm_n${record.issue_number}_${expectedDigest.slice(-16)}`
  if (record.assessment_id !== expectedId) errors.push('assessment_id does not match assessment content')

  const unresolved = record.classification.criteria
    .filter((criterion) => criterion.status !== 'satisfied')
    .map((criterion) => ({ criterion_id: criterion.criterion_id, text: criterion.text }))
  if (stableStringify(record.gap_criteria) !== stableStringify(unresolved)) {
    errors.push('gap_criteria must exactly match unresolved classification criteria')
  }
  try {
    validateFulfillmentConsistency(record.fulfillment_state, record.classification.criteria)
  } catch (error) {
    errors.push(error.message)
  }
  return { ok: errors.length === 0, errors }
}

export function validateResponseLedgerSchema(record) {
  const structural = validateAgainstSchema(record, issueResponseLedgerSchema)
  if (!structural.ok) return structural

  const errors = []
  let expectedFingerprint
  try {
    expectedFingerprint = computeDedupFingerprint({
      repository: record.repository,
      issueNumber: record.issue_number,
      assessmentDigest: record.assessment_digest,
      templateVersion: record.template_version,
    })
  } catch (error) {
    errors.push(error.message)
  }
  if (expectedFingerprint && record.dedup_fingerprint !== expectedFingerprint) {
    errors.push('dedup_fingerprint does not match response binding')
  }
  if ((record.response_state === 'posted' || record.response_state === 'posted_confirmed') && !Number.isInteger(record.comment_id)) {
    errors.push(`${record.response_state} response requires a positive comment_id`)
  }
  if (record.response_state !== 'posted' && record.response_state !== 'posted_confirmed' && record.comment_id !== null) {
    errors.push(`${record.response_state} response must not carry a comment_id`)
  }
  if ((record.response_state === 'posted' || record.response_state === 'posted_confirmed') && record.toctou_state.staleness !== 'current') {
    errors.push(`${record.response_state} response requires current TOCTOU state`)
  }
  return { ok: errors.length === 0, errors }
}

function normalizeTOCTOUState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('toctouState must be an object')
  }
  return {
    checked_at: state.checked_at,
    issue_updated_at: state.issue_updated_at,
    staleness: state.staleness,
    bound_digest: state.bound_digest,
    current_digest: state.current_digest ?? null,
  }
}

function mapCriterionStatus(status) {
  return {
    satisfied: 'satisfied',
    gap: 'unsatisfied',
    ambiguous: 'unknown',
    unsafe: 'unknown',
  }[status]
}

function mapFulfillmentState(assessment) {
  if (assessment.classification.kind === 'non_demand') return 'out_of_scope'
  if (assessment.classification.kind === 'unsafe' || assessment.fulfillment.status === 'unsafe') return 'blocked'
  return {
    already_satisfied: 'fulfilled',
    partially_satisfied: 'partially_fulfilled',
    not_satisfied: 'not_started',
    ambiguous: 'blocked',
  }[assessment.fulfillment.status]
}

function normalizeClassification(classification) {
  if (!classification || typeof classification !== 'object' || Array.isArray(classification)) {
    throw new Error('classification must be an object')
  }
  const criteria = Array.isArray(classification.criteria)
    ? classification.criteria.map((criterion) => ({
        criterion_id: criterion.criterion_id,
        text: criterion.text,
        status: criterion.status,
      }))
    : null
  if (criteria === null) throw new Error('classification.criteria must be an array')
  return { kind: classification.kind, criteria }
}

function normalizeEvidenceEntities(entities) {
  return entities.map((entity) => ({
    entity_type: entity.entity_type,
    entity_id: entity.entity_id,
    path: entity.path,
  })).sort((left, right) => `${left.entity_type}:${left.entity_id}`.localeCompare(`${right.entity_type}:${right.entity_id}`, 'en'))
}

function validateFulfillmentConsistency(fulfillmentState, criteria) {
  const satisfied = criteria.filter((criterion) => criterion.status === 'satisfied').length
  const unresolved = criteria.length - satisfied
  if (fulfillmentState === 'fulfilled' && unresolved > 0) {
    throw new Error('fulfilled assessment cannot contain unresolved criteria')
  }
  if (fulfillmentState === 'not_started' && satisfied > 0) {
    throw new Error('not_started assessment cannot contain satisfied criteria')
  }
  if (fulfillmentState === 'partially_fulfilled' && (satisfied === 0 || unresolved === 0)) {
    throw new Error('partially_fulfilled assessment requires both satisfied and unresolved criteria')
  }
}

function assessmentDigestInput(record) {
  return {
    repository: TRUSTED_REPOSITORY,
    issue_number: record.issue_number,
    content_digest: record.content_digest,
    updated_at_bound: record.updated_at_bound,
    classification: record.classification,
    fulfillment_state: record.fulfillment_state,
    public_evidence: record.public_evidence,
    gap_criteria: record.gap_criteria,
  }
}

function digest(value) {
  return `sha256:${createHash('sha256').update(stableStringify(value)).digest('hex')}`
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
