#!/usr/bin/env node
import { validateCatalog } from './lib/catalog-lib.mjs'
const result = validateCatalog({ strict: true })
if (!result.ok) {
  for (const error of result.errors) console.error(`error: ${error}`)
  process.exit(2)
}
console.log('catalog migration complete: no migrations required for schema_version 1')
