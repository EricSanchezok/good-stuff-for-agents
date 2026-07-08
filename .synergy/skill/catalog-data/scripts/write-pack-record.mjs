#!/usr/bin/env node
import { nowIso, packRecordPath, readDraft, writeYaml } from './lib/catalog-lib.mjs'
const RECORD_BUCKETS = new Set(['candidate', 'candidates', 'published'])
const draft = readDraft(process.argv.slice(2))
const status = draft.status ?? 'candidate'
const recordBucket = normalizeRecordBucket(draft.record_bucket ?? status)
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
  workflow: normalizeWorkflow(draft.workflow),
  compatibility: normalizeCompatibility(draft.compatibility),
  evidence: draft.evidence ?? { analysis_paths: [], relation_edges: [] },
  evaluation: draft.evaluation ?? { evaluation_id: null, score: null, status: 'pending' },
  updated_at: draft.updated_at ?? nowIso(),
}
writeYaml(packRecordPath(record.pack_id, recordBucket), record)
console.log(JSON.stringify(record, null, 2))

function normalizeWorkflow(workflow) {
  if (!workflow) return { summary: '', stages: [] }
  if (typeof workflow === 'string') return { summary: workflow, stages: [] }
  return { summary: workflow.summary ?? '', stages: workflow.stages ?? [] }
}

function normalizeCompatibility(compatibility) {
  return {
    notes: compatibility?.notes ?? '',
    complements: compatibility?.complements ?? [],
    overlaps: compatibility?.overlaps ?? [],
    conflicts: compatibility?.conflicts ?? [],
    unresolved: compatibility?.unresolved ?? [],
  }
}

function normalizeRecordBucket(bucket) {
  if (!RECORD_BUCKETS.has(bucket)) throw new Error(`pack record_bucket must be one of ${[...RECORD_BUCKETS].join(', ')}`)
  return bucket === 'candidates' ? 'candidate' : bucket
}
