#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, option, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const inputPath = option('--jsonl', null)
const input = inputPath ? readJsonl(resolve(ROOT, inputPath)) : readJsonInput(null)
const relations = Array.isArray(input) ? input : input?.relations ? input.relations : input ? [input] : []
if (!Array.isArray(relations) || relations.length === 0) throw new Error('Provide relation drafts, an object with a relations array, or --jsonl <path>')

const records = []
for (const relation of relations) {
  assertRelationDraft(relation)
  records.push(catalogData('append-relation.mjs', relation))
}

printResult({ appended: records.length, records })

function readJsonl(path) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
}

function assertRelationDraft(relation) {
  if (!relation || typeof relation !== 'object') throw new Error('Relation draft must be an object')
  if (!relation.subject) throw new Error('Relation draft is missing subject')
  if (!relation.predicate) throw new Error(`Relation draft for ${relation.subject} is missing predicate`)
  if (!relation.object) throw new Error(`Relation draft for ${relation.subject} is missing object`)
  if (!relation.evidence) throw new Error(`Relation draft ${relation.subject} -> ${relation.object} is missing evidence`)
}
