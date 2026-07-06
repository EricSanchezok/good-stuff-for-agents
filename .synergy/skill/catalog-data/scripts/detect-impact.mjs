#!/usr/bin/env node
import { detectImpact } from './lib/catalog-lib.mjs'
const changed = detectImpact()
console.log(JSON.stringify({ changed }, null, 2))
