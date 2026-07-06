#!/usr/bin/env node
import { idFor, loadPackRecords, packRecordPath, writeYaml } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput({}) ?? {}
const packs = loadPackRecords('candidates').map(({ path, record }) => ({ path, record })).filter(({ record }) => !input.pack_id || record.pack_id === input.pack_id)
const evaluations = []
for (const { path, record } of packs) {
  const memberCount = record.members?.length ?? 0
  const conflictCount = record.compatibility?.conflicts?.length ?? 0
  const evidenceCount = (record.evidence?.analysis_paths?.length ?? 0) + (record.evidence?.relation_edges?.length ?? 0)
  const metrics = {
    relevance: record.intent ? 0.8 : 0.2,
    coverage: memberCount >= 3 ? 0.8 : 0.3,
    non_redundancy: 0.7,
    workflow_coherence: record.workflow?.stages?.length ? 0.75 : 0.3,
    compatibility: conflictCount === 0 ? 0.8 : 0.4,
    conflict_control: conflictCount === 0 ? 0.85 : 0.3,
    evidence_quality: evidenceCount ? 0.75 : 0.4,
    actionability: memberCount ? 0.7 : 0.2,
    freshness: 0.75,
  }
  const score = Object.values(metrics).reduce((sum, value) => sum + value, 0) / Object.values(metrics).length
  const status = score >= 0.78 ? 'passed' : score >= 0.6 ? 'needs_work' : 'rejected'
  const evaluationId = idFor('eval', [record.pack_id, String(score)])
  const evaluation = catalogData('write-evaluation.mjs', {
    evaluation_id: evaluationId,
    pack_id: record.pack_id,
    output_id: record.pack_id,
    kind: 'pack',
    metrics,
    overall_score: score,
    passed: score >= 0.78,
    failure_modes: score >= 0.78 ? [] : ['below publication threshold'],
    recommendations: score >= 0.78 ? ['eligible for promotion'] : ['improve evidence, coverage, or compatibility before publication'],
  })
  const next = { ...record, evaluation: { evaluation_id: evaluationId, score, status }, status: status === 'rejected' ? 'rejected' : record.status }
  writeYaml(path, next)
  evaluations.push(evaluation)
}
printResult({ evaluated: evaluations.length, evaluations })
