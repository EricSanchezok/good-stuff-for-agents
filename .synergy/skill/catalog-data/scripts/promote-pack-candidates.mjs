#!/usr/bin/env node
import { promotePassingCandidates } from './lib/catalog-lib.mjs'

const cleanup = process.argv.includes('--cleanup-candidates')
const changed = promotePassingCandidates(cleanup)
console.log(JSON.stringify({ changed, cleaned: cleanup }, null, 2))
