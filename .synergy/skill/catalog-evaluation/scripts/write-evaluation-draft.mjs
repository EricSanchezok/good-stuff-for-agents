#!/usr/bin/env node
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput(null)
const evaluations = Array.isArray(input) ? input : input?.evaluations ? input.evaluations : input ? [input] : []
if (!Array.isArray(evaluations) || evaluations.length === 0) throw new Error('Provide an evaluation draft or an object with an evaluations array')

const records = []
for (const evaluation of evaluations) {
  assertEvaluationDraft(evaluation)
  records.push(catalogData('write-evaluation.mjs', evaluation))
}

printResult({ written: records.length, evaluation_ids: records.map((record) => record.evaluation_id), records })

function assertEvaluationDraft(evaluation) {
  if (!evaluation || typeof evaluation !== 'object') throw new Error('Evaluation draft must be an object')
  if (!evaluation.pack_id) throw new Error('Evaluation draft is missing pack_id')
  if (!evaluation.evaluation_id) throw new Error(`Evaluation draft for ${evaluation.pack_id} is missing evaluation_id`)
  if (!evaluation.metrics || typeof evaluation.metrics !== 'object') throw new Error(`Evaluation draft for ${evaluation.pack_id} is missing metrics`)
  if (typeof (evaluation.overall_score ?? evaluation.score) !== 'number') throw new Error(`Evaluation draft for ${evaluation.pack_id} needs numeric overall_score`)
  if (!Array.isArray(evaluation.failure_modes)) throw new Error(`Evaluation draft for ${evaluation.pack_id} needs failure_modes array`)
  if (!Array.isArray(evaluation.recommendations)) throw new Error(`Evaluation draft for ${evaluation.pack_id} needs recommendations array`)
}
