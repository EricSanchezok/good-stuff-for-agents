#!/usr/bin/env node
import { createEvaluationBinding } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, option, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const packId = option('--pack-id')
const bindingOnly = process.argv.includes('--create-binding')
if (!packId) throw new Error('Controller must provide --pack-id')

const binding = createEvaluationBinding(packId)
if (bindingOnly) {
  printResult(binding)
  process.exit(0)
}

const input = readJsonInput(null)
if (input && typeof input === 'object' && !Array.isArray(input) && Object.hasOwn(input, 'draft')) assertEnvelopeShape(input)
const draft = input?.draft ?? input
if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw new Error('Provide one reviewed evaluation draft')
if (input?.binding) assertMatchingBinding(input.binding, binding)
assertEvaluationDraft(draft)

const record = catalogData('write-evaluation.mjs', { binding, draft })
printResult({ written: 1, evaluation_ids: [record.evaluation_id], records: [record], binding })

function assertEnvelopeShape(value) {
  for (const field of Object.keys(value)) {
    if (field !== 'binding' && field !== 'draft') throw new Error(`Evaluation envelope has unexpected field ${field}`)
  }
}

function assertMatchingBinding(provided, expected) {
  if (!provided || typeof provided !== 'object' || Array.isArray(provided)) throw new Error('Provided evaluation binding must be an object')
  for (const field of Object.keys(expected)) {
    if (provided[field] !== expected[field]) throw new Error(`Provided evaluation binding ${field} does not match controller binding`)
  }
  for (const field of Object.keys(provided)) {
    if (!Object.hasOwn(expected, field)) throw new Error(`Provided evaluation binding has unexpected field ${field}`)
  }
}

function assertEvaluationDraft(evaluation) {
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
  for (const field of Object.keys(evaluation)) {
    if (controlledFields.has(field)) throw new Error(`Evaluation draft must not include controller field ${field}`)
  }
  if (!evaluation.metrics || typeof evaluation.metrics !== 'object' || Array.isArray(evaluation.metrics)) throw new Error('Evaluation draft is missing metrics')
  if (typeof (evaluation.overall_score ?? evaluation.score) !== 'number') throw new Error('Evaluation draft needs numeric overall_score')
  if (!Array.isArray(evaluation.failure_modes)) throw new Error('Evaluation draft needs failure_modes array')
  if (!Array.isArray(evaluation.recommendations)) throw new Error('Evaluation draft needs recommendations array')
}
