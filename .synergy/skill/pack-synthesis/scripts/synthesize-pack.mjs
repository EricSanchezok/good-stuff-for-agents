#!/usr/bin/env node
import { idFor, loadSkillRecords } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, option, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput({}) ?? {}
const intent = option('--intent', input.intent ?? '')
const domain = option('--domain', input.domain ?? 'uncategorized')
const skills = loadSkillRecords().map(({ record }) => record).filter((skill) => skill.status === 'active' || skill.status === 'preview')
const candidates = skills.filter((skill) => !domain || domain === 'uncategorized' || (skill.capabilities?.domains ?? []).includes(domain)).slice(0, input.limit ?? 15)
if (!intent || candidates.length < 3) {
  printResult({ synthesized: false, reason: !intent ? 'intent required' : 'fewer than 3 eligible skills', eligible_skills: candidates.length })
  process.exit(0)
}
const packId = input.pack_id ?? idFor('pack', [intent, domain, ...candidates.map((skill) => skill.canonical_skill_id)])
const record = catalogData('write-pack-record.mjs', {
  pack_id: packId,
  name: input.name ?? `${domain} Pack`,
  status: 'candidate',
  intent,
  domain,
  created_by_run: input.run_id ?? 'run_manual',
  version: '0.1.0',
  members: candidates.map((skill, index) => ({
    skill_id: skill.canonical_skill_id,
    version_id: skill.identity?.current_version_id,
    role: skill.canonical_name,
    stage: skill.capabilities?.workflow_stages?.[0] ?? `stage-${index + 1}`,
    inclusion_reason: `Eligible ${domain} skill for ${intent}.`,
  })),
  excluded: skills.filter((skill) => !candidates.includes(skill)).slice(0, 10).map((skill) => ({ skill_id: skill.canonical_skill_id, reason: 'Not selected for minimal candidate size or domain fit.' })),
  workflow: { stages: candidates.map((skill) => skill.capabilities?.workflow_stages?.[0] ?? skill.canonical_name) },
  compatibility: { complements: [], overlaps: [], conflicts: [] },
  evidence: { analysis_paths: candidates.map((skill) => skill.analysis?.path).filter(Boolean), relation_edges: [] },
  evaluation: { evaluation_id: null, score: null, status: 'pending' },
})
printResult({ synthesized: true, record })
