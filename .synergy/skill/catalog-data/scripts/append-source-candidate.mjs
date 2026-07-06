#!/usr/bin/env node
import { appendJsonl, idFor, nowIso, readDraft } from './lib/catalog-lib.mjs'
import { join } from 'node:path'
import { CATALOG } from './lib/catalog-lib.mjs'

const draft = readDraft(process.argv.slice(2))
const record = {
  schema_version: 1,
  source_id: draft.source_id ?? idFor('src', [draft.url ?? draft.name, draft.name ?? 'source']),
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
