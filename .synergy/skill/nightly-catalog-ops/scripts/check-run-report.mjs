#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonInput, printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { ROOT, parseYamlFile, slug } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import {
  computeTerminalStateCounts,
  validateRunSummary,
} from './lib/run-summary-validator.mjs'

try {
  const summary = readJsonInput()
  const errors = validateRunSummary(summary)
  validateFilePaths(summary?.terminal_states, errors)
  if (summary?.schema_version === 2) validatePublishedPackArtifacts(summary?.terminal_states, errors)

  if (errors.length > 0) {
    printResult({ ok: false, errors, counts: {} })
    process.exit(2)
  }

  const counts = computeTerminalStateCounts(summary)
  printResult({ ok: true, errors: [], counts })
} catch (error) {
  printResult({ ok: false, errors: [error.message], counts: {} })
  process.exit(2)
}

function validateFilePaths(terminalStates, errors) {
  if (!Array.isArray(terminalStates)) return

  for (let index = 0; index < terminalStates.length; index += 1) {
    const item = terminalStates[index]
    if (!item?.path) continue
    const label = `terminal_states[${index}]`
    const shouldSkip = item.state === 'deprecated_removed' ||
      (item.state === 'blocked' && item.blocked_reason === 'missing-artifact')

    if (shouldSkip) continue

    const fullPath = join(ROOT, item.path)
    if (!existsSync(fullPath)) {
      errors.push(`${label}: path "${item.path}" does not exist on disk`)
    }
  }
}

function validatePublishedPackArtifacts(terminalStates, errors) {
  if (!Array.isArray(terminalStates)) return

  for (let index = 0; index < terminalStates.length; index += 1) {
    const item = terminalStates[index]
    if (item?.object_type !== 'pack' || item.state !== 'promoted_published' || !item.path) continue

    const label = `terminal_states[${index}]`
    const recordPath = join(ROOT, item.path)
    if (!existsSync(recordPath)) continue

    let record
    try {
      record = parseYamlFile(recordPath)
    } catch (error) {
      errors.push(`${label}: canonical published pack record could not be parsed: ${error.message}`)
      continue
    }

    if (record?.pack_id !== item.object_id) {
      errors.push(`${label}: canonical published pack record pack_id must equal object_id "${item.object_id}"`)
      continue
    }
    if (record.status !== 'published') {
      errors.push(`${label}: canonical published pack record status must be "published"`)
    }
    if (typeof record.domain !== 'string' || record.domain.trim().length === 0) {
      errors.push(`${label}: canonical published pack record requires a non-empty domain to locate its public page`)
      continue
    }

    const publicPage = `docs/packs/${slug(record.domain)}/${record.pack_id}.md`
    if (!existsSync(join(ROOT, publicPage))) {
      errors.push(`${label}: published pack public page "${publicPage}" does not exist on disk`)
    }
  }
}
