#!/usr/bin/env node
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput({ sources: [] })
const sources = Array.isArray(input) ? input : input.sources ?? []
if (!Array.isArray(sources)) throw new Error('Expected an array or an object with a sources array')

const records = []
for (const source of sources) {
  assertReviewedCandidate(source)
  records.push(catalogData('append-source-candidate.mjs', {
    name: source.name,
    url: source.url,
    type: source.type ?? 'github_repo',
    evidence: source.evidence,
    license: source.license ?? { spdx: null, verified: false, evidence: null },
    parseability: source.parseability ?? 'unknown',
    rejection_reason: source.rejection_reason ?? null,
  }))
}

printResult({ ingested: records.length, records })

function assertReviewedCandidate(source) {
  if (!source || typeof source !== 'object') throw new Error('Each source candidate must be an object')
  if (!source.name) throw new Error('Reviewed source candidate is missing name')
  if (!source.url) throw new Error(`Reviewed source candidate ${source.name} is missing url`)
  if (!Array.isArray(source.evidence) || source.evidence.length === 0) {
    throw new Error(`Reviewed source candidate ${source.name} must include non-empty evidence`)
  }
}
