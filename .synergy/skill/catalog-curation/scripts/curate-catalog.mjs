#!/usr/bin/env node
import { printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const action = readJsonInput({ action: 'noop' })
if (action.action === 'noop') {
  printResult({ changed: false, action: 'noop', message: 'Provide an explicit curation action draft to modify catalog records.' })
  process.exit(0)
}
throw new Error('Curation mutations require a dedicated reviewed script for the requested action; no generic mutation was performed.')
