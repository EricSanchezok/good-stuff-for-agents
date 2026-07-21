import { TRUSTED_REPOSITORY } from './issue-intake.mjs'

const CLASSIFICATIONS = new Set(['skill_request', 'pack_request', 'catalog_question', 'non_demand', 'ambiguous', 'unsafe'])
const FULFILLMENT_STATUSES = new Set(['already_satisfied', 'partially_satisfied', 'not_satisfied', 'ambiguous', 'unsafe'])
const CRITERION_STATUSES = new Set(['satisfied', 'gap', 'ambiguous', 'unsafe'])
const EVIDENCE_KINDS = new Set(['skill', 'pack'])
const FORBIDDEN_KEYS = new Set([
  'authorization',
  'authorized',
  'tool',
  'tools',
  'tool_request',
  'execute',
  'execution',
  'next_action',
  'gate_override',
  'publication_score',
  'evaluation_score',
  'score',
  'confidence',
])

export function validateFulfillmentAssessment({ intake, assessment, evidenceIndex }) {
  const errors = []
  if (!isPlainObject(intake) || intake.kind !== 'github_issue_intake' || intake.intake_status !== 'accepted') {
    return ['intake must be an accepted github_issue_intake object']
  }
  if (!isPlainObject(assessment)) return ['assessment must be an object']
  if (!isPlainObject(evidenceIndex)) return ['evidence_index must be an object']

  validateExactKeys(assessment, ['schema_version', 'kind', 'issue_binding', 'classification', 'fulfillment', 'draft_response', 'human_checkpoint'], 'assessment', errors)
  rejectForbiddenKeys(assessment, 'assessment', errors)

  if (assessment.schema_version !== 1) errors.push('assessment.schema_version must equal 1')
  if (assessment.kind !== 'github_issue_fulfillment_assessment') errors.push('assessment.kind must equal "github_issue_fulfillment_assessment"')
  validateBinding(intake.issue_binding, assessment.issue_binding, errors)
  validateClassification(assessment.classification, errors)
  validateFulfillment(assessment.classification, assessment.fulfillment, evidenceIndex, errors)
  validateDraftResponse(assessment.draft_response, errors)
  validateHumanCheckpoint(assessment.human_checkpoint, errors)

  return errors
}

function validateBinding(expected, actual, errors) {
  if (!isPlainObject(actual)) {
    errors.push('assessment.issue_binding must be an object')
    return
  }
  validateExactKeys(actual, ['repository', 'issue_number', 'updated_at', 'content_digest'], 'assessment.issue_binding', errors)
  if (actual.repository !== TRUSTED_REPOSITORY) errors.push(`assessment.issue_binding.repository must be exactly "${TRUSTED_REPOSITORY}"`)
  for (const field of ['repository', 'issue_number', 'updated_at', 'content_digest']) {
    if (actual[field] !== expected?.[field]) errors.push(`assessment.issue_binding.${field} does not match intake`)
  }
  if (typeof actual.content_digest !== 'string' || !/^sha256:[a-f0-9]{64}$/u.test(actual.content_digest)) {
    errors.push('assessment.issue_binding.content_digest must be a sha256 digest')
  }
}

function validateClassification(classification, errors) {
  if (!isPlainObject(classification)) {
    errors.push('assessment.classification must be an object')
    return
  }
  validateExactKeys(classification, ['kind', 'criteria'], 'assessment.classification', errors)
  if (!CLASSIFICATIONS.has(classification.kind)) errors.push('assessment.classification.kind is invalid')
  if (!Array.isArray(classification.criteria)) {
    errors.push('assessment.classification.criteria must be an array')
    return
  }
  const ids = new Set()
  classification.criteria.forEach((criterion, index) => {
    const path = `assessment.classification.criteria[${index}]`
    if (!isPlainObject(criterion)) {
      errors.push(`${path} must be an object`)
      return
    }
    validateExactKeys(criterion, ['id', 'text'], path, errors)
    if (!isNonEmptyString(criterion.id)) errors.push(`${path}.id must be a non-empty string`)
    if (!isNonEmptyString(criterion.text)) errors.push(`${path}.text must be a non-empty string`)
    if (ids.has(criterion.id)) errors.push(`${path}.id must be unique`)
    ids.add(criterion.id)
  })
  if (classification.criteria.length === 0) {
    errors.push('assessment.classification.criteria must contain at least one criterion')
  }
}

function validateFulfillment(classification, fulfillment, evidenceIndex, errors) {
  if (!isPlainObject(fulfillment)) {
    errors.push('assessment.fulfillment must be an object')
    return
  }
  validateExactKeys(fulfillment, ['status', 'rationale', 'criteria'], 'assessment.fulfillment', errors)
  if (!FULFILLMENT_STATUSES.has(fulfillment.status)) errors.push('assessment.fulfillment.status is invalid')
  if (!isNonEmptyString(fulfillment.rationale)) errors.push('assessment.fulfillment.rationale must be a non-empty string')
  if (!Array.isArray(fulfillment.criteria)) {
    errors.push('assessment.fulfillment.criteria must be an array')
    return
  }

  const expectedCriteria = Array.isArray(classification?.criteria) ? classification.criteria : []
  const expectedIds = new Set(expectedCriteria.map((criterion) => criterion?.id).filter(isNonEmptyString))
  const seenIds = new Set()
  const criterionStatuses = []

  fulfillment.criteria.forEach((criterion, index) => {
    const path = `assessment.fulfillment.criteria[${index}]`
    if (!isPlainObject(criterion)) {
      errors.push(`${path} must be an object`)
      return
    }
    validateExactKeys(criterion, ['criterion_id', 'status', 'evidence'], path, errors)
    if (!isNonEmptyString(criterion.criterion_id)) errors.push(`${path}.criterion_id must be a non-empty string`)
    if (!expectedIds.has(criterion.criterion_id)) errors.push(`${path}.criterion_id is not declared in classification.criteria`)
    if (seenIds.has(criterion.criterion_id)) errors.push(`${path}.criterion_id must be unique`)
    seenIds.add(criterion.criterion_id)
    if (!CRITERION_STATUSES.has(criterion.status)) errors.push(`${path}.status is invalid`)
    criterionStatuses.push(criterion.status)
    validateEvidence(criterion, path, evidenceIndex, errors)
  })

  for (const criterionId of expectedIds) {
    if (!seenIds.has(criterionId)) errors.push(`assessment.fulfillment.criteria is missing criterion "${criterionId}"`)
  }
  if (fulfillment.criteria.length !== expectedIds.size) {
    errors.push('assessment.fulfillment.criteria must contain exactly one result per declared criterion')
  }

  validateStateMatrix(classification?.kind, fulfillment.status, criterionStatuses, errors)
}

function validateStateMatrix(classificationKind, fulfillmentStatus, criterionStatuses, errors) {
  if (criterionStatuses.length === 0) {
    errors.push('assessment.fulfillment.criteria must contain at least one criterion result')
    return
  }

  if (classificationKind === 'non_demand' && fulfillmentStatus !== 'ambiguous') {
    errors.push('non_demand classification requires ambiguous fulfillment')
  }
  if (classificationKind === 'ambiguous' && fulfillmentStatus !== 'ambiguous') {
    errors.push('ambiguous classification requires ambiguous fulfillment')
  }
  if (classificationKind === 'unsafe' && fulfillmentStatus !== 'unsafe') {
    errors.push('unsafe classification requires unsafe fulfillment')
  }
  if (fulfillmentStatus === 'unsafe' && classificationKind !== 'unsafe') {
    errors.push('unsafe fulfillment requires unsafe classification')
  }
  if (criterionStatuses.includes('unsafe') && fulfillmentStatus !== 'unsafe') {
    errors.push('unsafe criterion requires unsafe fulfillment')
  }

  if (fulfillmentStatus === 'already_satisfied' && !criterionStatuses.every((status) => status === 'satisfied')) {
    errors.push('already_satisfied requires every criterion status to be satisfied')
  }
  if (fulfillmentStatus === 'partially_satisfied') {
    const onlyClosedStatuses = criterionStatuses.every((status) => status === 'satisfied' || status === 'gap')
    const hasSatisfied = criterionStatuses.includes('satisfied')
    const hasGap = criterionStatuses.includes('gap')
    if (!onlyClosedStatuses || !hasSatisfied || !hasGap) {
      errors.push('partially_satisfied requires at least one satisfied criterion and at least one gap criterion, with no ambiguous or unsafe criteria')
    }
  }
  if (fulfillmentStatus === 'not_satisfied' && !criterionStatuses.every((status) => status === 'gap')) {
    errors.push('not_satisfied requires every criterion status to be gap')
  }
  if (fulfillmentStatus === 'ambiguous') {
    if (!criterionStatuses.includes('ambiguous')) {
      errors.push('ambiguous fulfillment requires at least one ambiguous criterion')
    }
    if (criterionStatuses.includes('unsafe')) {
      errors.push('ambiguous fulfillment cannot contain unsafe criteria')
    }
  }
  if (fulfillmentStatus === 'unsafe' && !criterionStatuses.includes('unsafe')) {
    errors.push('unsafe fulfillment requires at least one unsafe criterion')
  }
}

function validateEvidence(criterion, path, evidenceIndex, errors) {
  if (!Array.isArray(criterion.evidence)) {
    errors.push(`${path}.evidence must be an array`)
    return
  }
  if (criterion.status === 'satisfied' && criterion.evidence.length === 0) {
    errors.push(`${path}.evidence must cite trusted catalog evidence for a satisfied criterion`)
  }
  if (criterion.status !== 'satisfied' && criterion.evidence.length > 0) {
    errors.push(`${path}.evidence must be empty when criterion status is ${criterion.status}`)
  }
  criterion.evidence.forEach((evidence, index) => {
    const evidencePath = `${path}.evidence[${index}]`
    if (!isPlainObject(evidence)) {
      errors.push(`${evidencePath} must be an object`)
      return
    }
    validateExactKeys(evidence, ['kind', 'id', 'path', 'claim'], evidencePath, errors)
    if (!EVIDENCE_KINDS.has(evidence.kind)) errors.push(`${evidencePath}.kind must be "skill" or "pack"`)
    if (!isNonEmptyString(evidence.id)) errors.push(`${evidencePath}.id must be a non-empty string`)
    if (!isNonEmptyString(evidence.path)) errors.push(`${evidencePath}.path must be a non-empty string`)
    if (!isNonEmptyString(evidence.claim)) errors.push(`${evidencePath}.claim must be a non-empty criterion-specific claim`)
    if (/\b(?:publication|evaluation|quality)\s+score\b|\bscore\s*(?:of|=|:)\s*\d/iu.test(evidence.claim ?? '')) {
      errors.push(`${evidencePath}.claim must not use publication or evaluation score as fulfillment evidence`)
    }
    const trustedRecord = evidenceIndex[evidence.id]
    if (!isPlainObject(trustedRecord)) {
      errors.push(`${evidencePath}.id is not present in trusted evidence_index`)
      return
    }
    if (trustedRecord.kind !== evidence.kind) errors.push(`${evidencePath}.kind does not match trusted evidence_index`)
    if (trustedRecord.path !== evidence.path) errors.push(`${evidencePath}.path does not match trusted evidence_index`)
    if (!isCanonicalCatalogPath(evidence.kind, evidence.path)) errors.push(`${evidencePath}.path is not a canonical catalog ${evidence.kind} path`)
  })
}

function validateDraftResponse(draftResponse, errors) {
  if (!isPlainObject(draftResponse)) {
    errors.push('assessment.draft_response must be an object')
    return
  }
  validateExactKeys(draftResponse, ['recommended', 'body'], 'assessment.draft_response', errors)
  if (typeof draftResponse.recommended !== 'boolean') errors.push('assessment.draft_response.recommended must be a boolean')
  if (draftResponse.body !== null && typeof draftResponse.body !== 'string') errors.push('assessment.draft_response.body must be a string or null')
  if (draftResponse.recommended === true && !isNonEmptyString(draftResponse.body)) {
    errors.push('assessment.draft_response.body must be non-empty when recommended is true')
  }
}

function validateHumanCheckpoint(checkpoint, errors) {
  if (!isPlainObject(checkpoint)) {
    errors.push('assessment.human_checkpoint must be an object')
    return
  }
  validateExactKeys(checkpoint, ['required', 'action'], 'assessment.human_checkpoint', errors)
  if (checkpoint.required !== true) errors.push('assessment.human_checkpoint.required must be true')
  if (checkpoint.action !== 'review_only') errors.push('assessment.human_checkpoint.action must equal "review_only"')
}

function rejectForbiddenKeys(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectForbiddenKeys(item, `${path}[${index}]`, errors))
    return
  }
  if (!isPlainObject(value)) return
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`${path}.${key} is forbidden in an assessment`)
    rejectForbiddenKeys(nested, `${path}.${key}`, errors)
  }
}

function validateExactKeys(value, expectedKeys, path, errors) {
  if (!isPlainObject(value)) return
  const expected = new Set(expectedKeys)
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) errors.push(`${path}.${key} is not allowed`)
  }
  for (const key of expectedKeys) {
    if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`)
  }
}

function isCanonicalCatalogPath(kind, path) {
  if (typeof path !== 'string' || path.includes('..') || path.startsWith('/')) return false
  if (kind === 'skill') return /^catalog\/skills\/records\/[a-z0-9_-]{2}\/[a-z0-9_.-]+\.yaml$/u.test(path)
  return /^catalog\/packs\/(?:candidates|published)\/[a-z0-9_.-]+(?:\/pack\.yaml|\.yaml)$/u.test(path)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
