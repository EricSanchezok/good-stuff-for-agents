#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonInput, printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { ROOT } from '../../catalog-data/scripts/lib/catalog-lib.mjs'

const VALID_STATES = new Set([
  'no_op',
  'written_updated_validated',
  'evaluated',
  'promotion_ready',
  'promoted_published',
  'deprecated_removed',
  'blocked',
])

const VALID_OBJECT_TYPES = new Set([
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

const EVALUATION_OUTCOMES = new Set(['passed', 'needs_work', 'rejected'])

const FORBIDDEN_MARKERS = ['Push: Pending', 'Commits: Pending', 'Evaluations: Pending', 'unknown owner', 'Pending', 'TBD', 'TODO']

try {
  const summary = readJsonInput()
  const errors = validateAll(summary)

  if (errors.length > 0) {
    printResult({ ok: false, errors, counts: {} })
    process.exit(2)
  }

  const counts = computeCounts(summary)
  printResult({ ok: true, errors: [], counts })
} catch (error) {
  printResult({ ok: false, errors: [error.message], counts: {} })
  process.exit(2)
}

function validateAll(summary) {
  const errors = []

  if (!summary || typeof summary !== 'object') {
    errors.push('Input must be a JSON object')
    return errors
  }

  if (summary.schema_version !== 1) {
    errors.push(`schema_version must be 1, got ${summary.schema_version}`)
  }

  const requiredFields = ['run_id', 'authorization', 'starting_state', 'maintenance_preflight', 'growth', 'terminal_states', 'publishing_final_gates', 'git', 'blockers', 'next_run_priorities']
  for (const field of requiredFields) {
    if (!(field in summary)) {
      errors.push(`missing required top-level field "${field}"`)
    }
  }

  validateTerminalStates(summary.terminal_states || [], summary, errors)
  validateNextRunPriorities(summary, errors)
  validateForbiddenMarkers(summary, errors)
  validateGitSection(summary.git, errors)
  validatePromotionReadyWithCommit(summary, errors)
  validateFilePaths(summary.terminal_states || [], errors)
  validateNextRunPriorityBackRefs(summary, errors)

  return errors
}

function validateTerminalStates(items, summary, errors) {
  if (!Array.isArray(items)) {
    errors.push('terminal_states must be an array')
    return
  }
  if (items.length === 0) {
    errors.push('terminal_states must be a non-empty array')
    return
  }

  const objectIds = new Set()

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    const label = `terminal_states[${i}]`

    if (!item || typeof item !== 'object') {
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

    if (item.state) validatePerState(item, label, errors)
  }
}

function validatePerState(item, label, errors) {
  switch (item.state) {
    case 'blocked': {
      if (!item.owner || !String(item.owner).trim()) {
        errors.push(`${label}: blocked state requires non-empty "owner"`)
      }
      if (!item.reason || !String(item.reason).trim()) {
        errors.push(`${label}: blocked state requires non-empty "reason"`)
      }
      if (!item.blocked_reason || !String(item.blocked_reason).trim()) {
        errors.push(`${label}: blocked state requires non-empty "blocked_reason"`)
      }
      if (!item.next_action || !String(item.next_action).trim()) {
        errors.push(`${label}: blocked state requires non-empty "next_action"`)
      }
      break
    }

    case 'no_op': {
      if (!item.reason || !String(item.reason).trim()) {
        errors.push(`${label}: no_op state requires non-empty "reason" proving no eligible action existed`)
      }
      break
    }

    case 'written_updated_validated': {
      if (!Array.isArray(item.verification) || item.verification.length === 0) {
        errors.push(`${label}: written_updated_validated requires non-empty "verification" array`)
      }
      break
    }

    case 'evaluated': {
      if (!item.evaluation_outcome || !EVALUATION_OUTCOMES.has(item.evaluation_outcome)) {
        errors.push(`${label}: evaluated state requires "evaluation_outcome" to be one of: passed, needs_work, rejected`)
      }
      break
    }

    case 'promoted_published': {
      if (!item.path || !String(item.path).trim()) {
        errors.push(`${label}: promoted_published requires non-empty "path"`)
      }
      break
    }

    case 'deprecated_removed': {
      if (!item.policy_citation || !String(item.policy_citation).trim()) {
        errors.push(`${label}: deprecated_removed requires non-empty "policy_citation"`)
      }
      break
    }
  }
}

function validatePromotionReadyWithCommit(summary, errors) {
  if (summary.authorization && summary.authorization.commits_allowed === true) {
    const promotionReadyItems = (summary.terminal_states || []).filter(
      (item) => item.state === 'promotion_ready'
    )
    for (let i = 0; i < promotionReadyItems.length; i += 1) {
      const label = `terminal_states[${(summary.terminal_states || []).indexOf(promotionReadyItems[i])}]`
      errors.push(
        `${label}: state "promotion_ready" is not a valid terminal state when commits_allowed is true — ` +
        'must be promoted_published'
      )
    }
  }
}

function validateNextRunPriorities(summary, errors) {
  if (!summary.next_run_priorities || !Array.isArray(summary.next_run_priorities)) {
    errors.push('next_run_priorities must be an array')
    return
  }

  const terminalIds = new Set(
    (summary.terminal_states || []).map((item) => item.object_id).filter(Boolean)
  )

  for (let i = 0; i < summary.next_run_priorities.length; i += 1) {
    const priority = summary.next_run_priorities[i]
    const label = `next_run_priorities[${i}]`

    if (!priority.object_id || !String(priority.object_id).trim()) {
      errors.push(`${label}: missing required field "object_id"`)
      continue
    }

    if (!terminalIds.has(priority.object_id)) {
      errors.push(
        `${label}: object_id "${priority.object_id}" is not in terminal_states — ` +
        'next-run priorities cannot introduce new objects'
      )
    }
  }
}

function validateForbiddenMarkers(summary, errors) {
  function check(value, path) {
    if (typeof value !== 'string') return
    for (const marker of FORBIDDEN_MARKERS) {
      if (value.includes(marker)) {
        errors.push(`${path}: contains forbidden marker "${marker}" in "${value}"`)
        return
      }
    }
  }

  function walk(obj, prefix) {
    if (!obj || typeof obj !== 'object') return
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i += 1) {
        walk(obj[i], `${prefix}[${i}]`)
      }
      return
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key]
      if (typeof val === 'string') check(val, `${prefix}.${key}`)
      else if (typeof val === 'object' && val !== null) walk(val, `${prefix}.${key}`)
    }
  }

  walk(summary, 'summary')
}

function validateGitSection(git, errors) {
  if (!git || typeof git !== 'object') {
    errors.push('git section must be an object')
    return
  }

  const gitRequired = ['authorization', 'execution_model', 'allowed_paths', 'message']
  for (const field of gitRequired) {
    if (!(field in git) || git[field] === null || git[field] === undefined) {
      errors.push(`git.${field}: missing required field`)
    }
  }

  if (git.message) {
    const str = String(git.message)
    const forbidden = ['Push: Pending', 'Commits: Pending', 'Evaluations: Pending', 'Pending']
    for (const marker of forbidden) {
      if (str.includes(marker)) {
        errors.push(`git.message: contains forbidden marker "${marker}" — must describe actual state`)
      }
    }
  }
}

function validateFilePaths(terminalStates, errors) {
  for (let i = 0; i < terminalStates.length; i += 1) {
    const item = terminalStates[i]
    if (!item || !item.path) continue
    const label = `terminal_states[${i}]`

    const shouldSkip = item.state === 'deprecated_removed' ||
      (item.state === 'blocked' && item.blocked_reason === 'missing-artifact')

    if (shouldSkip) continue

    const fullPath = join(ROOT, item.path)
    if (!existsSync(fullPath)) {
      errors.push(`${label}: path "${item.path}" does not exist on disk`)
    }
  }
}

function validateNextRunPriorityBackRefs(summary, errors) {
  const priorities = summary.next_run_priorities || []
  const terminalStates = summary.terminal_states || []

  for (let i = 0; i < priorities.length; i += 1) {
    const priority = priorities[i]
    if (!priority.object_id) continue

    const label = `next_run_priorities[${i}]`

    const terminalItem = terminalStates.find(
      (ts) => ts.object_id === priority.object_id
    )

    if (!terminalItem) continue

    if (terminalItem.state !== 'blocked') {
      const validStates = new Set([
        'no_op',
        'written_updated_validated',
        'evaluated',
        'promotion_ready',
        'promoted_published',
        'deprecated_removed',
      ])

      if (!validStates.has(terminalItem.state)) {
        errors.push(
          `${label}: object_id "${priority.object_id}" points to terminal state "${terminalItem.state}" ` +
          `which is not a completed terminal state — priorities must reference completed or blocked items`
        )
      }
    }
  }
}

function computeCounts(summary) {
  const states = summary.terminal_states || []
  const counts = {}
  for (const state of VALID_STATES) counts[state] = 0
  for (const item of states) {
    if (item.state && counts[item.state] !== undefined) counts[item.state] += 1
  }
  counts.total = states.length
  return counts
}
