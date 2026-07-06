import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import {
  CATALOG,
  ROOT,
  buildIndexes,
  computeCatalogHash,
  loadPackRecords,
  loadRegistry,
  loadSkillRecords,
  prefixFor,
  readJsonl,
  readText,
  sha256,
  slug,
  stableStringify,
  validateCatalog,
  writeTextAtomic,
} from '../../../catalog-data/scripts/lib/catalog-lib.mjs'

const DOCS = join(ROOT, 'docs')

export function renderAll() {
  const validation = validateCatalog({ strict: true })
  if (!validation.ok) {
    throw new Error(`catalog validation failed before publishing:\n${validation.errors.join('\n')}`)
  }

  const manifest = buildIndexes()
  const model = loadModel(manifest)
  const pages = buildRenderedPages(model)
  cleanGeneratedMarkdown(pages)
  for (const [path, content] of pages.entries()) writeTextAtomic(path, content)
  ensureGeneratedDirectories()
  return { catalog_hash: model.catalogHash, generated_at: model.generatedAt, written: [...pages.keys()].map((path) => relative(ROOT, path)).sort() }
}

export function checkDocsDrift() {
  const validation = validateCatalog({ strict: true })
  if (!validation.ok) return { ok: false, drift: validation.errors.map((message) => ({ type: 'validation-error', message })) }

  const model = loadModel(readManifest())
  const expected = buildRenderedPages(model)
  const drift = []
  for (const [path, expectedContent] of expected.entries()) {
    if (!existsSync(path)) drift.push({ path: relative(ROOT, path), type: 'missing' })
    else if (readText(path) !== expectedContent) drift.push({ path: relative(ROOT, path), type: 'changed' })
  }

  for (const path of listMarkdownFiles(DOCS)) {
    if (expected.has(path)) continue
    drift.push({ path: relative(ROOT, path), type: 'unmanaged-docs-markdown' })
  }

  return { ok: drift.length === 0, drift, expected: [...expected.keys()].map((path) => relative(ROOT, path)).sort() }
}

export function checkLinks() {
  const model = loadModel(readManifest())
  const expected = buildRenderedPages(model)
  const errors = []
  const patterns = [/\[[^\]]+\]\(([^)]+)\)/g, /\b(?:href|src)="([^"]+)"/g]
  const generated = [...expected.keys()].filter((path) => existsSync(path))
  for (const path of generated) {
    const text = readText(path)
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const raw = match[1].trim()
        if (!raw || raw.startsWith('#') || /^[a-z]+:/i.test(raw) || raw.startsWith('mailto:') || raw.startsWith('data:')) continue
        const withoutAnchor = raw.split('#')[0]
        if (!withoutAnchor) continue
        const target = join(dirname(path), withoutAnchor)
        if (!existsSync(target)) errors.push(`${relative(ROOT, path)} links to missing ${raw}`)
      }
    }
  }
  return { ok: errors.length === 0, errors, checked_files: generated.map((path) => relative(ROOT, path)).sort() }
}

function buildRenderedPages(model) {
  const pages = new Map()
  pages.set(join(ROOT, 'README.md'), renderReadme(model))
  pages.set(join(DOCS, 'packs', 'README.md'), renderPacksIndex(model))
  pages.set(join(DOCS, 'skills', 'README.md'), renderSkillsIndex(model))
  pages.set(join(DOCS, 'sources', 'README.md'), renderSourcesIndex(model))
  pages.set(join(DOCS, 'domains', 'README.md'), renderDomainsIndex(model))
  pages.set(join(DOCS, 'reports', 'README.md'), renderReportsIndex(model))

  for (const pack of model.packs) pages.set(join(DOCS, 'packs', slug(pack.domain), `${pack.pack_id}.md`), renderPackPage(model, pack))
  for (const skill of model.skills) pages.set(join(DOCS, 'skills', prefixFor(skill.canonical_skill_id), `${skill.canonical_skill_id}.md`), renderSkillPage(model, skill))
  for (const source of model.sources) pages.set(join(DOCS, 'sources', `${source.source_id}.md`), renderSourcePage(model, source))
  for (const domain of model.domains) pages.set(join(DOCS, 'domains', `${slug(domain.id)}.md`), renderDomainPage(model, domain))
  return pages
}

function loadModel(manifest) {
  const catalogHash = computeCatalogHash()
  const generatedAt = stableGeneratedAt(manifest, catalogHash)
  const skills = loadSkillRecords().map(({ path, record }) => ({ ...record, __path: relative(ROOT, path), __hash: sha256(readText(path)) })).sort((a, b) => a.canonical_skill_id.localeCompare(b.canonical_skill_id))
  const registry = loadRegistry()
  const sources = registry.sources.map((source) => ({ ...source, __path: 'catalog/sources/registry.yaml', __hash: sha256(stableStringify(source)) })).sort((a, b) => a.source_id.localeCompare(b.source_id))
  const packs = loadPackRecords('published').map(({ path, record }) => ({ ...record, __path: relative(ROOT, path), __hash: sha256(readText(path)) })).sort((a, b) => a.pack_id.localeCompare(b.pack_id))
  const relations = readJsonl(join(CATALOG, 'relations', 'edges-00000.jsonl'))
  const analyses = new Map(skills.map((skill) => [skill.canonical_skill_id, loadAnalysisSummary(skill.analysis?.path)]))
  const domains = deriveDomains(skills, packs)
  return { catalogHash, generatedAt, manifest, skills, sources, packs, relations, analyses, domains }
}

function readManifest() {
  const path = join(CATALOG, 'indexes', 'manifest.json')
  if (!existsSync(path)) return null
  try { return JSON.parse(readText(path)) } catch { return null }
}

function stableGeneratedAt(manifest, catalogHash) {
  if (manifest?.catalog_hash === catalogHash && manifest.generated_at) return manifest.generated_at
  return new Date().toISOString()
}

function deriveDomains(skills, packs) {
  const ids = [...new Set([...skills.flatMap((skill) => skill.capabilities?.domains ?? []), ...packs.map((pack) => pack.domain)].filter(Boolean))].sort()
  return ids.map((id) => ({
    id,
    skills: skills.filter((skill) => (skill.capabilities?.domains ?? []).includes(id)),
    packs: packs.filter((pack) => pack.domain === id),
    sources: [...new Set(skills.filter((skill) => (skill.capabilities?.domains ?? []).includes(id)).map((skill) => skill.source?.source_id).filter(Boolean))].sort(),
  }))
}

function loadAnalysisSummary(path) {
  if (!path) return { available: false, summary: 'Analysis pending.' }
  const full = join(ROOT, path)
  if (!existsSync(full)) return { available: false, summary: 'Analysis pending.' }
  const text = readText(full)
  const purpose = section(text, 'Core Purpose')
  return { available: true, summary: purpose || 'Analysis available.', hash: sha256(text) }
}

function section(text, heading) {
  const pattern = new RegExp(`## ${escapeRegExp(heading)}\\n([\\s\\S]*?)(?=\\n## |$)`)
  const match = text.match(pattern)
  return match ? match[1].trim() : ''
}

function renderReadme(model) {
  const packPreview = model.packs.length
    ? table(['Pack', 'Domain', 'Score'], model.packs.slice(0, 6).map((pack) => [`[${pack.name}](docs/packs/${slug(pack.domain)}/${pack.pack_id}.md)`, pack.domain, score(pack.evaluation?.score)]))
    : '> The first public packs are still warming up. Once a pack is ready, it lands here.'
  const domainPreview = model.domains.length
    ? bulletList(model.domains.slice(0, 12).map((domain) => `[${domain.id}](docs/domains/${slug(domain.id)}.md) · ${domain.packs.length} packs · ${domain.skills.length} skills`))
    : '> No public domains yet. This section will fill in as the catalog grows.'
  return page(recordFrontmatter(model, 'readme', 'root', 'catalog/indexes/manifest.json', model.catalogHash, null), `<p align="center">
  <img src="assets/brand/synergy-logo-192.png" width="88" alt="Synergy logo" />
</p>

<h1 align="center">Good Stuff for Agents</h1>

<p align="center"><strong>A friendly field guide to useful agent skills, packs, sources, and domains.</strong></p>

<p align="center">
  <a href="docs/packs/README.md"><img alt="Published packs" src="https://img.shields.io/badge/packs-${model.packs.length}-F7C66A?style=for-the-badge&labelColor=101014"></a>
  <a href="docs/skills/README.md"><img alt="Indexed skills" src="https://img.shields.io/badge/skills-${model.skills.length}-B879FF?style=for-the-badge&labelColor=101014"></a>
  <a href="docs/sources/README.md"><img alt="Tracked sources" src="https://img.shields.io/badge/sources-${model.sources.length}-61F4C6?style=for-the-badge&labelColor=101014"></a>
  <a href="docs/domains/README.md"><img alt="Domains" src="https://img.shields.io/badge/domains-${model.domains.length}-FFF7DF?style=for-the-badge&labelColor=101014"></a>
</p>

<p align="center">
  <img src="assets/readme/hero-ai.png" width="960" alt="A friendly agent collecting and organizing skill catalog evidence" />
</p>

## Hello, agents.

Welcome to **Good Stuff for Agents** — a living catalog of agent skills, source projects, capability maps, and evaluated skill packs. It is built for agents and humans who want the good stuff fast: what a skill does, when to use it, what it pairs with, and whether the evidence is strong enough to trust.

## Start here

<table>
  <tr>
    <td><strong><a href="docs/packs/README.md">Packs</a></strong><br/>Curated skill sets for complete agent tasks.</td>
    <td><strong><a href="docs/skills/README.md">Skills</a></strong><br/>Individual capabilities with evidence, scope, and usage notes.</td>
  </tr>
  <tr>
    <td><strong><a href="docs/sources/README.md">Sources</a></strong><br/>Projects and libraries behind the catalog entries.</td>
    <td><strong><a href="docs/domains/README.md">Domains</a></strong><br/>Browse by problem space, from research to coding to design.</td>
  </tr>
</table>

## Featured packs

${packPreview}

## Browse by domain

${domainPreview}

`)
}
function renderPacksIndex(model) {
  const rows = model.packs.length ? table(['Pack', 'Domain', 'Status', 'Score'], model.packs.map((pack) => [`[${pack.name}](${slug(pack.domain)}/${pack.pack_id}.md)`, pack.domain, publicStatus(pack.status), score(pack.evaluation?.score)])) : '> No packs are public yet. Ready-to-use packs will appear here as the catalog grows.'
  return page(indexFrontmatter(model, 'pack_index', 'docs/packs/README.md'), `# Packs\n\nCurated skill sets for complete agent tasks. Start here when you know the job and want a focused bundle instead of a pile of individual tools.\n\n${rows}\n\n[Browse skills](../skills/README.md) · [Browse domains](../domains/README.md)\n`)
}

function renderSkillsIndex(model) {
  const rows = model.skills.length ? table(['Skill', 'Status', 'Domains', 'Source'], model.skills.map((skill) => [`[${skill.display_name}](${prefixFor(skill.canonical_skill_id)}/${skill.canonical_skill_id}.md)`, publicStatus(skill.status), (skill.capabilities?.domains ?? []).join(', ') || '—', skill.source?.source_id ?? '—'])) : '> No skills are public yet. New entries will appear here once they are ready.'
  return page(indexFrontmatter(model, 'skill_index', 'docs/skills/README.md'), `# Skills\n\nA searchable shelf of agent capabilities. Each page is meant to answer: what is this skill for, when should an agent load it, and what evidence supports it?\n\n${rows}\n\n[Explore packs](../packs/README.md) · [Trace sources](../sources/README.md)\n`)
}

function renderSourcesIndex(model) {
  const rows = model.sources.length ? table(['Source', 'Status', 'Type', 'License'], model.sources.map((source) => [`[${source.name}](${source.source_id}.md)`, publicStatus(source.status), source.type, licenseText(source.license)])) : '> No sources are public yet. Approved projects and libraries will appear here as the catalog grows.'
  return page(indexFrontmatter(model, 'source_index', 'docs/sources/README.md'), `# Sources\n\nEvery good recommendation needs provenance. Sources show where catalog entries come from and how they can be checked.\n\n${rows}\n\n[View skills](../skills/README.md) · [View domains](../domains/README.md)\n`)
}

function renderDomainsIndex(model) {
  const rows = model.domains.length ? table(['Domain', 'Packs', 'Skills', 'Sources'], model.domains.map((domain) => [`[${domain.id}](${slug(domain.id)}.md)`, String(domain.packs.length), String(domain.skills.length), String(domain.sources.length)])) : '> No domains are public yet. Domains will appear here as the catalog grows.'
  return page(indexFrontmatter(model, 'domain_index', 'docs/domains/README.md'), `# Domains\n\nBrowse the catalog by problem space. Domains are the map; packs are the routes; skills are the pieces.\n\n${rows}\n\n[Explore packs](../packs/README.md) · [Explore skills](../skills/README.md)\n`)
}

function renderReportsIndex(model) {
  return page(indexFrontmatter(model, 'report_index', 'docs/reports/README.md'), '# Reports\n\nPublic reports will appear here when there are useful catalog health, coverage, or release notes to share.\n')
}


function renderPackPage(model, pack) {
  const members = pack.members?.length ? table(['Skill', 'Role', 'Stage', 'Why it helps'], pack.members.map((member) => {
    const skill = model.skills.find((item) => item.canonical_skill_id === member.skill_id)
    const skillLink = skill ? `../../skills/${prefixFor(skill.canonical_skill_id)}/${skill.canonical_skill_id}.md` : ''
    return [skill ? `[${skill.display_name}](${skillLink})` : 'Skill entry pending', member.role, member.stage, member.inclusion_reason]
  })) : 'No members recorded.'
  const stages = pack.workflow?.stages?.length ? bulletList(pack.workflow.stages.map((stage) => typeof stage === 'string' ? stage : `${stage.name ?? stage.stage ?? 'stage'} — ${stage.description ?? ''}`)) : 'No stage notes recorded.'
  return page(recordFrontmatter(model, 'pack', pack.pack_id, pack.__path, pack.__hash, pack.evaluation?.evaluation_id), `# ${pack.name}

${statusBanner(pack.status)}

## What This Pack Is

${pack.intent}

## When to Use It

Use this pack for \`${pack.domain}\` work when the member skills match the task and current version pins remain fresh.

## Member Skills

${members}

## How It Fits Together

${stages}

## Why This Combination Works

${listOrFallback(pack.compatibility?.complements, 'No complement evidence recorded.')}

## Overlap and Conflict Handling

- Overlaps: ${inlineList(pack.compatibility?.overlaps)}
- Conflicts: ${inlineList(pack.compatibility?.conflicts)}

## Evidence and Quality

This pack is backed by source analysis, relation checks, and review notes.

- Status: ${publicStatus(pack.evaluation?.status ?? pack.status)}
- Score: ${score(pack.evaluation?.score)}

## Version

${pack.version ?? 'Current'}${pack.updated_at ? ` · Updated ${pack.updated_at}` : ''}
`)
}

function renderSkillPage(model, skill) {
  const analysis = model.analyses.get(skill.canonical_skill_id)
  const relatedEdges = model.relations.filter((edge) => edge.subject === skill.canonical_skill_id || edge.object === skill.canonical_skill_id)
  const relatedPacks = model.packs.filter((pack) => (pack.members ?? []).some((member) => member.skill_id === skill.canonical_skill_id))
  return page(recordFrontmatter(model, 'skill', skill.canonical_skill_id, skill.__path, skill.__hash, null), `# ${skill.display_name}

${statusBanner(skill.status)}

## Summary

${analysis?.summary ?? 'Analysis pending.'}

## Source

- Source: ${skill.source?.source_id ?? '—'}
- License: ${licenseText(skill.source?.license)}

## Capabilities

- Domains: ${inlineList(skill.capabilities?.domains)}
- Task types: ${inlineList(skill.capabilities?.task_types)}
- Good for: ${inlineList(skill.capabilities?.workflow_stages)}
- Capabilities: ${inlineList(skill.capabilities?.atomic_capabilities)}

## Best Used For / Not For

Use when the trigger semantics and workflow stage match the task. Do not use when required tools, permissions, license, or confidence do not fit the current run.

## Inputs / Outputs

- Inputs: ${inlineList(skill.interfaces?.inputs)}
- Outputs: ${inlineList(skill.interfaces?.outputs)}
- Handoff outputs: ${inlineList(skill.interfaces?.handoff_outputs)}

## Related Packs

${relatedPacks.length ? bulletList(relatedPacks.map((pack) => `[${pack.name}](../../packs/${slug(pack.domain)}/${pack.pack_id}.md)`)) : 'No published packs use this skill yet.'}

## Related Skills

${relatedEdges.length ? bulletList(relatedEdges.slice(0, 12).map((edge) => relatedSkillLabel(edge, skill, model)).filter(Boolean)) : 'No related skills are public yet.'}

## Public Analysis Summary

${analysis?.summary ?? 'Analysis pending.'}

## Confidence and Limitations

- Quality score: ${score(skill.quality?.score)}
- Confidence: ${skill.quality?.confidence ?? 'unknown'}
- Risk surfaces: ${inlineList(skill.risk?.risk_surfaces)}
`)
}

function renderSourcePage(model, source) {
  const skills = model.skills.filter((skill) => skill.source?.source_id === source.source_id)
  const packs = model.packs.filter((pack) => (pack.members ?? []).some((member) => skills.some((skill) => skill.canonical_skill_id === member.skill_id)))
  return page(recordFrontmatter(model, 'source', source.source_id, source.__path, source.__hash, null), `# ${source.name}

${statusBanner(source.status)}

## Overview

- URL: ${source.url ?? '—'}
- Type: ${source.type}
- License: ${licenseText(source.license)}

## Catalog Status

- Last checked: ${source.state?.last_success_at ?? source.state?.last_checked_at ?? '—'}
- Availability: ${source.state?.consecutive_failures ? 'Needs another check' : 'Available'}

## Tracked Skills

${skills.length ? bulletList(skills.map((skill) => `[${skill.display_name}](../skills/${prefixFor(skill.canonical_skill_id)}/${skill.canonical_skill_id}.md)`)) : 'No skills tracked for this source yet.'}

## Packs Using This Source

${packs.length ? bulletList(packs.map((pack) => `[${pack.name}](../packs/${slug(pack.domain)}/${pack.pack_id}.md)`)) : 'No published packs use this source yet.'}
`)
}

function renderDomainPage(model, domain) {
  return page(recordFrontmatter(model, 'domain', domain.id, 'catalog/indexes/domain-catalog.jsonl', model.catalogHash, null), `# ${domain.id}

## Summary

This domain groups related skills and packs so agents can start from the problem space instead of a raw list.

## Published Packs

${domain.packs.length ? bulletList(domain.packs.map((pack) => `[${pack.name}](../packs/${slug(pack.domain)}/${pack.pack_id}.md)`)) : 'No published packs yet.'}

## Relevant Skills

${domain.skills.length ? bulletList(domain.skills.map((skill) => `[${skill.display_name}](../skills/${prefixFor(skill.canonical_skill_id)}/${skill.canonical_skill_id}.md)`)) : 'No skills are public for this domain yet.'}

## Sources

${domain.sources.length ? bulletList(domain.sources) : 'No public sources yet.'}
`)
}

function page(_frontmatter, body) {
  return `${body.trim()}\n`
}

function recordFrontmatter() {
  return null
}

function indexFrontmatter() {
  return null
}


function table(headers, rows) {
  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '—').replace(/\n/g, ' ')).join(' | ')} |`)].join('\n')
}

function bulletList(items) {
  return items.map((item) => `- ${item}`).join('\n')
}

function inlineList(value) {
  if (!value || value.length === 0) return '—'
  return Array.isArray(value) ? value.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join(', ') : String(value)
}

function listOrFallback(value, fallback) {
  return value && value.length ? bulletList(value.map((item) => typeof item === 'string' ? item : JSON.stringify(item))) : fallback
}

function licenseText(license) {
  if (!license) return 'unknown'
  const spdx = license.spdx ?? 'unknown'
  return `${spdx}${license.verified ? ' (verified)' : ' (unverified)'}`
}

function statusBanner(status) {
  if (!status || ['active', 'published'].includes(status)) return ''
  return `> Status: **${status}**`
}

function publicStatus(status) {
  const labels = { active: 'Ready', published: 'Published', preview: 'Preview', candidate: 'Candidate', rejected: 'Needs work', stale: 'Stale', deprecated: 'Deprecated', archived: 'Archived', removed: 'Removed', broken: 'Unavailable', blocked: 'Blocked' }
  return labels[status] ?? status ?? '—'
}


function relatedSkillLabel(edge, currentSkill, model) {
  const relatedId = edge.subject === currentSkill.canonical_skill_id ? edge.object : edge.subject
  const related = model.skills.find((skill) => skill.canonical_skill_id === relatedId)
  if (!related) return ''
  const relation = String(edge.predicate ?? 'related').replace(/_/g, ' ')
  return `${relation}: [${related.display_name}](../${prefixFor(related.canonical_skill_id)}/${related.canonical_skill_id}.md)`
}

function score(value) {
  return typeof value === 'number' ? value.toFixed(2) : '—'
}


function cleanGeneratedMarkdown(expected) {
  for (const path of listMarkdownFiles(DOCS)) {
    if (!expected.has(path)) rmSync(path, { force: true })
  }
}

function ensureGeneratedDirectories() {
  for (const dir of [join(DOCS, 'packs', 'by-domain'), join(DOCS, 'skills', 'by-domain'), join(DOCS, 'skills', 'by-source')]) mkdirSync(dir, { recursive: true })
}


function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) out.push(...listMarkdownFiles(path))
    else if (path.endsWith('.md')) out.push(path)
  }
  return out.sort()
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
