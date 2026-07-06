#!/usr/bin/env node
import { renderAll } from './lib/publishing-lib.mjs'

try {
  const result = renderAll()
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
