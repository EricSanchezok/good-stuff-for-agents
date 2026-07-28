#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDirectory = dirname(fileURLToPath(import.meta.url))
const skillDirectory = dirname(scriptsDirectory)
const synergyDirectory = join(skillDirectory, '..', '..')
const catalogDataDirectory = join(synergyDirectory, 'skill', 'catalog-data')
const packageJson = JSON.parse(readFileSync(join(synergyDirectory, 'package.json'), 'utf8'))

const removedPaths = [
  'scripts/collect-run-context.mjs',
  'scripts/prepare-run.mjs',
  'scripts/resolve-closure.mjs',
  'scripts/run-final-gate.mjs',
  'scripts/seal-run.mjs',
  'scripts/finalize-git.mjs',
  'scripts/lib/closure-resolver.mjs',
  'scripts/lib/final-gate.mjs',
  'scripts/lib/git-finalization-plan.mjs',
  'scripts/lib/report-renderer.mjs',
  'scripts/lib/run-context.mjs',
  'scripts/lib/run-summary-validator.mjs',
  'scripts/lib/terminal-ledger.mjs',
  'references/nightly-runbook.md',
  'references/run-report-template.md',
  'references/run-summary-schema.md',
  'references/stage-output-contract.md',
  'references/terminal-state-ledger.md',
]

for (const relativePath of removedPaths) {
  assert.equal(existsSync(join(skillDirectory, relativePath)), false, `${relativePath} must not exist`)
}

for (const relativePath of [
  'references/schemas/run.schema.json',
  'references/schemas/v2/run-context.schema.json',
  'references/schemas/v2/terminal-ledger.schema.json',
]) {
  assert.equal(existsSync(join(catalogDataDirectory, relativePath)), false, `${relativePath} must not exist`)
}

const removedScripts = [
  'nightly:collect',
  'nightly:prepare',
  'nightly:closure',
  'nightly:final-gate',
  'nightly:final-gate:test',
  'nightly:seal',
  'nightly:context:test',
  'nightly:seal:test',
  'nightly:validator:test',
  'nightly:git:audit',
  'nightly:git:test',
]

for (const scriptName of removedScripts) {
  assert.equal(scriptName in packageJson.scripts, false, `${scriptName} must not exist`)
}

assert.equal(packageJson.scripts.nightly, 'node skill/nightly-catalog-ops/scripts/nightly-controller.mjs')
assert.ok(existsSync(join(scriptsDirectory, 'nightly-controller.mjs')))
assert.ok(existsSync(join(scriptsDirectory, 'test-nightly-foundation.mjs')))
assert.ok(existsSync(join(scriptsDirectory, 'test-nightly-controller.mjs')))

process.stdout.write('Nightly legacy lifecycle is absent; single controller route is present\n')
