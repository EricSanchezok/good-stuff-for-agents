const TOP_LEVEL_FIELDS = new Set([
  'schema_version',
  'run_id',
  'ledger_id',
  'context_digest',
  'ledger_digest',
  'timestamp',
  'run_outcome',
  'gate',
  'intents',
  'outcome_counts',
])

const RUN_STATUSES = new Set(['success', 'partial', 'failed', 'no_pack_clean', 'reply_blocked'])
const GATE_DECISIONS = new Set(['pass', 'fail'])
const OUTCOME_COUNT_FIELDS = ['sources', 'skills', 'relations', 'packs', 'issues']
const INTENT_FIELDS = new Set(['domain', 'source', 'reason', 'score', 'seed_skill_ids', 'max_analysis_budget'])
const RUN_OUTCOME_FIELDS = new Set(['status', 'summary', 'total_actions', 'errors', 'warnings'])
const GATE_FIELDS = new Set(['gate_id', 'decision', 'passed', 'errors', 'warnings'])

export function validateRunSummary(summary) {
  const errors = []

  if (!isObject(summary)) {
    return ['Input must be a JSON object']
  }

  requireExactFields(summary, TOP_LEVEL_FIELDS, 'summary', errors)
  if (summary.schema_version !== 3) errors.push(`schema_version must be 3, got ${JSON.stringify(summary.schema_version)}`)
  if (!isNonEmptyString(summary.run_id) || !summary.run_id.startsWith('run_')) errors.push('run_id must be a non-empty string beginning with "run_"')
  if (!isNonEmptyString(summary.ledger_id) || !summary.ledger_id.startsWith('ldg_')) errors.push('ledger_id must be a non-empty string beginning with "ldg_"')
  validateDigest(summary.context_digest, 'context_digest', errors)
  validateDigest(summary.ledger_digest, 'ledger_digest', errors)
  if (!isIsoTimestamp(summary.timestamp)) errors.push('timestamp must be a valid ISO 8601 timestamp')

  validateRunOutcome(summary.run_outcome, errors)
  validateGate(summary.gate, errors)
  validateIntents(summary.intents, errors)
  validateOutcomeCounts(summary.outcome_counts, errors)
  validateCrossFieldConsistency(summary, errors)

  return errors
}

function validateRunOutcome(runOutcome, errors) {
  if (!isObject(runOutcome)) {
    errors.push('run_outcome must be an object')
    return
  }
  requireExactFields(runOutcome, RUN_OUTCOME_FIELDS, 'run_outcome', errors)
  if (!RUN_STATUSES.has(runOutcome.status)) errors.push(`run_outcome.status must be one of: ${[...RUN_STATUSES].join(', ')}`)
  if (!isNonEmptyString(runOutcome.summary)) errors.push('run_outcome.summary must be a non-empty string')
  for (const field of ['total_actions', 'errors', 'warnings']) {
    requireNonNegativeInteger(runOutcome[field], `run_outcome.${field}`, errors)
  }
}

function validateGate(gate, errors) {
  if (!isObject(gate)) {
    errors.push('gate must be an object')
    return
  }
  requireExactFields(gate, GATE_FIELDS, 'gate', errors)
  if (!isNonEmptyString(gate.gate_id)) errors.push('gate.gate_id must be a non-empty string')
  if (!GATE_DECISIONS.has(gate.decision)) errors.push('gate.decision must be "pass" or "fail"')
  if (typeof gate.passed !== 'boolean') errors.push('gate.passed must be a boolean')
  validateStringArray(gate.errors, 'gate.errors', errors)
  validateStringArray(gate.warnings, 'gate.warnings', errors)
}

function validateIntents(intents, errors) {
  if (!Array.isArray(intents)) {
    errors.push('intents must be an array')
    return
  }
  if (intents.length > 2) errors.push(`intents must contain at most 2 entries, got ${intents.length}`)

  intents.forEach((intent, index) => {
    const label = `intents[${index}]`
    if (!isObject(intent)) {
      errors.push(`${label} must be an object`)
      return
    }
    requireExactFields(intent, INTENT_FIELDS, label, errors)
    for (const field of ['domain', 'source', 'reason']) {
      if (!isNonEmptyString(intent[field])) errors.push(`${label}.${field} must be a non-empty string`)
    }
    if (typeof intent.score !== 'number' || !Number.isFinite(intent.score) || intent.score < 0 || intent.score > 1) {
      errors.push(`${label}.score must be a finite number between 0 and 1`)
    }
    if (!Array.isArray(intent.seed_skill_ids)) {
      errors.push(`${label}.seed_skill_ids must be an array`)
    } else if (intent.seed_skill_ids.some((skillId) => !isNonEmptyString(skillId) || !skillId.startsWith('skl_'))) {
      errors.push(`${label}.seed_skill_ids entries must begin with "skl_"`)
    }
    requireNonNegativeInteger(intent.max_analysis_budget, `${label}.max_analysis_budget`, errors)
  })
}

function validateOutcomeCounts(counts, errors) {
  if (!isObject(counts)) {
    errors.push('outcome_counts must be an object')
    return
  }
  requireExactFields(counts, new Set(OUTCOME_COUNT_FIELDS), 'outcome_counts', errors)
  for (const field of OUTCOME_COUNT_FIELDS) {
    requireNonNegativeInteger(counts[field], `outcome_counts.${field}`, errors)
  }
}

function validateCrossFieldConsistency(summary, errors) {
  const gate = summary.gate
  const runOutcome = summary.run_outcome
  const counts = summary.outcome_counts
  if (!isObject(gate) || !isObject(runOutcome) || !isObject(counts)) return

  if (typeof gate.passed === 'boolean' && GATE_DECISIONS.has(gate.decision)) {
    const expectedDecision = gate.passed ? 'pass' : 'fail'
    if (gate.decision !== expectedDecision) errors.push(`gate.decision must be "${expectedDecision}" when gate.passed is ${gate.passed}`)
  }
  if (Array.isArray(gate.errors) && gate.passed === true && gate.errors.length > 0) {
    errors.push('gate.errors must be empty when gate.passed is true')
  }
  if (Array.isArray(gate.errors) && gate.passed === false && gate.errors.length === 0) {
    errors.push('gate.errors must be non-empty when gate.passed is false')
  }

  const countValues = OUTCOME_COUNT_FIELDS.map((field) => counts[field])
  if (countValues.every((value) => Number.isInteger(value) && value >= 0) && Number.isInteger(runOutcome.total_actions)) {
    const expectedActions = countValues.reduce((total, value) => total + value, 0)
    if (runOutcome.total_actions !== expectedActions) {
      errors.push(`run_outcome.total_actions must equal summed outcome_counts (${expectedActions})`)
    }
  }

  if (Number.isInteger(runOutcome.errors)) {
    if (runOutcome.errors === 0 && ['failed', 'reply_blocked'].includes(runOutcome.status)) {
      errors.push(`run_outcome.status "${runOutcome.status}" requires run_outcome.errors > 0`)
    }
    if (runOutcome.errors > 0 && ['success', 'no_pack_clean'].includes(runOutcome.status)) {
      errors.push(`run_outcome.status "${runOutcome.status}" requires run_outcome.errors = 0`)
    }
  }
  if (gate.passed === false && !['failed', 'reply_blocked'].includes(runOutcome.status)) {
    errors.push('a failed gate requires run_outcome.status "failed" or "reply_blocked"')
  }
  if (gate.passed === true && ['failed', 'reply_blocked'].includes(runOutcome.status)) {
    errors.push('a passing gate cannot have a failed or reply_blocked run outcome')
  }
}

function requireExactFields(value, allowedFields, label, errors) {
  for (const field of allowedFields) {
    if (!(field in value)) errors.push(`${label}.${field}: missing required field`)
  }
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) errors.push(`${label}.${field}: unknown field`)
  }
}

function validateDigest(value, label, errors) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    errors.push(`${label} must be a lowercase SHA-256 hex digest`)
  }
}

function validateStringArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`)
  } else if (value.some((entry) => typeof entry !== 'string')) {
    errors.push(`${label} entries must be strings`)
  }
}

function requireNonNegativeInteger(value, label, errors) {
  if (!Number.isInteger(value) || value < 0) errors.push(`${label} must be a non-negative integer`)
}

function isIsoTimestamp(value) {
  if (!isNonEmptyString(value)) return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && /T/u.test(value)
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}
