#!/usr/bin/env node
import { buildIndexes } from './lib/catalog-lib.mjs'

const manifest = buildIndexes()
console.log(JSON.stringify(manifest, null, 2))
