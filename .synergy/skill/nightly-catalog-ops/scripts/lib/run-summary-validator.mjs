export const VALID_STATES = new Set([
  'no_op',
  'written_updated_validated',
  'evaluated',
  'promotion_ready',
  'promoted_published',
  'deprecated_removed',
  'blocked',
])

export const VALID_OBJECT_TYPES = new Set([
  'source',
  'skill',
  'analysis',
  'relation',
  'pack',
  'index',
  'report',
  'public_page',
])

const REQUIRED_TERMINAL_FIELDS = [
  'object_type',
  'object_id',
  'path',
  'state',
  'owner',
  'reason',
]

const REQUIRED_FULL_SUMMARY_FIELDS = [
  'run_id',
  'authorization',
  'starting_state',
  'maintenance_preflight',
  'growth',
  'terminal_states',
  'publishing_final_gates',
  'git',
  'blockers',
  'next_run_priorities',
]

const EVALUATION_OUTCOMES = new Set(['passed', 'needs_work', 'rejected'])
const AUTHORIZATION_MODES = new Map([
  ['read_only', { commitsAllowed: false, pushesAllowed: false }],
  ['local_write', { commitsAllowed: false, pushesAllowed: false }],
  ['commit', { commitsAllowed: true, pushesAllowed: false }],
  ['push', { commitsAllowed: true, pushesAllowed: true }],
  ['scheduled_automation', { commitsAllowed: true, pushesAllowed: true }],
])
const AUTHORIZATION_TRIGGERS = new Set(['scheduled', 'manual', 'user_request'])
const AUTHORIZATION_SOURCES = new Set(['user', 'scheduled_automation'])
const CATALOG_COUNT_FIELDS = ['skills', 'sources', 'packs', 'published_packs']
const PUBLICATION_MODES = new Set(['normal', 'recovery'])
const TARGET_OUTCOMES = new Set([
  'needs_work',
  'blocked',
  'rejected',
  'promotion_ready',
  'promoted_published',
])
const ATTEMPT_OUTCOMES = new Set([
  'needs_work',
  'blocked',
  'rejected',
  'passed',
  'promotion_ready',
  'promoted_published',
])
const EARLY_STOP_BLOCKER_CLASSES = new Set(['policy', 'human_decision'])
const NO_PUBLISH_CODES = new Set(['no_eligible_targets', 'targets_exhausted', 'blocked'])
const FORBIDDEN_MARKERS = [
  'Push: Pending',
  'Commits: Pending',
  'Evaluations: Pending',
  'unknown owner',
  'Pending',
  'TBD',
  'TODO',
]

export function validateRunSummary(summary, { scope = 'full', requireCurrentSchema = false } = {}) {
  const errors = []

  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    errors.push('Input must be a JSON object')
    return errors
  }

  if (![1, 2].includes(summary.schema_version)) {
    errors.push(`schema_version must be 1 or 2, got ${summary.schema_version}`)
  }
  if (requireCurrentSchema && summary.schema_version !== 2) {
    errors.push(`new run summaries must use schema_version 2, got ${summary.schema_version}`)
  }

  if (scope === 'full') {
    for (const field of REQUIRED_FULL_SUMMARY_FIELDS) {
      if (!(field in summary)) {
        errors.push(`missing required top-level field "${field}"`)
      }
    }
  }
  if (summary.schema_version === 2) {
    if (!('publication_progress' in summary)) {
      errors.push('missing required top-level field "publication_progress"')
    }
    if (!('touched_paths_manifest' in summary)) {
      errors.push('missing required top-level field "touched_paths_manifest"')
    } else {
      requireNonEmptyString(summary.touched_paths_manifest, 'touched_paths_manifest must be a non-empty string', errors)
    }
    if (!('touched_paths_manifest_sha256' in summary)) {
      errors.push('missing required top-level field "touched_paths_manifest_sha256"')
    } else if (!/^[a-f0-9]{64}$/.test(summary.touched_paths_manifest_sha256)) {
      errors.push('touched_paths_manifest_sha256 must be a lowercase SHA-256 hex digest')
    }
    validateAuthorization(summary.authorization, errors)
    validateStartingState(summary.starting_state, errors)
  }

  validateTerminalStates(summary.terminal_states, errors, summary.schema_version)
  validateNextRunPriorities(summary, errors)
  validateForbiddenMarkers(summary, errors)
  if ('publication_progress' in summary || summary.schema_version === 2) {
    validatePublicationProgress(summary, errors)
  }

  if (scope === 'full') {
    validateGitSection(summary.git, errors)
  }

  return errors
}

export function computeTerminalStateCounts(summary, { errorCount } = {}) {
  const states = Array.isArray(summary?.terminal_states) ? summary.terminal_states : []
  const counts = {}
  for (const state of VALID_STATES) counts[state] = 0
  for (const item of states) {
    if (item?.state && counts[item.state] !== undefined) counts[item.state] += 1
  }
  counts.total = states.length
  if (Number.isInteger(errorCount)) counts.errors = errorCount
  return counts
}

function validateAuthorization(authorization, errors) {
  if (!authorization || typeof authorization !== 'object' || Array.isArray(authorization)) {
    errors.push('authorization must be an object')
    return
  }

  for (const field of ['mode', 'commits_allowed', 'pushes_allowed', 'trigger', 'operator', 'source']) {
    if (!(field in authorization)) errors.push(`authorization.${field}: missing required field`)
  }

  const expected = AUTHORIZATION_MODES.get(authorization.mode)
  if (!expected) {
    errors.push(`authorization.mode must be one of: ${[...AUTHORIZATION_MODES.keys()].join(', ')}`)
  }
  if (typeof authorization.commits_allowed !== 'boolean') {
    errors.push('authorization.commits_allowed must be a boolean')
  }
  if (typeof authorization.pushes_allowed !== 'boolean') {
    errors.push('authorization.pushes_allowed must be a boolean')
  }
  if (!AUTHORIZATION_TRIGGERS.has(authorization.trigger)) {
    errors.push(`authorization.trigger must be one of: ${[...AUTHORIZATION_TRIGGERS].join(', ')}`)
  }
  requireNonEmptyString(authorization.operator, 'authorization.operator must be a non-empty string', errors)
  if (!AUTHORIZATION_SOURCES.has(authorization.source)) {
    errors.push(`authorization.source must be one of: ${[...AUTHORIZATION_SOURCES].join(', ')}`)
  }
  if (authorization.source === 'scheduled_automation' && authorization.trigger !== 'scheduled') {
    errors.push('authorization.trigger must be "scheduled" when authorization.source is "scheduled_automation"')
  }
  if (authorization.source === 'user' && !['manual', 'user_request'].includes(authorization.trigger)) {
    errors.push('authorization.trigger must be "manual" or "user_request" when authorization.source is "user"')
  }
  if (/(?:issue|demand)/i.test(authorization.operator ?? '')) {
    errors.push('authorization.operator must not be issue- or demand-derived')
  }

  if (expected && typeof authorization.commits_allowed === 'boolean' && authorization.commits_allowed !== expected.commitsAllowed) {
    errors.push(`authorization.commits_allowed must be ${expected.commitsAllowed} when authorization.mode is "${authorization.mode}"`)
  }
  if (expected && typeof authorization.pushes_allowed === 'boolean' && authorization.pushes_allowed !== expected.pushesAllowed) {
    errors.push(`authorization.pushes_allowed must be ${expected.pushesAllowed} when authorization.mode is "${authorization.mode}"`)
  }
}

function validateStartingState(startingState, errors) {
  if (!startingState || typeof startingState !== 'object' || Array.isArray(startingState)) {
    errors.push('starting_state must be an object')
    return
  }

  for (const field of ['branch', 'head', 'working_tree_clean', 'unrelated_changes_exist', 'catalog_counts']) {
    if (!(field in startingState)) errors.push(`starting_state.${field}: missing required field`)
  }
  requireNonEmptyString(startingState.branch, 'starting_state.branch must be a non-empty string', errors)
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(startingState.head ?? '')) {
    errors.push('starting_state.head must be a full lowercase Git object ID')
  }
  if (typeof startingState.working_tree_clean !== 'boolean') {
    errors.push('starting_state.working_tree_clean must be a boolean')
  }
  if (typeof startingState.unrelated_changes_exist !== 'boolean') {
    errors.push('starting_state.unrelated_changes_exist must be a boolean')
  }

  const counts = startingState.catalog_counts
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) {
    errors.push('starting_state.catalog_counts must be an object')
    return
  }
  for (const field of CATALOG_COUNT_FIELDS) {
    if (!(field in counts)) {
      errors.push(`starting_state.catalog_counts.${field}: missing required field`)
    } else if (!Number.isInteger(counts[field]) || counts[field] < 0) {
      errors.push(`starting_state.catalog_counts.${field} must be a non-negative integer`)
    }
  }
}

function validateTerminalStates(items, errors, schemaVersion) {
  if (!Array.isArray(items)) {
    errors.push('terminal_states must be a non-empty array')
    return
  }
  if (items.length === 0) {
    errors.push('terminal_states must be a non-empty array')
    return
  }

  const objectIds = new Set()

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    const label = `terminal_states[${index}]`

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${label}: must be an object`)
      continue
    }

    for (const field of REQUIRED_TERMINAL_FIELDS) {
      if (item[field] === undefined || item[field] === null) {
        errors.push(`${label}: missing required field "${field}"`)
      }
    }

    if (item.object_type && !VALID_OBJECT_TYPES.has(item.object_type)) {
      errors.push(`${label}: invalid object_type "${item.object_type}"`)
    }

    if (item.state && !VALID_STATES.has(item.state)) {
      errors.push(`${label}: invalid state "${item.state}"`)
    }

    if (item.object_id && objectIds.has(item.object_id)) {
      errors.push(`${label}: duplicate object_id "${item.object_id}"`)
    }
    if (item.object_id) objectIds.add(item.object_id)

    if (item.state) validatePerState(item, label, errors, schemaVersion)
  }
}

function validatePerState(item, label, errors, schemaVersion) {
  switch (item.state) {
    case 'blocked':
      requireNonEmptyString(item.owner, `${label}: blocked state requires non-empty "owner"`, errors)
      requireNonEmptyString(item.reason, `${label}: blocked state requires non-empty "reason"`, errors)
      requireNonEmptyString(item.blocked_reason, `${label}: blocked state requires non-empty "blocked_reason"`, errors)
      requireNonEmptyString(item.next_action, `${label}: blocked state requires non-empty "next_action"`, errors)
      break
    case 'no_op':
      requireNonEmptyString(item.reason, `${label}: no_op state requires non-empty "reason" proving no eligible action existed`, errors)
      break
    case 'written_updated_validated':
      if (!Array.isArray(item.verification) || item.verification.length === 0) {
        errors.push(`${label}: written_updated_validated requires non-empty "verification" array`)
      }
      break
    case 'evaluated':
      if (!item.evaluation_outcome || !EVALUATION_OUTCOMES.has(item.evaluation_outcome)) {
        errors.push(`${label}: evaluated state requires "evaluation_outcome" to be one of: passed, needs_work, rejected`)
      }
      break
    case 'promotion_ready':
      requireNonEmptyString(item.next_action, `${label}: promotion_ready state requires non-empty "next_action" naming the promoter skill`, errors)
      break
    case 'promoted_published':
      requireNonEmptyString(item.path, `${label}: promoted_published requires non-empty "path"`, errors)
      if (schemaVersion === 2) {
        if (item.object_type === 'pack') {
          const canonicalPath = `catalog/packs/published/${item.object_id}/pack.yaml`
          if (item.path !== canonicalPath) {
            errors.push(`${label}: promoted_published pack path must be canonical published record path "${canonicalPath}"`)
          }
        }
        if (!Array.isArray(item.verification) || item.verification.length === 0 || item.verification.some((command) => !isNonEmptyString(command))) {
          errors.push(`${label}: promoted_published requires non-empty "verification" array of publishing check commands`)
        }
      }
      break
    case 'deprecated_removed':
      requireNonEmptyString(item.policy_citation, `${label}: deprecated_removed requires non-empty "policy_citation"`, errors)
      break
  }
}

function validateNextRunPriorities(summary, errors) {
  if (!Array.isArray(summary.next_run_priorities)) {
    errors.push('next_run_priorities must be an array')
    return
  }

  const terminalIds = new Set(
    (Array.isArray(summary.terminal_states) ? summary.terminal_states : [])
      .map((item) => item?.object_id)
      .filter(Boolean)
  )

  for (let index = 0; index < summary.next_run_priorities.length; index += 1) {
    const priority = summary.next_run_priorities[index]
    const label = `next_run_priorities[${index}]`

    if (!priority || typeof priority !== 'object' || Array.isArray(priority)) {
      errors.push(`${label}: must be an object`)
      continue
    }
    if (!isNonEmptyString(priority.object_id)) {
      errors.push(`${label}: missing required field "object_id"`)
      continue
    }
    if (!terminalIds.has(priority.object_id)) {
      errors.push(`${label}: object_id "${priority.object_id}" is not in terminal_states — next-run priorities cannot introduce new objects`)
    }
  }
}

function validatePublicationProgress(summary, errors) {
  const progress = summary.publication_progress
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    errors.push('publication_progress must be an object')
    return
  }

  if (!PUBLICATION_MODES.has(progress.mode)) {
    errors.push('publication_progress.mode must be one of: normal, recovery')
  }
  if (typeof progress.published !== 'boolean') {
    errors.push('publication_progress.published must be a boolean')
  }

  validateRecoveryTrigger(summary, progress, errors)

  if (!Array.isArray(progress.targets_attempted)) {
    errors.push('publication_progress.targets_attempted must be an array')
  } else {
    if (progress.targets_attempted.length > 2) {
      errors.push('publication_progress.targets_attempted must contain at most 2 targets')
    }
    const targetIds = new Set()
    progress.targets_attempted.forEach((target, index) => {
      validatePublicationTarget(target, index, errors)
      if (!target?.object_id) return
      if (targetIds.has(target.object_id)) {
        errors.push(`publication_progress.targets_attempted[${index}]: duplicate object_id "${target.object_id}"`)
      }
      targetIds.add(target.object_id)
    })
  }

  validatePublicationConsistency(summary, progress, errors)
  validateNoPublicationProof(summary, progress, errors)
}

function validateRecoveryTrigger(summary, progress, errors) {
  const trigger = progress.recovery_trigger
  if (!trigger || typeof trigger !== 'object' || Array.isArray(trigger)) {
    errors.push('publication_progress.recovery_trigger must be an object')
    return
  }

  const fullRuns = trigger.completed_full_runs_since_publication
  const days = trigger.days_since_publication
  if (!Number.isInteger(fullRuns) || fullRuns < 0) {
    errors.push('publication_progress.recovery_trigger.completed_full_runs_since_publication must be a non-negative integer')
  }
  if (typeof days !== 'number' || !Number.isFinite(days) || days < 0) {
    errors.push('publication_progress.recovery_trigger.days_since_publication must be a non-negative number')
  }
  requireNonEmptyString(trigger.evidence, 'publication_progress.recovery_trigger.evidence must be a non-empty string', errors)

  const fullRunsValid = Number.isInteger(fullRuns) && fullRuns >= 0
  const daysValid = typeof days === 'number' && Number.isFinite(days) && days >= 0
  if (!fullRunsValid || !daysValid) return

  const hasPublishedPack = summary.starting_state?.catalog_counts?.published_packs > 0
  const recoveryRequired = fullRuns >= 3 || (hasPublishedPack && days >= 7)
  if (recoveryRequired && progress.mode !== 'recovery') {
    errors.push('publication_progress.mode must be "recovery" when 3 completed full runs or 7 days have elapsed since publication')
  } else if (!recoveryRequired && progress.mode === 'recovery') {
    errors.push('publication_progress.mode "recovery" requires at least 3 completed full runs or 7 days since publication')
  }
}

function validatePublicationTarget(target, index, errors) {
  const label = `publication_progress.targets_attempted[${index}]`
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    errors.push(`${label}: must be an object`)
    return
  }

  requireNonEmptyString(target.object_id, `${label}.object_id must be a non-empty string`, errors)
  requireNonEmptyString(target.selection_reason, `${label}.selection_reason must be a non-empty string`, errors)

  if (!Array.isArray(target.attempts) || target.attempts.length === 0) {
    errors.push(`${label}.attempts must be a non-empty array`)
  } else {
    if (target.attempts.length > 3) {
      errors.push(`${label}.attempts must contain at most 3 substantive repair attempts`)
    }
    target.attempts.forEach((attempt, attemptIndex) => validateRepairAttempt(attempt, attemptIndex, label, errors))
  }

  if (!TARGET_OUTCOMES.has(target.outcome)) {
    errors.push(`${label}.outcome must be one of: ${[...TARGET_OUTCOMES].join(', ')}`)
  } else if (
    Array.isArray(target.attempts) &&
    target.attempts.length > 0 &&
    target.attempts[target.attempts.length - 1]?.outcome !== target.outcome
  ) {
    errors.push(`${label}.outcome must match the final substantive repair attempt outcome`)
  }

  if (!('blocker_class' in target)) {
    errors.push(`${label}: missing required field "blocker_class"`)
  } else if (target.blocker_class !== null && !isNonEmptyString(target.blocker_class)) {
    errors.push(`${label}.blocker_class must be null or a non-empty string`)
  }

  if (target.outcome === 'needs_work' && Array.isArray(target.attempts)) {
    if (target.attempts.length === 3) {
      errors.push(`${label}: target that remains unsuccessful after 3 substantive repair attempts must end as rejected`)
    } else if (!EARLY_STOP_BLOCKER_CLASSES.has(target.blocker_class)) {
      errors.push(`${label}: needs_work cannot be terminal before 3 substantive repair attempts unless blocker_class is policy or human_decision`)
    }
  }
}

function validateRepairAttempt(attempt, index, targetLabel, errors) {
  const label = `${targetLabel}.attempts[${index}]`
  if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)) {
    errors.push(`${label}: must be an object`)
    return
  }
  if (attempt.attempt !== index + 1) {
    errors.push(`${label}.attempt must equal ${index + 1}`)
  }
  if (!ATTEMPT_OUTCOMES.has(attempt.outcome)) {
    errors.push(`${label}.outcome must be one of: ${[...ATTEMPT_OUTCOMES].join(', ')}`)
  }
  requireNonEmptyString(attempt.evidence, `${label}.evidence must be a non-empty string`, errors)
}

function validatePublicationConsistency(summary, progress, errors) {
  const terminalStates = Array.isArray(summary.terminal_states) ? summary.terminal_states : []
  const packTerminalStates = terminalStates.filter((item) => item?.object_type === 'pack')
  const publishedTerminalIds = new Set(
    packTerminalStates
      .filter((item) => item?.state === 'promoted_published')
      .map((item) => item.object_id)
  )
  const targets = Array.isArray(progress.targets_attempted) ? progress.targets_attempted : []
  const publishedTargetIds = new Set(
    targets
      .filter((target) => target?.outcome === 'promoted_published')
      .map((target) => target.object_id)
  )
  const hasPublishedTerminal = publishedTerminalIds.size > 0
  const hasPublishedTarget = publishedTargetIds.size > 0

  if (hasPublishedTerminal && progress.published !== true) {
    errors.push('publication_progress.published must be true when terminal_states contains promoted_published')
  }
  if (progress.published === true && !hasPublishedTerminal) {
    errors.push('publication_progress.published=true requires a promoted_published terminal state')
  }
  if (progress.published === true && !hasPublishedTarget) {
    errors.push('publication_progress.published=true requires a target with outcome promoted_published')
  }
  if (hasPublishedTarget && progress.published !== true) {
    errors.push('a publication target with outcome promoted_published requires publication_progress.published=true')
  }
  if (
    progress.published === true &&
    (
      [...publishedTargetIds].some((objectId) => !publishedTerminalIds.has(objectId)) ||
      [...publishedTerminalIds].some((objectId) => !publishedTargetIds.has(objectId))
    )
  ) {
    errors.push('publication_progress published targets must correspond by object_id to all promoted_published pack terminal states')
  }

  const targetIds = new Set(targets.map((target) => target?.object_id).filter(Boolean))
  const packTerminalsById = new Map(
    packTerminalStates
      .filter((item) => item?.object_id)
      .map((item) => [item.object_id, item])
  )
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index]
    if (!target?.object_id) continue
    const terminal = packTerminalsById.get(target.object_id)
    if (!terminal) {
      errors.push(`publication target "${target.object_id}" requires a matching pack terminal state`)
    } else if (!publicationOutcomeMatchesTerminal(target.outcome, terminal)) {
      errors.push(`publication_progress.targets_attempted[${index}].outcome "${target.outcome}" does not match pack terminal state for "${target.object_id}"`)
    }
  }
  for (const objectId of packTerminalsById.keys()) {
    if (!targetIds.has(objectId)) {
      errors.push(`pack terminal state "${objectId}" requires a matching publication target`)
    }
  }

  const commitsAllowed = summary.authorization?.commits_allowed === true
  const promotionReadyTerminal = terminalStates.some((item) => item?.state === 'promotion_ready')
  const passingEvaluatedTarget = terminalStates.some(
    (item) => item?.object_type === 'pack' &&
      item.state === 'evaluated' &&
      item.evaluation_outcome === 'passed' &&
      targetIds.has(item.object_id)
  )
  const passingTarget = targets.some(
    (target) => target?.outcome === 'promotion_ready' ||
      target?.attempts?.some((attempt) => attempt?.outcome === 'passed' || attempt?.outcome === 'promotion_ready')
  )

  if (commitsAllowed && promotionReadyTerminal) {
    errors.push('promotion_ready terminal state cannot remain when authorization.commits_allowed is true')
  }
  if (commitsAllowed && progress.published === false && (passingEvaluatedTarget || passingTarget)) {
    errors.push('passing or promotion-ready publication target cannot remain unpublished when authorization.commits_allowed is true')
  }
}

function publicationOutcomeMatchesTerminal(outcome, terminal) {
  switch (outcome) {
    case 'promoted_published':
      return terminal.state === 'promoted_published'
    case 'promotion_ready':
      return terminal.state === 'promotion_ready'
    case 'needs_work':
      return terminal.state === 'evaluated' && terminal.evaluation_outcome === 'needs_work'
    case 'rejected':
      return terminal.state === 'evaluated' && terminal.evaluation_outcome === 'rejected'
    case 'blocked':
      return terminal.state === 'blocked'
    default:
      return false
  }
}

function validateNoPublicationProof(summary, progress, errors) {
  if (progress.published !== false) {
    if (progress.no_publish_reason !== null) {
      errors.push('publication_progress.no_publish_reason must be null when published=true')
    }
    return
  }

  const reason = progress.no_publish_reason
  if (!reason || typeof reason !== 'object' || Array.isArray(reason)) {
    errors.push('publication_progress.no_publish_reason must be an object when published=false')
    return
  }
  if (!NO_PUBLISH_CODES.has(reason.code)) {
    errors.push(`publication_progress.no_publish_reason.code must be one of: ${[...NO_PUBLISH_CODES].join(', ')}`)
  }
  requireNonEmptyString(reason.summary, 'publication_progress.no_publish_reason.summary must be a non-empty string', errors)
  if (!Array.isArray(reason.evidence) || reason.evidence.length === 0 || reason.evidence.some((item) => !isNonEmptyString(item))) {
    errors.push('publication_progress.no_publish_reason.evidence must be a non-empty array of non-empty strings')
  }

  const targets = Array.isArray(progress.targets_attempted) ? progress.targets_attempted : []
  if (targets.length === 0 && reason.code !== 'no_eligible_targets') {
    errors.push('publication_progress.no_publish_reason.code must be "no_eligible_targets" when no targets were attempted')
  }
  if (targets.length > 0 && reason.code === 'no_eligible_targets') {
    errors.push('publication_progress.no_publish_reason.code cannot be "no_eligible_targets" when targets were attempted')
  }
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index]
    const promotionReadyWithoutCommit = target?.outcome === 'promotion_ready' &&
      summary.authorization?.commits_allowed !== true &&
      reason.code === 'blocked'
    if (!['needs_work', 'blocked', 'rejected'].includes(target?.outcome) && !promotionReadyWithoutCommit) {
      errors.push(`publication_progress.targets_attempted[${index}]: unpublished run must end as needs_work, blocked, rejected, or authorization-blocked promotion_ready`)
    }
  }
}

function validateForbiddenMarkers(summary, errors) {
  function walk(value, path) {
    if (typeof value === 'string') {
      for (const marker of FORBIDDEN_MARKERS) {
        if (value.includes(marker)) {
          errors.push(`${path}: contains forbidden marker "${marker}" in "${value}"`)
          return
        }
      }
      return
    }
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }
    for (const [key, item] of Object.entries(value)) {
      walk(item, `${path}.${key}`)
    }
  }

  walk(summary, 'summary')
}

function validateGitSection(git, errors) {
  if (!git || typeof git !== 'object' || Array.isArray(git)) {
    errors.push('git section must be an object')
    return
  }

  for (const field of ['authorization', 'execution_model', 'allowed_paths', 'message']) {
    if (!(field in git) || git[field] === null || git[field] === undefined) {
      errors.push(`git.${field}: missing required field`)
    }
  }
}

function requireNonEmptyString(value, message, errors) {
  if (!isNonEmptyString(value)) errors.push(message)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}
