#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOG, ROOT, validateCatalog } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { checkDocsDrift, checkPublicBoundary } from '../../catalog-publishing/scripts/lib/publishing-lib.mjs'
import { printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const validation = validateCatalog({ strict: true })
const manifestPath = join(CATALOG, 'indexes', 'manifest.json')
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null
const drift = checkDocsDrift()
const boundary = checkPublicBoundary()
printResult({
  validation,
  manifest,
  docs_drift_ok: drift.ok,
  docs_drift: drift.drift ?? [],
  public_boundary_ok: boundary.ok,
  public_boundary_errors: boundary.errors ?? [],
  public_boundary_warnings: boundary.warnings ?? [],
  repo: ROOT,
})
if (!validation.ok || !drift.ok || !boundary.ok) process.exit(2)
