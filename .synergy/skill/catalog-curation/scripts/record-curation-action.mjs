#!/usr/bin/env node
import { printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const action = readJsonInput({ action: 'noop' })
if (!action || typeof action !== 'object') throw new Error('Curation action must be an object')

if (action.action === 'noop') {
  printResult({ changed: false, action: 'noop', message: 'Provide an explicit reviewed curation action draft to modify catalog records.' })
  process.exit(0)
}

const required = ['action', 'decision_by', 'rationale', 'affected_ids']
const missing = required.filter((key) => !action[key] || (Array.isArray(action[key]) && action[key].length === 0))
if (missing.length) throw new Error(`Curation action is missing required fields: ${missing.join(', ')}`)

throw new Error(`Curation action '${action.action}' was validated but not applied. Add a dedicated narrow writer for this reviewed action before mutating records.`)
