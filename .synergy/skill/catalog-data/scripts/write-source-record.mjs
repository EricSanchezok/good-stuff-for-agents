#!/usr/bin/env node
import { idFor, loadRegistry, nowIso, readDraft, writeRegistry } from './lib/catalog-lib.mjs'

const draft = readDraft(process.argv.slice(2))
const source = {
  schema_version: 1,
  source_id: draft.source_id ?? idFor('src', [draft.url ?? draft.name, draft.name ?? 'source']),
  name: draft.name,
  url: draft.url ?? null,
  type: draft.type ?? 'github_repo',
  status: draft.status ?? 'active',
  license: draft.license ?? { spdx: null, verified: false, evidence: null },
  sync: draft.sync ?? { strategy: 'git', default_ref: 'main', frequency: 'daily', include: ['**/SKILL.md'], exclude: ['node_modules/**'] },
  state: draft.state ?? { last_checked_at: null, last_success_at: null, last_ref: null, consecutive_failures: 0 },
  updated_at: draft.updated_at ?? nowIso(),
}
const registry = loadRegistry()
const idx = registry.sources.findIndex((item) => item.source_id === source.source_id)
if (idx >= 0) registry.sources[idx] = { ...registry.sources[idx], ...source }
else registry.sources.push(source)
registry.sources.sort((a, b) => a.source_id.localeCompare(b.source_id))
writeRegistry(registry)
console.log(JSON.stringify(source, null, 2))
