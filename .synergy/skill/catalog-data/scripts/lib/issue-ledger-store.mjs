import { existsSync } from 'node:fs'
import { join } from 'node:path'

import {
  CATALOG,
  assertCatalogId,
  ensureDir,
  listFiles,
  readText,
  resolveWithin,
  stableStringify,
  writeTextAtomic,
} from './catalog-lib.mjs'
import {
  validateAssessmentSchema,
  validateResponseLedgerSchema,
} from '../../../catalog-growth-ops/scripts/lib/issue-assessment-writer.mjs'
import { TRUSTED_REPOSITORY } from '../../../catalog-growth-ops/scripts/lib/issue-intake.mjs'

export function createIssueLedgerStore({ baseDir = CATALOG, runsDirectory = 'runs' } = {}) {
  const runsRoot = resolveWithin(baseDir, runsDirectory)

  return Object.freeze({
    loadPreviousLedgers({ issueNumber, repository = TRUSTED_REPOSITORY }) {
      if (repository !== TRUSTED_REPOSITORY) throw new Error(`repository must be ${TRUSTED_REPOSITORY}`)
      if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new Error('issueNumber must be a positive integer')
      if (!existsSync(runsRoot)) return []

      return listFiles(runsRoot, (path) => path.endsWith('.json') && path.includes(`${join('', 'issue-response-ledgers', '')}`))
        .map((path) => parseJsonFile(path, 'issue response ledger'))
        .filter((ledger) => validateResponseLedgerSchema(ledger).ok)
        .filter((ledger) => ledger.repository === repository && ledger.issue_number === issueNumber)
        .sort((left, right) => left.created_at.localeCompare(right.created_at, 'en'))
    },

    persistAssessment({ runId, assessment }) {
      const normalizedRunId = assertCatalogId('run', runId)
      const validation = validateAssessmentSchema(assessment)
      if (!validation.ok) throw new Error(`Assessment validation failed: ${validation.errors.join('; ')}`)
      if (assessment.assessed_by_run !== normalizedRunId) throw new Error('assessment.assessed_by_run must match runId')
      const directory = resolveWithin(runsRoot, normalizedRunId, 'issue-assessments')
      ensureDir(directory, runsRoot)
      const path = resolveWithin(directory, `${safeRecordId(assessment.assessment_id, 'assessment_id')}.json`)
      return writeCanonicalRecord(path, assessment, runsRoot)
    },

    persistResponseLedger({ runId, ledger }) {
      const normalizedRunId = assertCatalogId('run', runId)
      const validation = validateResponseLedgerSchema(ledger)
      if (!validation.ok) throw new Error(`Response ledger validation failed: ${validation.errors.join('; ')}`)
      if (ledger.created_by_run !== normalizedRunId) throw new Error('ledger.created_by_run must match runId')
      const directory = resolveWithin(runsRoot, normalizedRunId, 'issue-response-ledgers')
      ensureDir(directory, runsRoot)
      const path = resolveWithin(directory, `${safeRecordId(ledger.response_id, 'response_id')}.json`)
      return writeCanonicalRecord(path, ledger, runsRoot)
    },

    runsRoot,
  })
}

function writeCanonicalRecord(path, record, safetyRoot) {
  const content = stableStringify(record)
  if (existsSync(path)) {
    if (readText(path) !== content) throw new Error(`Canonical record collision at ${path}`)
    return path
  }
  writeTextAtomic(path, content, safetyRoot)
  return path
}

function parseJsonFile(path, label) {
  try {
    return JSON.parse(readText(path))
  } catch (error) {
    throw new Error(`${label} is invalid JSON at ${path}: ${error.message}`)
  }
}

function safeRecordId(value, label) {
  if (typeof value !== 'string' || !/^[a-z0-9_-]+$/u.test(value)) {
    throw new Error(`${label} must be a lowercase catalog-safe identifier`)
  }
  return value
}
