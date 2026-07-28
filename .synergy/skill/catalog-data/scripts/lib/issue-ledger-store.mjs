import { existsSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CATALOG,
  ensureDir,
  listFiles,
  readText,
  resolveWithin,
  stableStringify,
  writeTextAtomic,
} from './catalog-lib.mjs'
import { validateAgainstSchema } from './schema-validators.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_ROOT = join(__dirname, '..', '..', 'references', 'schemas', 'v3')

let _canonicalResponseSchema = null
function canonicalResponseSchema() {
  if (!_canonicalResponseSchema) {
    _canonicalResponseSchema = JSON.parse(readFileSync(join(SCHEMA_ROOT, 'canonical-issue-response.schema.json'), 'utf8'))
  }
  return _canonicalResponseSchema
}

const CANONICAL_DIR = 'issues'

/**
 * Create an isolated Issue ledger store over issuesDirectory under baseDir.
 * All paths stay within baseDir; no old catalog/runs paths.
 */
export function createIssueLedgerStore({ baseDir = CATALOG, issuesDirectory = CANONICAL_DIR } = {}) {
  const issuesRoot = resolveWithin(baseDir, issuesDirectory)

  function ensureStore() { ensureDir(issuesRoot, baseDir) }

  // --- Canonical cross-run store (write-once, schema-validated) ---

  function persistCanonicalResponse(record) {
    if (!record || record.kind !== 'canonical_issue_response') {
      throw new Error('record must be a canonical_issue_response')
    }
    // Validate against canonical schema before writing
    const validation = validateAgainstSchema(record, canonicalResponseSchema())
    if (!validation.ok) {
      throw new Error(`Canonical response validation failed: ${validation.errors.join('; ')}`)
    }
    ensureStore()
    const path = resolveWithin(baseDir, issuesDirectory, `${record.response_id}.json`)
    const content = stableStringify(record)
    if (existsSync(path)) {
      if (readText(path) !== content) {
        throw new Error(`Canonical response collision at ${path}`)
      }
      return path
    }
    writeTextAtomic(path, content, baseDir)
    return path
  }

  function loadCanonicalResponses({ issueNumber }) {
    if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new Error('issueNumber must be a positive integer')
    if (!existsSync(issuesRoot)) return []
    return listFiles(issuesRoot, (p) => p.endsWith('.json'))
      .map((p) => {
        try { return JSON.parse(readText(p)) } catch { return null }
      })
      .filter((r) => r && r.kind === 'canonical_issue_response' && r.issue_number === issueNumber)
      .sort((a, b) => a.created_at.localeCompare(b.created_at, 'en'))
  }

  function loadAllCanonicalResponses() {
    if (!existsSync(issuesRoot)) return []
    return listFiles(issuesRoot, (p) => p.endsWith('.json'))
      .map((p) => {
        try { return JSON.parse(readText(p)) } catch { return null }
      })
      .filter((r) => r && r.kind === 'canonical_issue_response')
  }

  return Object.freeze({
    persistCanonicalResponse,
    loadCanonicalResponses,
    loadAllCanonicalResponses,
    issuesRoot,
  })
}
