#!/usr/bin/env node
import { CATALOG, appendJsonl, nowIso, readDraft } from './lib/catalog-lib.mjs'
import { join } from 'node:path'
const draft = readDraft(process.argv.slice(2))
const record = {
  schema_version: 1,
  subject: draft.subject,
  predicate: draft.predicate,
  object: draft.object,
  weight: draft.weight ?? 0,
  evidence: draft.evidence ?? '',
  source: draft.source ?? 'manual',
  created_at: draft.created_at ?? nowIso(),
}
appendJsonl(join(CATALOG, 'relations', 'edges-00000.jsonl'), record)
console.log(JSON.stringify(record, null, 2))
