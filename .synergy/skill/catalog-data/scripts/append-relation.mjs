#!/usr/bin/env node
import { CATALOG, appendJsonl, nowIso, readDraft } from './lib/catalog-lib.mjs'
import { validateAgainstSchema, relationSchemaV2 } from './lib/schema-validators.mjs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const validateOnly = args.includes('--validate-only')
const draft = readDraft(args.filter((arg) => arg !== '--validate-only'))

const record = {
  ...draft,
  weight: draft.weight ?? 0,
  evidence: draft.evidence ?? '',
  created_at: draft.created_at ?? nowIso(),
  created_by_run: draft.created_by_run ?? 'manual',
}

const result = validateAgainstSchema(record, relationSchemaV2)
if (!result.ok) {
  for (const err of result.errors) console.error(err)
  process.exit(1)
}

if (!validateOnly) appendJsonl(join(CATALOG, 'relations', 'edges-00000.jsonl'), record)
console.log(JSON.stringify(record, null, 2))
