#!/usr/bin/env node
import { analysisPath, idFor, loadRegistry, nowIso, parseYamlFile, readDraft, sha256, skillRecordPath, writeYaml } from './lib/catalog-lib.mjs'
import { existsSync } from 'node:fs'

const draft = readDraft(process.argv.slice(2))
const skillId = draft.canonical_skill_id ?? idFor('skl', [draft.canonical_name ?? draft.display_name, draft.source?.source_id, draft.source?.path])
const target = skillRecordPath(skillId)
const previous = existsSync(target) ? parseYamlFile(target) : {}
const now = nowIso()

// Version identity: prefer content_digest from snapshot artifact, then explicit version_id,
// then fall back to a hash of source identity (stable across empty capabilities).
const versionId = draft.identity?.content_digest
  ?? draft.identity?.current_version_id
  ?? draft.version_id
  ?? sha256(JSON.stringify({ source_id: draft.source?.source_id, path: draft.source?.path }))

const record = {
  schema_version: 1,
  canonical_skill_id: skillId,
  canonical_name: draft.canonical_name ?? previous.canonical_name ?? skillId,
  display_name: draft.display_name ?? previous.display_name ?? draft.canonical_name ?? skillId,
  status: draft.status ?? previous.status ?? 'active',
  identity: {
    source_skill_ids: draft.identity?.source_skill_ids ?? previous.identity?.source_skill_ids ?? [],
    aliases: draft.identity?.aliases ?? previous.identity?.aliases ?? [],
    current_version_id: versionId,
  },
  source: draft.source ?? previous.source ?? { source_id: null, path: null, url: null, upstream_ref: null, license: { spdx: null, verified: false } },
  capabilities: draft.capabilities ?? previous.capabilities ?? { domains: [], task_types: [], workflow_stages: [], atomic_capabilities: [] },
  interfaces: draft.interfaces ?? previous.interfaces ?? { inputs: [], outputs: [], handoff_outputs: [] },
  tools: draft.tools ?? previous.tools ?? { required: [], optional: [] },
  risk: draft.risk ?? previous.risk ?? { side_effect_level: 'none', risk_surfaces: [] },
  quality: draft.quality ?? previous.quality ?? { score: null, confidence: 'unknown' },
  relations: draft.relations ?? previous.relations ?? { duplicates: [], complements: [], conflicts: [] },
  analysis: draft.analysis ?? previous.analysis ?? { path: `catalog/analyses/${skillId.replace(/^skl_/, '').slice(0, 2)}/${skillId}.md`, hash: null },
  curation: draft.curation ?? previous.curation ?? { notes: [] },
  created_at: previous.created_at ?? draft.created_at ?? now,
  updated_at: draft.updated_at ?? now,
}
// Auto-inherit license from source registry when draft provides no license
if (!record.source.license || !record.source.license.spdx) {
  const registry = loadRegistry()
  const src = registry.sources.find(s => s.source_id === record.source.source_id)
  if (src?.license) {
    record.source.license = {
      spdx: src.license.spdx ?? null,
      verified: src.license.verified ?? false,
      evidence: src.license.evidence ?? null,
    }
  }
}
writeYaml(target, record)
console.log(JSON.stringify(record, null, 2))
