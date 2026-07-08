#!/usr/bin/env node
import { packRecordPath, evaluationPathForPack, nowIso, parseYamlFile, readDraft, writeTextAtomic, writeYaml, stableStringify, existsSync } from './lib/catalog-lib.mjs'

const draft = readDraft(process.argv.slice(2))
const status = draft.pack_status ?? 'candidate'
const score = draft.overall_score ?? draft.score ?? 0
const passed = draft.passed ?? score >= 0.78

const evaluationStatus = draft.evaluation_status ?? (passed ? 'passed' : (score >= 0.60 ? 'needs_work' : 'rejected'))

const evaluation = {
  schema_version: 1,
  evaluation_id: draft.evaluation_id,
  output_id: draft.output_id ?? draft.pack_id,
  kind: draft.kind ?? 'pack',
  metrics: draft.metrics ?? {},
  overall_score: score,
  passed,
  status: evaluationStatus,
  failure_modes: draft.failure_modes ?? [],
  recommendations: draft.recommendations ?? [],
  created_at: draft.created_at ?? nowIso(),
}
writeTextAtomic(evaluationPathForPack(draft.pack_id, status), stableStringify(evaluation))

if (draft.pack_id && status === 'candidate') {
  const packPath = packRecordPath(draft.pack_id, 'candidate')
  if (existsSync(packPath)) {
    const pack = parseYamlFile(packPath)
    pack.evaluation = {
      evaluation_id: evaluation.evaluation_id,
      score: evaluation.overall_score,
      status: evaluation.status,
    }
    writeYaml(packPath, pack)
  }
}

console.log(JSON.stringify(evaluation, null, 2))
