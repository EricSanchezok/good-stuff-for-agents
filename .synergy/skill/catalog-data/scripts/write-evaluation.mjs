#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import {
  assertCurrentEvaluationBinding,
  nowIso,
  packContentHash,
  parseYamlFile,
  readDraft,
  stableStringify,
  writeTextAtomic,
  writeYaml,
} from './lib/catalog-lib.mjs'

const envelope = readDraft(process.argv.slice(2))
const { binding, draft } = assertEvaluationEnvelope(envelope)
const current = assertCurrentEvaluationBinding(binding)
assertSemanticDraft(draft)

if (existsSync(current.evaluationPath)) {
  const existing = JSON.parse(readFileSync(current.evaluationPath, 'utf8'))
  if (existing.evaluation_id === binding.evaluation_id) {
    throw new Error(`Evaluation binding has already been used: ${binding.evaluation_id}`)
  }
}

const score = draft.overall_score ?? draft.score
const decision = conservativeDecision(draft, score)
const evaluation = {
  schema_version: 1,
  evaluation_id: binding.evaluation_id,
  output_id: binding.pack_id,
  kind: 'pack',
  metrics: draft.metrics ?? {},
  overall_score: score,
  passed: decision.passed,
  status: decision.status,
  failure_modes: draft.failure_modes ?? [],
  recommendations: draft.recommendations ?? [],
  created_at: draft.created_at ?? nowIso(),
}

assertCurrentEvaluationBinding(binding)
const pack = parseYamlFile(current.packPath)
if (packContentHash(pack) !== binding.pack_hash) throw new Error('Evaluation binding pack_hash is stale or mismatched')
writeTextAtomic(current.evaluationPath, stableStringify(evaluation))
pack.evaluation = {
  evaluation_id: evaluation.evaluation_id,
  score: evaluation.overall_score,
  status: evaluation.status,
}
writeYaml(current.packPath, pack)

console.log(JSON.stringify(evaluation, null, 2))

function assertEvaluationEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Evaluation input must be a controller envelope')
  const keys = Object.keys(value)
  if (keys.length !== 2 || !keys.includes('binding') || !keys.includes('draft')) {
    throw new Error('Evaluation input must contain only binding and draft')
  }
  return value
}

function assertSemanticDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Evaluation draft must be an object')
  const controlledFields = new Set([
    'binding',
    'created_at',
    'destination',
    'evaluation_id',
    'expected_path',
    'kind',
    'output_id',
    'output_path',
    'pack_hash',
    'pack_id',
    'pack_status',
    'pack_version',
    'record_bucket',
    'schema_version',
  ])
  for (const field of Object.keys(value)) {
    if (controlledFields.has(field)) throw new Error(`Evaluation draft must not include controller field ${field}`)
  }
  if (!value.metrics || typeof value.metrics !== 'object' || Array.isArray(value.metrics)) throw new Error('Evaluation draft is missing metrics')
  if (typeof (value.overall_score ?? value.score) !== 'number') throw new Error('Evaluation draft needs numeric overall_score')
  if (!Array.isArray(value.failure_modes)) throw new Error('Evaluation draft needs failure_modes array')
  if (!Array.isArray(value.recommendations)) throw new Error('Evaluation draft needs recommendations array')
}

function conservativeDecision(draft, score) {
  const requestedStatus = draft.evaluation_status ?? draft.status
  const statusAllowsPass = requestedStatus === undefined || requestedStatus === 'passed'
  const passedAllowsPass = draft.passed === undefined || draft.passed === true
  const passed = score >= 0.78 && statusAllowsPass && passedAllowsPass
  return {
    passed,
    status: passed ? 'passed' : (requestedStatus === 'rejected' || score < 0.60 ? 'rejected' : 'needs_work'),
  }
}
