#!/usr/bin/env node
import { CATALOG, appendJsonl, nowIso, readDraft } from './lib/catalog-lib.mjs'
import { join } from 'node:path'
const draft = readDraft(process.argv.slice(2))
const record = {
  schema_version: 1,
  source_id: draft.source_id,
  checked_at: draft.checked_at ?? nowIso(),
  changed: Boolean(draft.changed),
  upstream_ref: draft.upstream_ref ?? null,
  status: draft.status ?? 'ok',
  skills_found: draft.skills_found ?? 0,
  errors: draft.errors ?? [],
}
appendJsonl(join(CATALOG, 'sources', 'state.jsonl'), record)
console.log(JSON.stringify(record, null, 2))
