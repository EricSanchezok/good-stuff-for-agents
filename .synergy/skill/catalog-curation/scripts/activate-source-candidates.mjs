#!/usr/bin/env node
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput(null)
const sources = Array.isArray(input) ? input : input?.sources ?? []
if (!Array.isArray(sources) || sources.length === 0) throw new Error('Provide an activation draft array or an object with a sources array')

const activated = []
const skipped = []
for (const source of sources) {
  try {
    assertActivationDraft(source)
    const record = catalogData('write-source-record.mjs', {
      source_id: source.source_id,
      name: source.name,
      url: source.url,
      type: source.type,
      status: source.status,
      license: source.license,
      sync: source.sync,
      state: source.state ?? { last_checked_at: null, last_success_at: null, last_ref: null, consecutive_failures: 0 },
    })
    activated.push(record)
  } catch (error) {
    skipped.push({ source_id: source?.source_id ?? null, name: source?.name ?? null, reason: error.message })
  }
}

printResult({ activated: activated.length, skipped, records: activated })
if (activated.length === 0 && skipped.length > 0) process.exit(2)

function assertActivationDraft(source) {
  if (!source || typeof source !== 'object') throw new Error('Source activation draft must be an object')
  for (const key of ['name', 'url', 'type', 'status', 'license', 'sync', 'activation_reason']) {
    if (!(key in source) || source[key] === null || source[key] === '') throw new Error(`Source activation draft is missing ${key}`)
  }
  if (!['active', 'preview'].includes(source.status)) throw new Error(`Unsupported activation status: ${source.status}`)
  if (source.type !== 'github_repo') throw new Error(`Unsupported source type for activation helper: ${source.type}`)
  if (!isPublicGithubRepo(source.url)) throw new Error(`Unsupported or non-public source URL: ${source.url}`)
  if (!source.license || source.license.verified !== true || !source.license.evidence) throw new Error(`Source ${source.name} requires verified license evidence`)
  if (!Array.isArray(source.activation_evidence) || source.activation_evidence.length === 0) throw new Error(`Source ${source.name} requires activation_evidence`)
  if (!Array.isArray(source.sync.include) || source.sync.include.length === 0) throw new Error(`Source ${source.name} requires sync.include patterns`)
  if (!Array.isArray(source.sync.exclude)) throw new Error(`Source ${source.name} requires sync.exclude array`)
}

function isPublicGithubRepo(url) {
  return /^https:\/\/github\.com\/[^/]+\/[^/#?]+(?:[/#?].*)?$/.test(String(url ?? ''))
}
