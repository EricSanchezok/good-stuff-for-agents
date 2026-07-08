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
        const target = join(dirname(path), decodeURI(withoutAnchor))
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
    ? table(['Pack', 'What I made it for', 'Confidence'], model.packs.slice(0, 6).map((pack) => [`[${pack.name}](${publicHref(`docs/packs/${slug(pack.domain)}/${pack.pack_id}.md`)})`, packShortDescription(pack), confidenceLabel(pack)]))
    : '> I’m still warming up the first public packs. Once I trust a route, I’ll set it here on the shelf.'
  const domainPreview = model.domains.length
    ? bulletList(model.domains.slice(0, 12).map((domain) => `[${domainTitle(domain.id)}](${publicHref(`docs/domains/${slug(domain.id)}.md`)}) · ${domain.packs.length} packs · ${domain.skills.length} skills`))
    : '> No public domains yet. I’ll draw the map as the shelves fill in.'
  return page(recordFrontmatter(model, 'readme', 'root', 'catalog/indexes/manifest.json', model.catalogHash, null), `<p align="center">
  <img src="assets/brand/synergy-logo-192.png" width="88" alt="Synergy logo" />
</p>

<h1 align="center">Good Stuff for Agents</h1>

<p align="center"><strong>I’m collecting the good stuff for agents: useful skills, trustworthy sources, and ready-to-run packs.</strong></p>

<p align="center">
  <a href="docs/packs/README.md"><img alt="Published packs" src="https://img.shields.io/badge/packs-${model.packs.length}-F7C66A?style=for-the-badge&labelColor=101014"></a>
  <a href="docs/skills/README.md"><img alt="Indexed skills" src="https://img.shields.io/badge/skills-${model.skills.length}-B879FF?style=for-the-badge&labelColor=101014"></a>
  <a href="docs/sources/README.md"><img alt="Tracked sources" src="https://img.shields.io/badge/sources-${model.sources.length}-61F4C6?style=for-the-badge&labelColor=101014"></a>
  <a href="docs/domains/README.md"><img alt="Domains" src="https://img.shields.io/badge/domains-${model.domains.length}-FFF7DF?style=for-the-badge&labelColor=101014"></a>
</p>

<p align="center">
  <img src="assets/readme/hero-ai.png" width="960" alt="A friendly agent collecting and organizing skill catalog evidence" />
</p>

## Hi, I’m sorting the shelf.

I’m turning public agent skills into a friendly field guide: quick routes when you know the job, individual skills when you want the pieces, and source trails when you want to check where something came from.

I try to keep it bright and useful: less rummaging through raw lists, more “start here, this should help.”

## Start here

<table>
  <tr>
    <td><strong><a href="docs/packs/README.md">Packs</a></strong><br/>Prepared routes for complete agent tasks.</td>
    <td><strong><a href="docs/skills/README.md">Skills</a></strong><br/>Individual capabilities with scope, evidence, and caveats.</td>
  </tr>
  <tr>
    <td><strong><a href="docs/sources/README.md">Sources</a></strong><br/>The public projects behind the shelves.</td>
    <td><strong><a href="docs/domains/README.md">Domains</a></strong><br/>Problem-space maps when you want to browse by task.</td>
  </tr>
</table>

## Packs I’ve put on the shelf

These are ready routes, not piles of loose parts.

${packPreview}

## Browse by domain

${domainPreview}

`)
}
function renderPacksIndex(model) {
  const rows = model.packs.length ? table(['Pack', 'I’d use it for', 'Confidence'], model.packs.map((pack) => [`[${pack.name}](${publicHref(`${slug(pack.domain)}/${pack.pack_id}.md`)})`, packShortDescription(pack), confidenceLabel(pack)])) : '> No packs are public yet. I’ll pin the first ready routes here as soon as they pass review.'
  return page(indexFrontmatter(model, 'pack_index', 'docs/packs/README.md'), `# Packs

Packs are the routes I’ve assembled for a complete agent job. Start here when you know what you want done and would rather grab a focused bundle than wander through every skill on the shelf.

${rows}

[Browse skills](../skills/README.md) · [Browse domains](../domains/README.md)
`)
}

function renderSkillsIndex(model) {
  const rows = model.skills.length ? table(['Skill', 'Status', 'Domains', 'Source'], model.skills.map((skill) => [`[${skill.display_name}](${publicHref(`${prefixFor(skill.canonical_skill_id)}/${skill.canonical_skill_id}.md`)})`, publicStatus(skill.status), (skill.capabilities?.domains ?? []).map(domainTitle).join(', ') || '—', sourceNameFor(skill.source?.source_id, model)])) : '> No skills are public yet. New entries will appear here once they are ready.'
  return page(indexFrontmatter(model, 'skill_index', 'docs/skills/README.md'), `# Skills

A searchable shelf of agent capabilities. Each page is meant to answer: what is this skill for, when should an agent load it, and what evidence supports it?

${rows}

[Explore packs](../packs/README.md) · [Trace sources](../sources/README.md)
`)
}

function renderSourcesIndex(model) {
  const rows = model.sources.length ? table(['Source', 'Status', 'Type', 'License'], model.sources.map((source) => [`[${source.name}](${publicHref(`${source.source_id}.md`)})`, publicStatus(source.status), source.type, licenseText(source.license)])) : '> No sources are public yet. Approved projects and libraries will appear here as the catalog grows.'
  return page(indexFrontmatter(model, 'source_index', 'docs/sources/README.md'), `# Sources

Every good recommendation needs provenance. Sources show where catalog entries come from and how they can be checked.

${rows}

[View skills](../skills/README.md) · [View domains](../domains/README.md)
`)
}

function renderDomainsIndex(model) {
  const rows = model.domains.length ? table(['Domain', 'Packs', 'Skills', 'Sources'], model.domains.map((domain) => [`[${domainTitle(domain.id)}](${publicHref(`${slug(domain.id)}.md`)})`, String(domain.packs.length), String(domain.skills.length), String(domain.sources.length)])) : '> No domains are public yet. Domains will appear here as the catalog grows.'
  return page(indexFrontmatter(model, 'domain_index', 'docs/domains/README.md'), `# Domains

Browse the catalog by problem space. Domains are the map; packs are the routes; skills are the pieces.

${rows}

[Explore packs](../packs/README.md) · [Explore skills](../skills/README.md)
`)
}

function renderReportsIndex(model) {
  return page(indexFrontmatter(model, 'report_index', 'docs/reports/README.md'), '# Reports\n\nPublic reports will appear here when there are useful catalog health, coverage, or release notes to share.\n')
}


function renderPackPage(model, pack) {
  const route = packRouteSteps(pack, model)
  const members = packMemberJobs(pack, model)
  const note = packUseNote(pack)
  return page(recordFrontmatter(model, 'pack', pack.pack_id, pack.__path, pack.__hash, pack.evaluation?.evaluation_id), `# ${pack.name}

${packLead(pack)}

## When I’d reach for it

${bulletList(packUseCases(pack))}

## The route I built

${numberedList(route)}

## What I put inside

${members}

## Why I trust it

${packTrustNote(pack)}

${note ? `## A small note before using it\n\n${note}\n\n` : ''}## Version

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

- Source: ${sourceNameFor(skill.source?.source_id, model)}
- License: ${licenseText(skill.source?.license)}

## Capabilities

- Domains: ${inlineList(skill.capabilities?.domains)}
- Task types: ${inlineList(skill.capabilities?.task_types)}
- Best stage: ${inlineList(skill.capabilities?.workflow_stages)}
- Capabilities: ${inlineList(skill.capabilities?.atomic_capabilities)}

## Best Used For / Not For

Use when the trigger semantics and task stage match the job. Do not use when required tools, permissions, license, or confidence do not fit the current run.

## Inputs / Outputs

- Inputs: ${inlineList(skill.interfaces?.inputs)}
- Outputs: ${inlineList(skill.interfaces?.outputs)}
- Handoff outputs: ${inlineList(skill.interfaces?.handoff_outputs)}

## Related Packs

${relatedPacks.length ? bulletList(relatedPacks.map((pack) => `[${pack.name}](${publicHref(`../../packs/${slug(pack.domain)}/${pack.pack_id}.md`)})`)) : 'No published packs use this skill yet.'}

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

## Shelf health

${sourceHealthNote(source)}

## Tracked Skills

${skills.length ? bulletList(skills.map((skill) => `[${skill.display_name}](${publicHref(`../skills/${prefixFor(skill.canonical_skill_id)}/${skill.canonical_skill_id}.md`)})`)) : 'No skills tracked for this source yet.'}

## Packs Using This Source

${packs.length ? bulletList(packs.map((pack) => `[${pack.name}](${publicHref(`../packs/${slug(pack.domain)}/${pack.pack_id}.md`)})`)) : 'No published packs use this source yet.'}
`)
}

function renderDomainPage(model, domain) {
  return page(recordFrontmatter(model, 'domain', domain.id, 'catalog/indexes/domain-catalog.jsonl', model.catalogHash, null), `# ${domainTitle(domain.id)}

## Summary

This domain groups related skills and packs so agents can start from the problem space instead of a raw list.

## Published Packs

${domain.packs.length ? bulletList(domain.packs.map((pack) => `[${pack.name}](${publicHref(`../packs/${slug(pack.domain)}/${pack.pack_id}.md`)})`)) : 'No published packs yet.'}

## Relevant Skills

${domain.skills.length ? bulletList(domain.skills.map((skill) => `[${skill.display_name}](${publicHref(`../skills/${prefixFor(skill.canonical_skill_id)}/${skill.canonical_skill_id}.md`)})`)) : 'No skills are public for this domain yet.'}

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


function numberedList(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n')
}

function packShortDescription(pack) {
  if (pack.domain === 'frontend-design') return 'Turning fuzzy UI requests into polished, opinionated, reviewable interfaces.'
  if (pack.domain === 'coding-agent-workflow') return 'Moving a coding agent from plan to release with checks along the way.'
  return pack.intent ?? `A prepared route for ${readableDomain(pack.domain)} work.`
}

function confidenceLabel(pack) {
  const parts = []
  if (typeof pack.evaluation?.score === 'number') parts.push(`${Math.round(pack.evaluation.score * 100)}% confidence`)
  const freshness = pack.status === 'stale' ? 'freshness note inside' : humanStatus(pack.status)
  if (freshness) parts.push(freshness)
  return parts.join(' · ') || 'Evidence still being checked'
}

function packLead(pack) {
  if (pack.domain === 'frontend-design') {
    return 'I made this pack for the moment a UI request is still foggy but needs to become a polished, opinionated interface. It lines up brand direction, visual system work, interface shaping, and review so an agent can move like a tiny design studio instead of rummaging through loose tips.'
  }
  if (pack.domain === 'coding-agent-workflow') {
    return 'I made this pack as a practical delivery route for coding agents: plan the work, make small implementation moves, prove them with tests, review the result, harden the risky edges, and launch without dropping the checklist on the floor.'
  }
  return `I made this pack as a prepared route for agents working in ${readableDomain(pack.domain)}. ${pack.intent ?? 'It gathers the pieces that look most useful together and gives them a cleaner path to follow.'}`
}

function packUseCases(pack) {
  if (pack.domain === 'frontend-design') {
    return [
      'A product or landing page needs a stronger visual direction before implementation.',
      'An agent needs brand, theme, layout, and interface-shaping guidance in one path.',
      'A design needs a second pass before it is treated as ready for humans.',
    ]
  }
  if (pack.domain === 'coding-agent-workflow') {
    return [
      'A coding agent needs to turn an ambiguous request into a planned sequence of small changes.',
      'Implementation should stay testable, reviewed, and security-aware before release.',
      'The work needs a launch path instead of stopping at “the code compiles.”',
    ]
  }
  const stages = unique((pack.members ?? []).map((member) => member.stage).filter(Boolean)).slice(0, 3)
  if (stages.length) return stages.map((stage) => `An agent needs ${readable(stage)} help inside a ${readableDomain(pack.domain)} task.`)
  return [pack.intent ?? `A ${readableDomain(pack.domain)} task needs a prepared skill route.`]
}

function packRouteSteps(pack, model) {
  const workflow = normalizeWorkflowForPublishing(pack.workflow)
  if (workflow.stages.length) {
    return workflow.stages.map((stage) => routeStepFromWorkflowStage(stage, model))
  }
  if (workflow.summary) return splitRouteSummary(workflow.summary)
  const grouped = groupMembersByStage(pack.members ?? [])
  if (grouped.length) {
    return grouped.map(([stage, members]) => `**${titleCase(stage)}** — ${members.map((member) => member.role ? readable(member.role) : memberLabel(member, model)).join(', ')} keep this part of the route covered.`)
  }
  return [`**Start with the goal** — ${pack.intent ?? `Use the pack for ${readableDomain(pack.domain)} work and follow the member skills in order.`}`]
}

function routeStepFromWorkflowStage(stage, model) {
  const name = stage.name ?? stage.stage ?? 'Next step'
  const description = stage.description ?? 'Use the matching member skills for this part of the route.'
  const ids = stage.member_skill_ids ?? stage.skill_ids ?? []
  const memberNames = ids.map((id) => skillNameFor(id, model)).filter(Boolean)
  const suffix = memberNames.length ? ` I put ${inlineHumanList(memberNames)} here.` : ''
  return `**${name}** — ${description}${suffix}`
}

function packMemberJobs(pack, model) {
  return table(['Skill', 'Job in the pack'], (pack.members ?? []).map((member) => {
    const skillName = skillNameFor(member.skill_id, model) ?? member.skill_id
    const job = member.inclusion_reason ?? `${titleCase(member.stage ?? member.role ?? 'support')} support for this route.`
    return [`[${skillName}](${publicHref(`../../skills/${prefixFor(member.skill_id)}/${member.skill_id}.md`)})`, job]
  }))
}

function packTrustNote(pack) {
  const pieces = []
  if (pack.evidence?.all_analyzed) pieces.push('I checked that every member skill has analysis behind it')
  if (pack.evidence?.license_verified) pieces.push('the licenses are recorded as verified')
  if (pack.evidence?.source_count) pieces.push(`the route draws from ${pack.evidence.source_count} ${pack.evidence.source_count === 1 ? 'source' : 'sources'}`)
  if (typeof pack.evaluation?.score === 'number') pieces.push(`evaluation landed at ${score(pack.evaluation.score)}`)
  const compatibility = normalizeCompatibilityForPublishing(pack.compatibility)
  const compatibilityNote = compatibility.notes ? ` ${compatibility.notes}` : ''
  const base = pieces.length ? `I trust this shelf pick because ${inlineHumanList(pieces)}.` : 'I trust this shelf pick only as far as the recorded catalog evidence supports it.'
  const conflictNote = compatibility.conflicts.length || compatibility.unresolved.length ? '' : ' I didn’t find a blocking conflict in the published notes.'
  return `${base}${compatibilityNote}${conflictNote}`
}

function packUseNote(pack) {
  const compatibility = normalizeCompatibilityForPublishing(pack.compatibility)
  const warnings = [...compatibility.unresolved, ...compatibility.conflicts]
  if (warnings.length) return `Tiny caution flag: ${warnings.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).join(' ')} Check that before relying on the route.`
  if (pack.status === 'stale') return humanStatus('stale')
  if (pack.status && !['active', 'published'].includes(pack.status)) return humanStatus(pack.status)
  return ''
}

function normalizeWorkflowForPublishing(workflow) {
  if (typeof workflow === 'string') return { summary: workflow, stages: [] }
  if (!workflow || typeof workflow !== 'object') return { summary: '', stages: [] }
  return { summary: workflow.summary ?? '', stages: Array.isArray(workflow.stages) ? workflow.stages : [] }
}

function normalizeCompatibilityForPublishing(compatibility) {
  return {
    notes: compatibility?.notes ?? '',
    complements: Array.isArray(compatibility?.complements) ? compatibility.complements : [],
    overlaps: Array.isArray(compatibility?.overlaps) ? compatibility.overlaps : [],
    conflicts: Array.isArray(compatibility?.conflicts) ? compatibility.conflicts : [],
    unresolved: Array.isArray(compatibility?.unresolved) ? compatibility.unresolved : [],
  }
}

function splitRouteSummary(summary) {
  return String(summary)
    .split(/\s*(?:→|->)\s*/)
    .map((step) => step.replace(/^\d+\)\s*/, '').trim())
    .filter(Boolean)
    .map((step) => {
      const match = step.match(/^([^()]+)(?:\(([^)]+)\))?$/)
      if (!match) return `**${titleCase(step)}** — Follow this part of the route.`
      const name = titleCase(match[1].trim())
      const detail = match[2] ? readable(match[2]).replace(/\+/g, ' and ') : 'Follow the matching member skills for this part of the route.'
      return `**${name}** — ${detail}`
    })
}

function groupMembersByStage(members) {
  const groups = new Map()
  for (const member of members) {
    const stage = member.stage ?? 'support'
    if (!groups.has(stage)) groups.set(stage, [])
    groups.get(stage).push(member)
  }
  return [...groups.entries()]
}

function skillNameFor(skillId, model) {
  return model.skills.find((skill) => skill.canonical_skill_id === skillId)?.display_name
}

function sourceNameFor(sourceId, model) {
  if (!sourceId) return '—'
  return model.sources.find((source) => source.source_id === sourceId)?.name ?? sourceId
}

function memberLabel(member, model) {
  return skillNameFor(member.skill_id, model) ?? readable(member.role ?? member.stage ?? 'support')
}

function publicHref(path) {
  return String(path)
}

function domainTitle(value) {
  return titleCase(value)
}

function sourceHealthNote(source) {
  if (source.state?.consecutive_failures) return 'I have this source on the shelf, but the latest availability check needs another look before treating it as smooth sailing.'
  const checked = source.state?.last_success_at ?? source.state?.last_checked_at
  return checked ? `I last saw this source respond successfully around ${checked}.` : 'I have this source on the shelf, but no recent availability note is recorded yet.'
}

function readableDomain(value) {
  return readable(value || 'general agent')
}

function readable(value) {
  return String(value).replace(/[_-]/g, ' ')
}

function titleCase(value) {
  return readable(value).replace(/\b\w/g, (char) => char.toUpperCase())
}

function unique(values) {
  return [...new Set(values)]
}

function inlineHumanList(items) {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}
function licenseText(license) {
  if (!license) return 'unknown'
  const spdx = license.spdx ?? 'unknown'
  return `${spdx}${license.verified ? ' (verified)' : ' (unverified)'}`
}

function statusBanner(status) {
  const note = humanStatus(status)
  return note ? `> ${note}` : ''
}

function publicStatus(status) {
  return humanStatus(status) || 'Ready'
}

function humanStatus(status) {
  const labels = {
    active: 'Ready to use',
    published: 'Ready to use',
    preview: 'Previewing before it goes on the main shelf',
    candidate: 'Still being checked before it goes on the main shelf',
    rejected: 'Needs more work before I would recommend it',
    stale: 'Freshness note: this passed review, but something it depends on may have changed since then.',
    deprecated: 'Retired from the main route, but kept for context',
    archived: 'Archived for reference',
    removed: 'Removed from the active shelf',
    broken: 'Temporarily unavailable',
    blocked: 'Waiting on a blocker before I can recommend it',
  }
  return labels[status] ?? (status ? String(status).replace(/_/g, ' ') : '')
}


function relatedSkillLabel(edge, currentSkill, model) {
  const relatedId = edge.subject === currentSkill.canonical_skill_id ? edge.object : edge.subject
  const related = model.skills.find((skill) => skill.canonical_skill_id === relatedId)
  if (!related) return ''
  const relation = String(edge.predicate ?? 'related').replace(/_/g, ' ')
  return `${relation}: [${related.display_name}](${publicHref(`../${prefixFor(related.canonical_skill_id)}/${related.canonical_skill_id}.md`)})`
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
