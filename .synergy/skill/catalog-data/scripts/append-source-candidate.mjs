#!/usr/bin/env node
import { appendJsonl, assertCatalogId, idFor, nowIso, readDraft } from './lib/catalog-lib.mjs'
import { join } from 'node:path'
import { CATALOG } from './lib/catalog-lib.mjs'

const draft = readDraft(process.argv.slice(2))
const sourceId = assertCatalogId('source', draft.source_id ?? idFor('src', [draft.url ?? draft.name, draft.name ?? 'source']))
const record = {
  schema_version: 1,
  source_id: sourceId,
  name: draft.name,
  url: draft.url ?? null,
  type: draft.type ?? 'unknown',
  status: 'candidate',
  discovered_at: draft.discovered_at ?? nowIso(),
  evidence: draft.evidence ?? [],
  license: draft.license ?? { spdx: null, verified: false, evidence: null },
  parseability: draft.parseability ?? 'unknown',
  rejection_reason: draft.rejection_reason ?? null,
}
appendJsonl(join(CATALOG, 'sources', 'candidates.jsonl'), record)
console.log(JSON.stringify(record, null, 2))
