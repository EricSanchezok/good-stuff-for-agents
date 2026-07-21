#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { assertCatalogId, CATALOG } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, option, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { loadLatestSnapshotArtifacts } from './lib/snapshot-artifacts.mjs'

const input = readJsonInput(null)
const runId = assertCatalogId('run', option('--run-id', input?.run_id ?? 'run_manual'))
const sourceIdValue = option('--source-id', input?.source_id ?? null)
const sourceId = sourceIdValue ? assertCatalogId('source', sourceIdValue) : null
const snapshotRoot = join(CATALOG, 'sources', 'snapshots')
const artifacts = input?.artifacts ?? loadLatestSnapshotArtifacts(snapshotRoot, sourceId)
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
