#!/usr/bin/env node
import { CATALOG, appendJsonl, ensureDir, nowIso, readDraft, writeYaml } from './lib/catalog-lib.mjs'
import { join } from 'node:path'
const draft = readDraft(process.argv.slice(2))
const runId = draft.run_id ?? 'run_manual'
const date = runId.match(/run_(\d{4})(\d{2})(\d{2})/) ?? []
const dir = date.length ? join(CATALOG, 'runs', date[1], date[2], date[3], runId) : join(CATALOG, 'runs', 'manual', runId)
ensureDir(join(dir, 'logs'))
ensureDir(join(dir, 'drafts'))
ensureDir(join(dir, 'outputs'))
const event = { schema_version: 1, run_id: runId, stage: draft.stage ?? 'unknown', status: draft.status ?? 'info', message: draft.message ?? '', data: draft.data ?? {}, created_at: draft.created_at ?? nowIso() }
appendJsonl(join(dir, 'logs', 'events.jsonl'), event)
writeYaml(join(dir, 'run.yaml'), { schema_version: 1, run_id: runId, updated_at: event.created_at })
console.log(JSON.stringify(event, null, 2))
