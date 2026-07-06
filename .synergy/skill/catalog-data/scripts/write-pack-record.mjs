#!/usr/bin/env node
import { nowIso, packRecordPath, readDraft, writeYaml } from './lib/catalog-lib.mjs'
const draft = readDraft(process.argv.slice(2))
const status = draft.status ?? 'candidate'
const record = {
  schema_version: 1,
  pack_id: draft.pack_id,
  name: draft.name,
  status,
  intent: draft.intent,
  domain: draft.domain ?? 'uncategorized',
  created_by_run: draft.created_by_run ?? 'run_manual',
  version: draft.version ?? '0.1.0',
  members: draft.members ?? [],
  excluded: draft.excluded ?? [],
  workflow: draft.workflow ?? { stages: [] },
  compatibility: draft.compatibility ?? { complements: [], overlaps: [], conflicts: [] },
  evidence: draft.evidence ?? { analysis_paths: [], relation_edges: [] },
  evaluation: draft.evaluation ?? { evaluation_id: null, score: null, status: 'pending' },
  updated_at: draft.updated_at ?? nowIso(),
}
writeYaml(packRecordPath(record.pack_id, status), record)
console.log(JSON.stringify(record, null, 2))
