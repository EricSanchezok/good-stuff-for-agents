#!/usr/bin/env node
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput({ sources: [] })
const sources = Array.isArray(input) ? input : input.sources ?? []
const records = []
for (const source of sources) {
  records.push(catalogData('append-source-candidate.mjs', {
    name: source.name,
    url: source.url,
    type: source.type ?? 'github_repo',
    evidence: source.evidence ?? [],
    license: source.license ?? { spdx: null, verified: false, evidence: null },
    parseability: source.parseability ?? 'unknown',
    rejection_reason: source.rejection_reason ?? null,
  }))
}
printResult({ discovered: records.length, records })
