#!/usr/bin/env node
import { validateCatalog } from './lib/catalog-lib.mjs'

const strict = process.argv.includes('--strict')
const result = validateCatalog({ strict })
for (const warning of result.warnings) console.warn(`warning: ${warning}`)
if (!result.ok) {
  for (const error of result.errors) console.error(`error: ${error}`)
  process.exit(2)
}
console.log(`catalog validation passed${strict ? ' (strict)' : ''}`)
