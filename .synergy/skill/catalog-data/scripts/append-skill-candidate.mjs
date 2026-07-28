#!/usr/bin/env node
import { CATALOG, appendJsonl, assertCatalogId, idFor, nowIso, readDraft, resolveWithin } from './lib/catalog-lib.mjs'
const runIdIndex = process.argv.indexOf('--run-id')
const runId = assertCatalogId('run', runIdIndex >= 0 ? process.argv[runIdIndex + 1] : 'run_manual')
const draftArgs = process.argv.slice(2).filter((arg, index, args) => arg !== '--run-id' && args[index - 1] !== '--run-id')
const draft = readDraft(draftArgs)

// Provenance: bounded canonical object from extraction.
// Validate shape before appending; reject malformed provenance.
const provenance = draft.provenance ?? null
if (provenance !== null && provenance !== undefined) {
  if (typeof provenance !== 'object' || Array.isArray(provenance)) {
    throw new Error('candidate provenance must be null or a plain object')
  }
  const allowedKeys = new Set(['artifact_binding', 'upstream_ref', 'url', 'raw_url', 'git_blob_oid', 'size'])
  for (const key of Object.keys(provenance)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`candidate provenance contains forbidden key "${key}"`)
    }
  }
  if (provenance.artifact_binding) {
    if (typeof provenance.artifact_binding !== 'object' || Array.isArray(provenance.artifact_binding)) {
      throw new Error('provenance.artifact_binding must be a plain object')
    }
    const allowedBindingKeys = new Set(['source_id', 'remote_path', 'pinned_commit', 'git_blob_oid', 'raw_url'])
    for (const key of Object.keys(provenance.artifact_binding)) {
      if (!allowedBindingKeys.has(key)) {
        throw new Error(`provenance.artifact_binding contains forbidden key "${key}"`)
      }
    }
  }
}

const record = {
  schema_version: 1,
  candidate_id: assertCatalogId('candidate', draft.candidate_id ?? idFor('cand', [draft.source_id, draft.path, draft.name])),
  source_id: assertCatalogId('source', draft.source_id),
  path: draft.path,
  declared_name: draft.declared_name ?? draft.name ?? null,
  format: draft.format ?? 'unknown',
  parse_confidence: draft.parse_confidence ?? 'unknown',
  content_digest: draft.content_digest ?? null,
  extracted_at: draft.extracted_at ?? nowIso(),
  provenance: provenance ?? null,
}
appendJsonl(resolveWithin(CATALOG, 'skills', 'candidates', `${runId}.jsonl`), record)
console.log(JSON.stringify(record, null, 2))
