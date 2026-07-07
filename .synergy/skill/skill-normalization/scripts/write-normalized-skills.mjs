#!/usr/bin/env node
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput(null)
const skills = Array.isArray(input) ? input : input?.skills ? input.skills : input ? [input] : []
if (!Array.isArray(skills) || skills.length === 0) throw new Error('Provide a normalized skill draft or an object with a skills array')

const records = []
for (const skill of skills) {
  assertNormalizedDraft(skill)
  records.push(catalogData('write-skill-record.mjs', skill))
}

printResult({ written: records.length, skill_ids: records.map((record) => record.canonical_skill_id), records })

function assertNormalizedDraft(skill) {
  if (!skill || typeof skill !== 'object') throw new Error('Skill draft must be an object')
  if (!skill.canonical_name && !skill.display_name && !skill.canonical_skill_id) throw new Error('Skill draft needs canonical_name, display_name, or canonical_skill_id')
  if (!skill.source?.source_id) throw new Error(`Skill draft ${skill.display_name ?? skill.canonical_name ?? skill.canonical_skill_id} is missing source.source_id`)
  if (!skill.source?.path) throw new Error(`Skill draft ${skill.display_name ?? skill.canonical_name ?? skill.canonical_skill_id} is missing source.path`)
  if (!skill.identity?.current_version_id && !skill.identity?.content_digest && !skill.version_id) throw new Error(`Skill draft ${skill.display_name ?? skill.canonical_name ?? skill.canonical_skill_id} is missing version identity (need identity.current_version_id, identity.content_digest, or version_id)`)
}
