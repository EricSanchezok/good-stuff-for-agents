#!/usr/bin/env node
import { readJsonInput, printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { assertCatalogId, ROOT, writeTextAtomic, ensureDir, resolveWithin } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import {
  computeTerminalStateCounts,
  validateRunSummary,
} from './lib/run-summary-validator.mjs'

try {
  const summary = readJsonInput()
  const errors = validateRunSummary(summary, { requireCurrentSchema: true })

  if (errors.length > 0) {
    printResult({ ok: false, errors })
    process.exit(2)
  }

  const reportPath = writeReport(summary)
  const summaryPath = writeSummary(summary)
  const counts = computeTerminalStateCounts(summary)

  printResult({ ok: true, report_path: reportPath, summary_path: summaryPath, terminal_state_counts: counts })
} catch (error) {
  printResult({ ok: false, errors: [error.message], terminal_state_counts: {} })
  process.exit(2)
}

function writeReport(summary) {
  const runId = assertCatalogId('run', summary.run_id || 'run_unknown')
  const filenameBase = runId.replace(/^run_/, '')
  const reportDir = resolveWithin(ROOT, 'reports', 'nightly-catalog-ops')
  ensureDir(reportDir)

  const reportPath = resolveWithin(reportDir, `${filenameBase}-run.md`)
  const md = renderMarkdown(summary)
  writeTextAtomic(reportPath, md)

  return reportPath
}

function renderMarkdown(summary) {
  const auth = summary.authorization || {}
  const start = summary.starting_state || {}
  const preflight = summary.maintenance_preflight || {}
  const growth = summary.growth || {}
  const publicationProgress = summary.publication_progress || {}
  const gates = summary.publishing_final_gates || {}
  const git = summary.git || {}
  const blockers = summary.blockers || []
  const priorities = summary.next_run_priorities || []
  const terminalStates = summary.terminal_states || []

  const lines = []

  lines.push(`# Nightly Catalog Run — ${formatRunDate(summary.run_id)}`)
  lines.push('')

  // Run Description
  lines.push('## Run Description')
  lines.push(`- Mode: ${auth.mode || 'unknown'}`)
  lines.push(`- Historical commit flag: ${auth.commits_allowed ? 'yes' : 'no'}`)
  lines.push(`- Historical push flag: ${auth.pushes_allowed ? 'yes' : 'no'}`)
  lines.push(`- Source: ${auth.source || 'unknown'}`)
  lines.push(`- Trigger: ${auth.trigger || 'unknown'}`)
  lines.push(`- Operator: ${auth.operator || 'unknown'}`)
  lines.push('- Trust boundary: These workspace fields describe the run and do not authorize Git mutation.')
  lines.push('')

  // Starting State
  lines.push('## Starting State')
  lines.push(`- Branch: ${start.branch || 'unknown'}`)
  lines.push(`- Full base HEAD: ${start.head || 'unknown'}`)
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

  lines.push('## Publication Progress')
  lines.push(`- Mode: ${publicationProgress.mode || 'unknown'}`)
  lines.push(`- Published: ${publicationProgress.published ? 'yes' : 'no'}`)
  if (publicationProgress.recovery_trigger) {
    const trigger = publicationProgress.recovery_trigger
    lines.push(`- Recovery trigger: ${trigger.completed_full_runs_since_publication ?? '?'} completed full runs; ${trigger.days_since_publication ?? '?'} days since publication`)
    lines.push(`- Recovery evidence: ${trigger.evidence || 'n/a'}`)
  }
  for (const target of publicationProgress.targets_attempted || []) {
    lines.push(`- Target: ${target.object_id || 'n/a'} — ${target.outcome || 'unknown'}`)
    lines.push(`  - Selection: ${target.selection_reason || 'n/a'}`)
    for (const attempt of target.attempts || []) {
      lines.push(`  - Attempt ${attempt.attempt ?? '?'} (${attempt.outcome || 'unknown'}): ${attempt.evidence || 'n/a'}`)
    }
    if (target.blocker_class) lines.push(`  - Blocker class: ${target.blocker_class}`)
  }
  if (publicationProgress.no_publish_reason) {
    const reason = publicationProgress.no_publish_reason
    lines.push(`- No-publish reason: ${reason.code || 'unknown'} — ${reason.summary || 'n/a'}`)
    for (const evidence of reason.evidence || []) lines.push(`  - Evidence: ${evidence}`)
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

  // Read-Only Git Audit
  lines.push('## Read-Only Git Audit')
  lines.push(`- Historical Git description: ${git.authorization || 'unknown'}`)
  lines.push(`- Recorded execution model: ${git.execution_model || 'none'}`)
  lines.push(`- Touched-paths manifest: ${summary.touched_paths_manifest || 'none'}`)
  lines.push(`- Touched-paths manifest SHA-256: ${summary.touched_paths_manifest_sha256 || 'none'}`)
  lines.push(`- Allowed paths: ${Array.isArray(git.allowed_paths) ? git.allowed_paths.join(', ') || 'none' : 'none'}`)
  lines.push(`- Run description: ${git.message || 'No Git actions performed'}`)
  lines.push('- Trust boundary: Workspace JSON cannot authorize Git. The repository audit is read-only and reports consistency only.')
  lines.push('- External controller warning: Independently obtain current user/scheduler authorization, run gates from trusted code, bind blobs/index/tree, commit, verify final tree/parent, then push the exact upstream ref.')
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
  const runId = assertCatalogId('run', summary.run_id || 'run_unknown')
  const filenameBase = runId.replace(/^run_/, '')
  const reportDir = resolveWithin(ROOT, 'reports', 'nightly-catalog-ops')
  ensureDir(reportDir)

  const summaryPath = resolveWithin(reportDir, `${filenameBase}-summary.json`)
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
