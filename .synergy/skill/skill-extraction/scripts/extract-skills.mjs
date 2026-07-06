#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOG } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, option, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput(null)
const runId = option('--run-id', input?.run_id ?? 'run_manual')
const sourceId = option('--source-id', input?.source_id ?? null)
const artifacts = input?.artifacts ?? loadArtifacts(sourceId)
const records = []
for (const artifact of artifacts) {
  const digest = artifact.content_digest ?? `sha256:${createHash('sha256').update(JSON.stringify(artifact)).digest('hex')}`
  records.push(catalogData('append-skill-candidate.mjs', {
    source_id: artifact.source_id,
    path: artifact.path,
    declared_name: artifact.declared_name ?? artifact.name,
    format: artifact.format ?? 'SKILL.md',
    parse_confidence: artifact.parse_confidence ?? 'medium',
    content_digest: digest,
    raw_metadata: artifact.raw_metadata ?? { upstream_ref: artifact.upstream_ref, url: artifact.url },
  }, ['--run-id', runId]))
}
printResult({ run_id: runId, extracted: records.length, records })

function loadArtifacts(filterSourceId) {
  const snapshotDir = join(CATALOG, 'sources', 'snapshots')
  if (!existsSync(snapshotDir)) return []
  const manifests = listJson(snapshotDir)
    .map((path) => JSON.parse(readFileSync(path, 'utf8')))
    .filter((manifest) => !filterSourceId || manifest.source_id === filterSourceId)
    .sort((a, b) => String(b.checked_at).localeCompare(String(a.checked_at)))
  const bySource = new Map()
  for (const manifest of manifests) {
    if (!bySource.has(manifest.source_id)) bySource.set(manifest.source_id, manifest)
  }
  return [...bySource.values()].flatMap((manifest) => manifest.artifacts ?? [])
}

function listJson(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) out.push(...listJson(path))
    else if (path.endsWith('.json')) out.push(path)
  }
  return out.sort()
}
