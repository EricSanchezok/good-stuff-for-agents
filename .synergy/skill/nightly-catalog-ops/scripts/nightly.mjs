#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, validateCatalog } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { printResult, runScript } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { renderAll, checkDocsDrift, checkLinks } from '../../catalog-publishing/scripts/lib/publishing-lib.mjs'

const steps = []
function step(name, fn) {
  try {
    const result = fn()
    steps.push({ name, ok: true, result })
  } catch (error) {
    steps.push({ name, ok: false, error: error.message })
    throw error
  }
}

try {
  step('validate-start', () => validateOrThrow())
  step('migrate', () => runScript('.synergy/skill/catalog-data/scripts/migrate-catalog.mjs'))
  step('source-sync', () => runScript('.synergy/skill/source-sync/scripts/sync-sources.mjs'))
  step('skill-extraction', () => runScript('.synergy/skill/skill-extraction/scripts/extract-skills.mjs', ['--run-id', 'run_nightly']))
  step('skill-normalization', () => runScript('.synergy/skill/skill-normalization/scripts/normalize-skills.mjs', ['--run-id', 'run_nightly']))
  step('skill-deep-analysis', () => runScript('.synergy/skill/skill-deep-analysis/scripts/analyze-skills.mjs'))
  step('skill-dedup-relations', () => runScript('.synergy/skill/skill-dedup-relations/scripts/build-relations.mjs'))
  step('detect-impact', () => runScript('.synergy/skill/catalog-data/scripts/detect-impact.mjs'))
  step('evaluate-candidates', () => runScript('.synergy/skill/catalog-evaluation/scripts/evaluate-candidates.mjs'))
  step('promote-passing-candidates', () => runScript('.synergy/skill/catalog-data/scripts/promote-pack-candidates.mjs'))
  step('build-indexes', () => runScript('.synergy/skill/catalog-data/scripts/build-indexes.mjs'))
  step('render', () => renderAll())
  step('drift', () => assertOk(checkDocsDrift(), 'docs drift'))
  step('links', () => assertOk(checkLinks(), 'links'))
  step('validate-end', () => validateOrThrow())
  const gitAvailable = existsSync(join(ROOT, '.git'))
  printResult({ ok: true, exit_code: 0, git_available: gitAvailable, committed: false, reason: gitAvailable ? 'nightly script does not auto-commit without explicit automation wrapper' : 'not a git repository', steps })
} catch (error) {
  printResult({ ok: false, exit_code: 2, error: error.message, steps })
  process.exit(2)
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
