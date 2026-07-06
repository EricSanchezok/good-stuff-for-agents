#!/usr/bin/env node
import { evaluationPathForPack, nowIso, readDraft, writeTextAtomic, stableStringify } from './lib/catalog-lib.mjs'
const draft = readDraft(process.argv.slice(2))
const status = draft.pack_status ?? 'candidate'
const score = draft.overall_score ?? draft.score ?? 0
const evaluation = {
  schema_version: 1,
  evaluation_id: draft.evaluation_id,
  output_id: draft.output_id ?? draft.pack_id,
  kind: draft.kind ?? 'pack',
  metrics: draft.metrics ?? {},
  overall_score: score,
  passed: draft.passed ?? score >= 0.78,
  failure_modes: draft.failure_modes ?? [],
  recommendations: draft.recommendations ?? [],
  created_at: draft.created_at ?? nowIso(),
}
writeTextAtomic(evaluationPathForPack(draft.pack_id, status), stableStringify(evaluation))
console.log(JSON.stringify(evaluation, null, 2))
