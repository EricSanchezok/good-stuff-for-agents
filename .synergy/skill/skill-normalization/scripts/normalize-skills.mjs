#!/usr/bin/env node
import { CATALOG } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, option, printResult, readJsonInput, readJsonl } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { join } from 'node:path'

const input = readJsonInput(null)
const runId = option('--run-id', input?.run_id ?? 'run_manual')
const candidates = input?.candidates ?? readJsonl(join(CATALOG, 'skills', 'candidates', `${runId}.jsonl`))
const records = []
for (const candidate of candidates) {
  const name = candidate.declared_name ?? candidate.path?.split('/').filter(Boolean).pop()?.replace(/\.md$/i, '') ?? candidate.candidate_id
  records.push(catalogData('write-skill-record.mjs', {
    canonical_name: String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || candidate.candidate_id,
    display_name: name,
    status: 'active',
    version_id: candidate.content_digest,
    identity: { source_skill_ids: [candidate.candidate_id], aliases: [], current_version_id: candidate.content_digest },
    source: { source_id: candidate.source_id, path: candidate.path, url: null, upstream_ref: null, license: { spdx: null, verified: false } },
    capabilities: { domains: [], task_types: [], workflow_stages: [], atomic_capabilities: [] },
    interfaces: { inputs: [], outputs: [], handoff_outputs: [] },
    tools: { required: [], optional: [] },
    risk: { side_effect_level: 'none', risk_surfaces: [] },
    quality: { score: null, confidence: candidate.parse_confidence ?? 'unknown' },
    relations: { duplicates: [], complements: [], conflicts: [] },
  }))
}
printResult({ run_id: runId, normalized: records.length, records })
