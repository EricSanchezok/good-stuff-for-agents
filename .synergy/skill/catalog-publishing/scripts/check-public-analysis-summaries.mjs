#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSkillRecords, prefixFor } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { analysisSummariesFromText, containsInternalAnalysisLanguage } from './lib/publishing-lib.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const skills = loadSkillRecords().map(({ record }) => record)
const errors = []

for (const skill of skills) {
  const skillId = skill.canonical_skill_id
  const analysisPath = skill.analysis?.path
  const pagePath = `docs/skills/${prefixFor(skillId)}/${skillId}.md`
  const page = read(pagePath)
  const renderedSummary = section(page, 'Summary')
  const renderedPublicSummary = section(page, 'Public Analysis Summary')

  if (!analysisPath || !existsSync(join(ROOT, analysisPath))) {
    check(renderedSummary === 'Analysis pending.', `${skillId}: missing analysis did not render the pending summary`)
    check(renderedPublicSummary === '', `${skillId}: missing analysis rendered a public analysis summary`)
    continue
  }

  const expected = analysisSummariesFromText(read(analysisPath))
  check(!containsInternalAnalysisLanguage(expected.summary), `${skillId}: selected summary contains internal analysis language`)
  check(!expected.publicSummary || !containsInternalAnalysisLanguage(expected.publicSummary), `${skillId}: public analysis summary contains internal analysis language`)
  check(normalize(expected.summary) !== normalize(expected.publicSummary), `${skillId}: summary duplicates public analysis summary`)
  check(renderedSummary === expected.summary, `${skillId}: rendered Summary does not match deterministic selection`)
  check(renderedPublicSummary === (expected.publicSummary ?? ''), `${skillId}: rendered Public Analysis Summary does not match deterministic selection`)
  check(normalize(renderedSummary) !== normalize(renderedPublicSummary), `${skillId}: rendered summaries are duplicated`)
}

for (const phrase of [
  'The strongest skill in this batch: a focused visitor-facing description.',
  'Of the 12 skills analyzed, this one has the broadest scope.',
  'Among the 8 entries reviewed, this one is the safest.',
]) {
  check(containsInternalAnalysisLanguage(phrase), `internal-language detector missed: ${phrase}`)
}

if (errors.length) {
  for (const error of errors) console.error(`public-analysis-error: ${error}`)
  process.exit(2)
}
console.log(JSON.stringify({ ok: true, checked_skills: skills.map(({ canonical_skill_id: skillId }) => skillId), checked_patterns: 3 }, null, 2))

function read(path) {
  return readFileSync(join(ROOT, path), 'utf8')
}

function section(text, heading) {
  const match = text.match(new RegExp(`## ${escapeRegExp(heading)}\\n\\n([\\s\\S]*?)(?=\\n\\n## |$)`))
  return match ? match[1].trim() : ''
}

function normalize(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function check(condition, message) {
  if (!condition) errors.push(message)
}
