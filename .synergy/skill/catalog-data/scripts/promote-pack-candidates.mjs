#!/usr/bin/env node
import { promotePassingCandidates } from './lib/catalog-lib.mjs'
const changed = promotePassingCandidates()
console.log(JSON.stringify({ changed }, null, 2))
