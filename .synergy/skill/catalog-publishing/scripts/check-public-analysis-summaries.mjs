#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analysisSummariesFromText, containsInternalAnalysisLanguage } from './lib/publishing-lib.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const cases = [
  {
    name: 'literature-review',
    analysis: 'catalog/analyses/li/skl_literature-review-src-https-github-com-k-dense-ai-53dfc208-db6d39-skills-literature-review-skill-md_53dfc208.md',
    page: 'docs/skills/li/skl_literature-review-src-https-github-com-k-dense-ai-53dfc208-db6d39-skills-literature-review-skill-md_53dfc208.md',
    summaryIncludes: 'A full 7-phase systematic literature review methodology',
  },
  {
    name: 'analyze-feature-requests',
    analysis: 'catalog/analyses/an/skl_analyze-feature-requests-src-https-github-com-phur-80ef1368-skills-analyze-feature-requests-skill-md_80ef1368.md',
    page: 'docs/skills/an/skl_analyze-feature-requests-src-https-github-com-phur-80ef1368-skills-analyze-feature-requests-skill-md_80ef1368.md',
    summaryIncludes: 'A feature-request triage skill',
  },
]

const errors = []
for (const fixture of cases) {
  const analysis = read(fixture.analysis)
  const expected = analysisSummariesFromText(analysis)
  const page = read(fixture.page)
  const renderedSummary = section(page, 'Summary')
  const renderedPublicSummary = section(page, 'Public Analysis Summary')

  check(expected.summary.includes(fixture.summaryIncludes), `${fixture.name}: visitor-facing summary was not selected`)
  check(!containsInternalAnalysisLanguage(expected.summary), `${fixture.name}: selected summary contains internal analysis language`)
  check(!expected.publicSummary || !containsInternalAnalysisLanguage(expected.publicSummary), `${fixture.name}: public analysis summary contains internal analysis language`)
  check(normalize(expected.summary) !== normalize(expected.publicSummary), `${fixture.name}: summary duplicates public analysis summary`)
  check(renderedSummary === expected.summary, `${fixture.name}: rendered Summary does not match deterministic selection`)
  check(renderedPublicSummary === (expected.publicSummary ?? ''), `${fixture.name}: rendered Public Analysis Summary does not match deterministic selection`)
  check(normalize(renderedSummary) !== normalize(renderedPublicSummary), `${fixture.name}: rendered summaries are duplicated`)
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
console.log(JSON.stringify({ ok: true, checked_skills: cases.map(({ name }) => name), checked_patterns: 3 }, null, 2))

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
