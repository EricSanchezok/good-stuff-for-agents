#!/usr/bin/env node
import { CATALOG, appendJsonl, idFor, nowIso, readDraft } from './lib/catalog-lib.mjs'
import { join } from 'node:path'
const runIdIndex = process.argv.indexOf('--run-id')
const runId = runIdIndex >= 0 ? process.argv[runIdIndex + 1] : 'run_manual'
const draftArgs = process.argv.slice(2).filter((arg, index, args) => arg !== '--run-id' && args[index - 1] !== '--run-id')
const draft = readDraft(draftArgs)
const record = {
  schema_version: 1,
  candidate_id: draft.candidate_id ?? idFor('cand', [draft.source_id, draft.path, draft.name]),
  source_id: draft.source_id,
  path: draft.path,
  declared_name: draft.declared_name ?? draft.name ?? null,
  format: draft.format ?? 'unknown',
  parse_confidence: draft.parse_confidence ?? 'unknown',
  content_digest: draft.content_digest ?? null,
  extracted_at: draft.extracted_at ?? nowIso(),
  raw_metadata: draft.raw_metadata ?? {},
}
appendJsonl(join(CATALOG, 'skills', 'candidates', `${runId}.jsonl`), record)
console.log(JSON.stringify(record, null, 2))
