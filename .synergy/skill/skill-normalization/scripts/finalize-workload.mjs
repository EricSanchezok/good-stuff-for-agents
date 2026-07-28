#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import {
  loadWorkload,
  validateDecisions,
  applyDecisions,
  writeOutcomeReport,
  computeDecisionsDigest,
  checkAlreadyFinalized,
} from './lib/normalization-lib.mjs'
import { resolveWithin, ROOT } from '../../catalog-data/scripts/lib/catalog-lib.mjs'

// ── Strict argument parsing ──────────────────────────────────────────────────
const VALID_FLAGS = new Set(['--run-id', '--dry-run', '--help', '-h'])

function parseArgs() {
  const args = process.argv.slice(2)

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.error('Usage: node finalize-workload.mjs --run-id <run-id> [--dry-run]')
    console.error('')
    console.error('  --run-id <run-id>  The extraction run ID (e.g. run_2026-07-13-210300)')
    console.error('  --dry-run          Validate and simulate without writing canonical records')
    console.error('')
    console.error('  The decisions file path is derived from run-id:')
    console.error('    reports/skill-normalization/<run-id>/decisions.json')
    console.error('')
    console.error('  The decisions file MUST exist before finalize is invoked.')
    process.exit(0)
  }

  let runId = null
  let dryRun = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--run-id') {
      if (!args[i + 1] || VALID_FLAGS.has(args[i + 1])) {
        console.error('--run-id requires a value')
        process.exit(1)
      }
      runId = args[i + 1]
      i++
    } else if (arg === '--dry-run') {
      dryRun = true
    } else if (arg.startsWith('--run-id=')) {
      runId = arg.slice('--run-id='.length)
      if (!runId) {
        console.error('--run-id= requires a value')
        process.exit(1)
      }
    } else if (!VALID_FLAGS.has(arg) && !arg.startsWith('--')) {
      console.error(`Unknown argument: ${arg}`)
      process.exit(1)
    } else if (arg.startsWith('--') && !VALID_FLAGS.has(arg)) {
      console.error(`Unknown flag: ${arg}`)
      process.exit(1)
    }
  }

  if (!runId) {
    console.error('--run-id is required')
    process.exit(1)
  }

  return { runId, dryRun }
}

const { runId, dryRun } = parseArgs()

// Decisions path is predetermined — never accepted as an arbitrary CLI arg
const decisionsPath = resolveWithin(ROOT, 'reports', 'skill-normalization', runId, 'decisions.json')

if (!existsSync(decisionsPath)) {
  console.error(`Decisions file not found at expected path: ${decisionsPath}`)
  console.error('Create the decisions file at the expected path before running finalize.')
  process.exit(1)
}

try {
  // 0. Idempotence check
  const decisionsRaw = readFileSync(decisionsPath, 'utf8')
  let decisions
  try {
    decisions = JSON.parse(decisionsRaw)
  } catch {
    throw new Error(`Decisions file is not valid JSON: ${decisionsPath}`)
  }

  const decisionsDigest = computeDecisionsDigest(decisions)
  const outputDir = resolveWithin(ROOT, 'reports', 'skill-normalization', runId)

  const { finalized, existingDigest, same } = checkAlreadyFinalized(runId, decisionsDigest, { outputDir })
  if (finalized && same) {
    console.log(JSON.stringify({
      status: 'already_finalized',
      message: 'Workload already finalized with identical decisions; no changes made.',
      decisions_digest: decisionsDigest,
    }, null, 2))
    process.exit(0)
  }
  if (finalized && !same) {
    throw new Error(
      `Workload already finalized with different decisions (digest=${existingDigest}). ` +
      'Cannot finalize the same workload twice with different decisions.',
    )
  }

  // 1. Load and verify workload
  const { workload, itemIndex } = loadWorkload(runId)

  // 2. Validate decisions
  const validation = validateDecisions(decisions, workload, itemIndex)
  if (!validation.valid) {
    console.error(JSON.stringify({
      status: 'rejected',
      errors: validation.errors,
    }, null, 2))
    process.exit(1)
  }

  // 3. Apply (preflight + write)
  const result = applyDecisions(decisions, workload, itemIndex, { dryRun, outputDir })

  // 4. Write outcome report
  const summaryPath = writeOutcomeReport(
    runId,
    result.outcomes,
    result.written,
    decisionsDigest,
    workload.workload_digest,
    { outputDir },
  )

  console.log(JSON.stringify({
    status: 'ok',
    dry_run: dryRun,
    total: result.outcomes.length,
    written: result.written.length,
    written_skills: result.written,
    summary_path: summaryPath,
    decisions_digest: decisionsDigest,
  }, null, 2))
} catch (err) {
  console.error(JSON.stringify({ status: 'error', error: err.message }, null, 2))
  process.exit(1)
}
