#!/usr/bin/env node
import { readJsonInput, printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import {
  computeTerminalStateCounts,
  validateRunSummary,
} from './lib/run-summary-validator.mjs'

try {
  const summary = readJsonInput()
  const errors = validateRunSummary(summary, { scope: 'terminal' })
  const counts = computeTerminalStateCounts(summary, { errorCount: errors.length })

  if (errors.length > 0) {
    printResult({ ok: false, errors, counts })
    process.exit(2)
  }

  printResult({ ok: true, errors: [], counts })
} catch (error) {
  printResult({ ok: false, errors: [error.message], counts: {} })
  process.exit(2)
}
