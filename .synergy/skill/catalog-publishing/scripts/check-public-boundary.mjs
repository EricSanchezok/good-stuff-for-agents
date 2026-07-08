#!/usr/bin/env node
import { checkPublicBoundary } from './lib/publishing-lib.mjs'

const result = checkPublicBoundary()
if (result.warnings.length) {
  for (const warning of result.warnings) console.warn(`boundary-warn: ${warning}`)
}
if (!result.ok) {
  for (const error of result.errors) console.error(`boundary-error: ${error}`)
  process.exit(2)
}
console.log(JSON.stringify({ ok: true, checked_files: result.checked_files, warnings: result.warnings.length }, null, 2))
