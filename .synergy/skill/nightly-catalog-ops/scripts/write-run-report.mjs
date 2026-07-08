#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonInput, printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { ROOT, writeTextAtomic, ensureDir } from '../../catalog-data/scripts/lib/catalog-lib.mjs'

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
  const errors = validateSummary(summary)

  if (errors.length > 0) {
    printResult({ ok: false, errors })
    process.exit(2)
  }

  const reportPath = writeReport(summary)
  const summaryPath = writeSummary(summary)
  const counts = computeCounts(summary)

  printResult({ ok: true, report_path: reportPath, summary_path: summaryPath, terminal_state_counts: counts })
} catch (error) {
  printResult({ ok: false, errors: [error.message], terminal_state_counts: {} })
  process.exit(2)
}

function validateSummary(summary) {
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

function writeReport(summary) {
  const runId = summary.run_id || 'run_unknown'
  const filenameBase = runId.replace(/^run_/, '')
  const reportDir = join(ROOT, 'reports', 'nightly-catalog-ops')
  ensureDir(reportDir)

  const reportPath = join(reportDir, `${filenameBase}-run.md`)
  const md = renderMarkdown(summary)
  writeFileSync(reportPath, md)

  return reportPath
}

function renderMarkdown(summary) {
  const auth = summary.authorization || {}
  const start = summary.starting_state || {}
  const preflight = summary.maintenance_preflight || {}
  const growth = summary.growth || {}
  const gates = summary.publishing_final_gates || {}
  const git = summary.git || {}
  const blockers = summary.blockers || []
  const priorities = summary.next_run_priorities || []
  const terminalStates = summary.terminal_states || []

  const lines = []

  lines.push(`# Nightly Catalog Run — ${formatRunDate(summary.run_id)}`)
  lines.push('')

  // Authorization
  lines.push('## Authorization')
  lines.push(`- Mode: ${auth.mode || 'unknown'}`)
  lines.push(`- Commits allowed: ${auth.commits_allowed ? 'yes' : 'no'}`)
  lines.push(`- Push allowed: ${auth.pushes_allowed ? 'yes' : 'no'}`)
  lines.push(`- Trigger: ${auth.trigger || 'unknown'}`)
  lines.push(`- Operator: ${auth.operator || 'unknown'}`)
  lines.push('')

  // Starting State
  lines.push('## Starting State')
  lines.push(`- Branch: ${start.branch || 'unknown'}`)
  lines.push(`- Working tree clean: ${start.working_tree_clean ? 'yes' : 'no'}`)
  lines.push(`- Unrelated changes: ${start.unrelated_changes_exist ? 'yes' : 'no'}`)
  if (start.catalog_counts) {
    lines.push(`- Catalog counts: skills=${start.catalog_counts.skills ?? '?'}, sources=${start.catalog_counts.sources ?? '?'}, packs=${start.catalog_counts.packs ?? '?'}, published_packs=${start.catalog_counts.published_packs ?? '?'}`)
  }
  lines.push('')

  // Maintenance Preflight
  lines.push('## Maintenance Preflight')
  lines.push(`- Overall: ${preflight.ok ? 'PASSED' : 'FAILED'}`)
  if (preflight.steps && preflight.steps.length > 0) {
    for (const step of preflight.steps) {
      const status = step.ok ? '✓' : '✗'
      lines.push(`- ${status} ${step.name}${step.error ? ` — ${step.error}` : ''}`)
    }
  }
  lines.push(`- Git clean before growth: ${preflight.git_clean_before_growth ? 'yes' : 'no'}`)
  lines.push('')

  // Growth Summary
  lines.push('## Growth Summary')
  lines.push(`- Overall: ${growth.ok ? 'COMPLETED' : 'FAILED OR SKIPPED'}`)
  if (growth.growth_report) lines.push(`- Growth report: ${growth.growth_report}`)
  if (growth.objects_touched) {
    const ot = growth.objects_touched
    lines.push(`- Objects touched: sources_discovered=${ot.sources_discovered ?? 0}, sources_activated=${ot.sources_activated ?? 0}, skills_extracted=${ot.skills_extracted ?? 0}, skills_normalized=${ot.skills_normalized ?? 0}, analyses_written=${ot.analyses_written ?? 0}, relations_written=${ot.relations_written ?? 0}, packs_synthesized=${ot.packs_synthesized ?? 0}, packs_evaluated=${ot.packs_evaluated ?? 0}`)
  }
  lines.push('')

  // Terminal States
  lines.push('## Terminal States')
  const byState = groupBy(terminalStates, 'state')
  for (const [state, items] of Object.entries(byState)) {
    lines.push(`### ${formatState(state)} (${items.length})`)
    for (const item of items) {
      lines.push(`- **${item.object_id}** (${item.object_type}) — ${item.path || 'n/a'}`)
      lines.push(`  - Owner: ${item.owner || 'unknown'}`)
      lines.push(`  - Reason: ${item.reason || 'n/a'}`)
      if (item.evaluation_outcome) lines.push(`  - Outcome: ${item.evaluation_outcome}`)
      if (item.blocked_reason) lines.push(`  - Blocked: ${item.blocked_reason}`)
      if (item.next_action) lines.push(`  - Next action: ${item.next_action}`)
    }
  }
  lines.push('')

  // Publishing and Final Gates
  lines.push('## Publishing and Final Gates')
  lines.push(`- Overall: ${gates.ok ? 'PASSED' : 'FAILED'}`)
  if (gates.render) lines.push(`- Render: ${gates.render.ok ? 'PASSED' : 'FAILED'} (${gates.render.pages_written ?? 0} pages)`)
  if (gates.drift) lines.push(`- Drift: ${gates.drift.ok ? 'PASSED' : 'FAILED'}`)
  if (gates.links) lines.push(`- Links: ${gates.links.ok ? 'PASSED' : 'FAILED'}`)
  if (gates.boundary) lines.push(`- Public boundary: ${gates.boundary.ok ? 'PASSED' : 'FAILED'}${gates.boundary.issues && gates.boundary.issues.length > 0 ? ` (${gates.boundary.issues.length} issues)` : ''}`)
  if (gates.final_validation) lines.push(`- Final validation: ${gates.final_validation.ok ? 'PASSED' : 'FAILED'}${gates.final_validation.errors && gates.final_validation.errors.length > 0 ? ` (${gates.final_validation.errors.length} errors)` : ''}`)
  lines.push('')

  // Git Actions
  lines.push('## Git Actions')
  lines.push(`- Authorization plan: ${git.authorization || 'unknown'}`)
  lines.push(`- Execution model: ${git.execution_model || 'none'}`)
  lines.push(`- Allowed paths: ${Array.isArray(git.allowed_paths) ? git.allowed_paths.join(', ') || 'none' : 'none'}`)
  lines.push(`- Summary: ${git.message || 'No git actions performed'}`)
  lines.push('')

  // Blockers
  lines.push('## Blockers')
  if (blockers.length === 0) {
    lines.push('_None_')
  } else {
    for (const blocker of blockers) {
      lines.push(`- **${blocker.type || 'unknown'}**: ${blocker.description || 'n/a'}`)
      lines.push(`  - Object: ${blocker.object_id || 'system-level'}`)
      lines.push(`  - Owner: ${blocker.owner || 'unknown'}`)
      lines.push(`  - Next action: ${blocker.next_action || 'n/a'}`)
    }
  }
  lines.push('')

  // Next-Run Priorities
  lines.push('## Next-Run Priorities')
  if (priorities.length === 0) {
    lines.push('_None_')
  } else {
    for (const prio of priorities) {
      lines.push(`- **${prio.priority ?? '?'}**: ${prio.object_id || 'n/a'} — ${prio.action || 'n/a'} (${prio.owner || 'unknown'})`)
    }
  }
  lines.push('')

  return lines.join('\n') + '\n'
}

function writeSummary(summary) {
  const runId = summary.run_id || 'run_unknown'
  const filenameBase = runId.replace(/^run_/, '')
  const reportDir = join(ROOT, 'reports', 'nightly-catalog-ops')
  ensureDir(reportDir)

  const summaryPath = join(reportDir, `${filenameBase}-summary.json`)
  writeTextAtomic(summaryPath, JSON.stringify(summary, null, 2) + '\n')

  return summaryPath
}

function formatRunDate(runId) {
  if (!runId) return 'unknown'
  const match = runId.match(/^run_(\d{4}-\d{2}-\d{2}-\d{6})$/)
  if (match) return match[1].replace(/(\d{4}-\d{2}-\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2:$3:$4')
  return runId.replace(/^run_/, '')
}

function formatState(state) {
  switch (state) {
    case 'no_op': return 'No-op (unchanged)'
    case 'written_updated_validated': return 'Written / Updated / Validated'
    case 'evaluated': return 'Evaluated'
    case 'promotion_ready': return 'Promotion-ready'
    case 'promoted_published': return 'Promoted / Published'
    case 'deprecated_removed': return 'Deprecated / Removed'
    case 'blocked': return 'Blocked'
    default: return state
  }
}

function groupBy(array, key) {
  const result = {}
  for (const item of array) {
    const val = item[key] || 'unknown'
    if (!result[val]) result[val] = []
    result[val].push(item)
  }
  return result
}
