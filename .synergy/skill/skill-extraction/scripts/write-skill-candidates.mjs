#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CATALOG } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, option, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput(null)
const runId = option('--run-id', input?.run_id ?? 'run_manual')
const sourceId = option('--source-id', input?.source_id ?? null)
const artifacts = input?.artifacts ?? loadLatestSnapshotArtifacts(sourceId)
if (!Array.isArray(artifacts)) throw new Error('Expected artifacts array from input or source snapshots')

const records = []
const skipped = []
for (const artifact of artifacts) {
  try {
    assertArtifact(artifact)
    const digest = artifact.content_digest ?? `sha256:${createHash('sha256').update(JSON.stringify(artifact)).digest('hex')}`
    records.push(catalogData('append-skill-candidate.mjs', {
      source_id: artifact.source_id,
      path: artifact.path,
      declared_name: artifact.declared_name ?? artifact.name ?? null,
      format: artifact.format ?? inferFormat(artifact.path),
      parse_confidence: artifact.parse_confidence ?? inferConfidence(artifact.path),
      content_digest: digest,
      raw_metadata: artifact.raw_metadata ?? { upstream_ref: artifact.upstream_ref, url: artifact.url },
    }, ['--run-id', runId]))
  } catch (error) {
    skipped.push({ path: artifact?.path ?? null, source_id: artifact?.source_id ?? null, reason: error.message })
  }
}

printResult({ run_id: runId, written: records.length, skipped, records })

function assertArtifact(artifact) {
  if (!artifact || typeof artifact !== 'object') throw new Error('Artifact must be an object')
  if (!artifact.source_id) throw new Error('Artifact is missing source_id')
  if (!artifact.path) throw new Error('Artifact is missing path')
  if (!isSupportedPath(artifact.path)) throw new Error(`Unsupported artifact path: ${artifact.path}`)
}

function loadLatestSnapshotArtifacts(filterSourceId) {
  const snapshotDir = join(CATALOG, 'sources', 'snapshots')
  if (!existsSync(snapshotDir)) return []
  const manifests = listJson(snapshotDir)
    .map((path) => JSON.parse(readFileSync(path, 'utf8')))
    .filter((manifest) => !filterSourceId || manifest.source_id === filterSourceId)
    .sort((a, b) => String(b.checked_at).localeCompare(String(a.checked_at)))
  const latestBySource = new Map()
  for (const manifest of manifests) {
    if (!latestBySource.has(manifest.source_id)) latestBySource.set(manifest.source_id, manifest)
  }
  return [...latestBySource.values()].flatMap((manifest) => manifest.artifacts ?? [])
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

function isSupportedPath(path) {
  return path === 'SKILL.md' || path.endsWith('/SKILL.md') || /(^|\/)(skill|skills|prompt|prompts|agent|agents)[^/]*\.(md|mdx|txt|json)$/i.test(path)
}

function inferFormat(path) {
  if (path === 'SKILL.md' || path.endsWith('/SKILL.md')) return 'SKILL.md'
  if (path.endsWith('.json')) return 'json'
  return 'markdown'
}

function inferConfidence(path) {
  return path === 'SKILL.md' || path.endsWith('/SKILL.md') ? 'high' : 'medium'
}
