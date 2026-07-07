#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOG, ROOT, validateCatalog } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { checkDocsDrift, checkLinks } from '../../catalog-publishing/scripts/lib/publishing-lib.mjs'
import { printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const validation = validateCatalog({ strict: true })
const manifestPath = join(CATALOG, 'indexes', 'manifest.json')
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null
const drift = checkDocsDrift()
const links = checkLinks()
printResult({
  validation,
  manifest,
  docs_drift_ok: drift.ok,
  docs_drift: drift.drift ?? [],
  links_ok: links.ok,
  link_errors: links.errors ?? [],
  repo: ROOT,
})
if (!validation.ok || !drift.ok || !links.ok) process.exit(2)
