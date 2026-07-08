#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, validateCatalog } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { printResult, runScript } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { checkDocsDrift, checkLinks, checkPublicBoundary, renderAll } from '../../catalog-publishing/scripts/lib/publishing-lib.mjs'

const steps = []

try {
  step('validate-start', () => validateOrThrow())
  step('migrate', () => runScript('.synergy/skill/catalog-data/scripts/migrate-catalog.mjs'))
  step('source-sync', () => runScript('.synergy/skill/source-sync/scripts/sync-sources.mjs'))
  step('build-indexes', () => runScript('.synergy/skill/catalog-data/scripts/build-indexes.mjs'))
  step('render-public-pages', () => renderAll())
  step('check-public-drift', () => assertOk(checkDocsDrift(), 'public page drift'))
  step('check-public-links', () => assertOk(checkLinks(), 'public links'))
  step('check-public-boundary', () => assertOk(checkPublicBoundary(), 'public boundary'))
  step('validate-end', () => validateOrThrow())
  printResult({ ok: true, exit_code: 0, git_available: existsSync(join(ROOT, '.git')), committed: false, semantic_phases_run: false, steps })
} catch (error) {
  printResult({ ok: false, exit_code: 2, error: error.message, semantic_phases_run: false, steps })
  process.exit(2)
}

function step(name, fn) {
  try {
    const result = fn()
    steps.push({ name, ok: true, result })
  } catch (error) {
    steps.push({ name, ok: false, error: error.message })
    throw error
  }
}

function validateOrThrow() {
  const result = validateCatalog({ strict: true })
  if (!result.ok) throw new Error(result.errors.join('\n'))
  return result
}

function assertOk(result, label) {
  if (!result.ok) throw new Error(`${label} failed`)
  return result
}
