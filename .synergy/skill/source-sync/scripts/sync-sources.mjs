#!/usr/bin/env node
/**
* Thin CLI wrapper for source-sync.
* All logic lives in sync-sources-lib.mjs.
* Importing this module produces zero I/O, zero network, zero writes.
*/
import { syncApprovedSources } from './sync-sources-lib.mjs'
import { catalogData, printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { loadRegistry, ROOT, writeTextAtomic } from '../../catalog-data/scripts/lib/catalog-lib.mjs'

async function main() {
 const registry = loadRegistry()
 const summary = await syncApprovedSources({
   sources: registry.sources,
   writeSourceRecord: (record) => catalogData('write-source-record.mjs', record),
   writeSnapshot: (path, content) => writeTextAtomic(path, content),
 })
 const states = []
 for (const e of summary.source_errors) {
   states.push(catalogData('append-source-state.mjs', {
     source_id: e.source_id,
     changed: e.changed ?? false,
     upstream_ref: e.upstream_ref ?? null,
     status: e.category === 'success' ? 'ok' : e.category === 'inactive' ? 'inactive' : 'error',
     skills_found: e.skills_found ?? 0,
     errors: e.category !== 'success' ? [e.reason ?? e.category] : [],
   }))
 }
 // Provider incidents are run-level aggregates — never per-source
 printResult({
   attempted: summary.attempted,
   refreshed: summary.refreshed,
   unchanged: summary.unchanged,
   source_failed: summary.source_failed,
   provider_blocked: summary.provider_blocked,
   inactive: summary.inactive,
   provider_incidents: summary.provider_incidents,
   repo: ROOT,
   manifests: summary.manifests,
   states,
 })
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/sync-sources.mjs')
if (isMain) {
 main().catch((err) => {
   process.stderr.write(`sync-sources: ${err.message}\n`)
   process.exit(1)
 })
}
