#!/usr/bin/env node
import { checkDocsDrift } from './lib/publishing-lib.mjs'

const result = checkDocsDrift()
if (!result.ok) {
  for (const item of result.drift) console.error(`drift: ${item.path ?? item.message} ${item.type ? `(${item.type})` : ''}`)
  process.exit(2)
}
console.log(JSON.stringify({ ok: true, expected: result.expected }, null, 2))
