#!/usr/bin/env node
import { checkLinks } from './lib/publishing-lib.mjs'

const result = checkLinks()
if (!result.ok) {
  for (const error of result.errors) console.error(`link-error: ${error}`)
  process.exit(2)
}
console.log(JSON.stringify({ ok: true, checked_files: result.checked_files }, null, 2))
