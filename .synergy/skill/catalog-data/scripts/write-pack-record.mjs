#!/usr/bin/env node
import { nowIso, packRecordPath, readDraft, writeYaml } from './lib/catalog-lib.mjs'

const draft = readDraft(process.argv.slice(2))
assertCandidateControlFields(draft)
const record = {
  schema_version: 1,
  pack_id: draft.pack_id,
  name: draft.name,
  status: 'candidate',
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
writeYaml(packRecordPath(record.pack_id, 'candidate'), record)
console.log(JSON.stringify(record, null, 2))

function assertCandidateControlFields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Pack candidate draft must be an object')
  if (Object.hasOwn(value, 'status') && value.status !== 'candidate') {
    throw new Error('Pack candidate draft status must be candidate')
  }
  const controlledFields = new Set(['destination', 'expected_path', 'output_path', 'published_at', 'record_bucket'])
  for (const field of Object.keys(value)) {
    if (controlledFields.has(field) || /^promot(?:e|ed|ion)/.test(field)) {
      throw new Error(`Pack candidate draft must not include controller field ${field}`)
    }
  }
}

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
