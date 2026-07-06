#!/usr/bin/env node
import { loadSkillRecords } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const skills = loadSkillRecords().map(({ record }) => record)
const records = []
for (let i = 0; i < skills.length; i += 1) {
  for (let j = i + 1; j < skills.length; j += 1) {
    const a = skills[i]
    const b = skills[j]
    const domainsA = new Set(a.capabilities?.domains ?? [])
    const sharedDomain = (b.capabilities?.domains ?? []).find((domain) => domainsA.has(domain))
    if (!sharedDomain) continue
    records.push(catalogData('append-relation.mjs', {
      subject: a.canonical_skill_id,
      predicate: 'overlaps_with',
      object: b.canonical_skill_id,
      weight: 0.5,
      evidence: `Shared domain ${sharedDomain}`,
      source: 'skill-dedup-relations',
    }))
  }
}
printResult({ relations_written: records.length, records })
