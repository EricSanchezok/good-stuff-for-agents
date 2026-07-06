import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

export const ROOT = findRepoRoot()
export const CATALOG = join(ROOT, 'catalog')

export const STATUS = {
  skill: new Set(['candidate', 'active', 'preview', 'deprecated', 'removed', 'broken', 'blocked']),
  pack: new Set(['candidate', 'rejected', 'published', 'stale', 'superseded', 'archived']),
  source: new Set(['candidate', 'active', 'deprecated', 'removed', 'broken', 'blocked']),
}

export const RELATION_PREDICATES = new Set([
  'same_as',
  'variant_of',
  'fork_of',
  'supersedes',
  'overlaps_with',
  'complements',
  'conflicts_with',
  'requires_tool',
  'fits_workflow_stage',
  'input_enables',
  'belongs_to_domain',
])

function findRepoRoot() {
  let current = dirname(fileURLToPath(import.meta.url))
  while (current !== dirname(current)) {
    if (existsSync(join(current, 'AGENTS.md')) || existsSync(join(current, 'catalog'))) return current
    current = dirname(current)
  }
  return process.cwd()
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

export function listFiles(dir, predicate = () => true) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) out.push(...listFiles(path, predicate))
    else if (predicate(path)) out.push(path)
  }
  return out.sort()
}

export function readText(path) {
  return readFileSync(path, 'utf8')
}

export function writeTextAtomic(path, content) {
  ensureDir(dirname(path))
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}-${randomUUID()}`
  writeFileSync(tmp, content)
  renameSync(tmp, path)
}

export function sha256(text) {
  return `sha256:${createHash('sha256').update(text).digest('hex')}`
}

export function stableStringify(value) {
  return JSON.stringify(sortDeep(value), null, 2) + '\n'
}

export function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (value && typeof value === 'object') {
    const sorted = {}
    for (const key of Object.keys(value).sort()) sorted[key] = sortDeep(value[key])
    return sorted
  }
  return value
}

export function parseYamlFile(path) {
  const content = readText(path)
  return parseYaml(content, path)
}

export function parseYaml(content, label = '<yaml>') {
  const jsonAttempt = tryJson(content)
  if (jsonAttempt.ok) return jsonAttempt.value

  const proc = spawnSync('python3', ['-c', 'import sys, json, yaml; print(json.dumps(yaml.safe_load(sys.stdin.read()), ensure_ascii=False))'], {
    input: content,
    encoding: 'utf8',
  })
  if (proc.status !== 0) {
    throw new Error(`Failed to parse YAML ${label}: ${proc.stderr || proc.stdout}`)
  }
  return JSON.parse(proc.stdout)
}

function tryJson(content) {
  try {
    return { ok: true, value: JSON.parse(content) }
  } catch {
    return { ok: false }
  }
}

export function toYaml(value) {
  const proc = spawnSync('python3', ['-c', 'import sys, json, yaml; print(yaml.safe_dump(json.loads(sys.stdin.read()), sort_keys=False, allow_unicode=True), end="")'], {
    input: stableStringify(value),
    encoding: 'utf8',
  })
  if (proc.status !== 0) throw new Error(`Failed to render YAML: ${proc.stderr || proc.stdout}`)
  return proc.stdout
}

function renderYaml(value, indent) {
  const pad = ' '.repeat(indent)
  if (value === null) return 'null\n'
  if (typeof value !== 'object') return `${scalar(value)}\n`
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]\n'
    let out = ''
    for (const item of value) {
      if (item && typeof item === 'object') {
        out += `${pad}- ${inlineHead(item)}`
      } else {
        out += `${pad}- ${scalar(item)}\n`
      }
    }
    return out
  }
  const keys = Object.keys(value)
  if (keys.length === 0) return '{}\n'
  let out = ''
  for (const key of keys) {
    const val = value[key]
    if (val && typeof val === 'object') {
      if (Array.isArray(val) && val.length === 0) out += `${pad}${key}: []\n`
      else if (!Array.isArray(val) && Object.keys(val).length === 0) out += `${pad}${key}: {}\n`
      else out += `${pad}${key}:\n${renderYaml(val, indent + 2)}`
    } else {
      out += `${pad}${key}: ${scalar(val)}\n`
    }
  }
  return out
}

function inlineHead(obj) {
  const keys = Object.keys(obj).sort()
  if (keys.length === 0) return '{}\n'
  const [first, ...rest] = keys
  const firstVal = obj[first]
  let out = `${first}: ${firstVal && typeof firstVal === 'object' ? '\n' + renderYaml(firstVal, 4) : scalar(firstVal) + '\n'}`
  for (const key of rest) {
    const val = obj[key]
    if (val && typeof val === 'object') out += `${' '.repeat(2)}${key}:\n${renderYaml(val, 4)}`
    else out += `${' '.repeat(2)}${key}: ${scalar(val)}\n`
  }
  return out
}

function scalar(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  const str = String(value)
  if (/^[A-Za-z0-9_./:@-]+$/.test(str) && !['null', 'true', 'false'].includes(str)) return str
  return JSON.stringify(str)
}

export function readJsonl(path) {
  if (!existsSync(path)) return []
  const content = readText(path)
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  return lines.map((line, idx) => {
    try {
      return JSON.parse(line)
    } catch (error) {
      throw new Error(`${relative(ROOT, path)}:${idx + 1}: invalid JSONL: ${error.message}`)
    }
  })
}

export function appendJsonl(path, value) {
  ensureDir(dirname(path))
  const current = existsSync(path) ? readText(path) : ''
  const line = JSON.stringify(sortDeep(value))
  writeTextAtomic(path, current + line + '\n')
}

export function writeYaml(path, value) {
  writeTextAtomic(path, toYaml(value))
}

export function readDraft(argv) {
  const source = argv[0]
  const text = source ? readText(resolve(ROOT, source)) : readFileSync(0, 'utf8')
  return JSON.parse(text)
}

export function prefixFor(id) {
  const clean = id.replace(/^[^_]+_/, '')
  return clean.slice(0, 2).toLowerCase().replace(/[^a-z0-9]/g, 'x') || 'xx'
}

export function slug(input) {
  return String(input || 'item')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item'
}

export function idFor(prefix, parts) {
  const base = slug(parts.filter(Boolean).join('-'))
  const hash = createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 8)
  return `${prefix}_${base}_${hash}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function sourceRecordPath(sourceId) {
  return join(CATALOG, 'sources', 'registry.yaml')
}

export function skillRecordPath(skillId) {
  return join(CATALOG, 'skills', 'records', prefixFor(skillId), `${skillId}.yaml`)
}

export function analysisPath(skillId) {
  return join(CATALOG, 'analyses', prefixFor(skillId), `${skillId}.md`)
}

export function packRecordPath(packId, status = 'candidate') {
  const bucket = status === 'published' ? 'published' : 'candidates'
  return join(CATALOG, 'packs', bucket, packId, 'pack.yaml')
}

export function evaluationPathForPack(packId, status = 'candidate') {
  const bucket = status === 'published' ? 'published' : 'candidates'
  return join(CATALOG, 'packs', bucket, packId, 'evaluation.json')
}

export function evidencePathForPack(packId, status = 'candidate') {
  const bucket = status === 'published' ? 'published' : 'candidates'
  return join(CATALOG, 'packs', bucket, packId, 'evidence.md')
}

export function loadRegistry() {
  const path = join(CATALOG, 'sources', 'registry.yaml')
  if (!existsSync(path)) return { schema_version: 1, sources: [] }
  const registry = parseYamlFile(path) || {}
  return { schema_version: registry.schema_version ?? 1, sources: registry.sources ?? [] }
}

export function writeRegistry(registry) {
  writeYaml(join(CATALOG, 'sources', 'registry.yaml'), { schema_version: registry.schema_version ?? 1, sources: registry.sources ?? [] })
}

export function loadSkillRecords() {
  return listFiles(join(CATALOG, 'skills', 'records'), (path) => path.endsWith('.yaml')).map((path) => ({ path, record: parseYamlFile(path) }))
}

export function loadPackRecords(bucket = null) {
  const base = bucket ? join(CATALOG, 'packs', bucket) : join(CATALOG, 'packs')
  return listFiles(base, (path) => path.endsWith('pack.yaml')).map((path) => ({ path, record: parseYamlFile(path) }))
}

export function validateCatalog({ strict = false } = {}) {
  const errors = []
  const warnings = []
  const add = (condition, message) => { if (!condition) errors.push(message) }
  const warn = (condition, message) => { if (!condition) warnings.push(message) }

  add(!existsSync(join(ROOT, 'workflows')), 'root workflows/ directory is prohibited')
  add(!existsSync(join(ROOT, '.synergy', 'agent')) && !existsSync(join(ROOT, '.synergy', 'agents')), '.synergy/agent(s) custom agent directories are prohibited')

  try {
    const registry = loadRegistry()
    add(registry.schema_version === 1, 'catalog/sources/registry.yaml schema_version must be 1')
    add(Array.isArray(registry.sources), 'catalog/sources/registry.yaml sources must be an array')
    for (const source of registry.sources) validateSource(source, errors)
  } catch (error) {
    errors.push(error.message)
  }

  for (const file of ['candidates.jsonl', 'state.jsonl']) {
    try { readJsonl(join(CATALOG, 'sources', file)) } catch (error) { errors.push(error.message) }
  }
  for (const file of ['edges-00000.jsonl', 'duplicate-candidates.jsonl', 'clusters.jsonl']) {
    try {
      const rows = readJsonl(join(CATALOG, 'relations', file))
      if (file.startsWith('edges')) rows.forEach((edge, index) => validateRelation(edge, errors, `${file}:${index + 1}`))
    } catch (error) { errors.push(error.message) }
  }

  for (const { path, record } of loadSkillRecords()) validateSkill(record, errors, relative(ROOT, path))
  for (const { path, record } of loadPackRecords()) validatePack(record, errors, relative(ROOT, path))

  for (const path of listFiles(join(CATALOG, 'analyses'), (file) => file.endsWith('.md'))) validateAnalysisMarkdown(path, errors, warnings)

  if (strict) {
    for (const path of listFiles(join(CATALOG), (file) => file.endsWith('.yaml') || file.endsWith('.jsonl') || file.endsWith('.json'))) {
      warn(!path.includes('.tmp-'), `temporary file found: ${relative(ROOT, path)}`)
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

function validateSource(source, errors) {
  const label = source.source_id || source.name || '<source>'
  required(source, ['schema_version', 'source_id', 'name', 'type', 'status'], errors, `source ${label}`)
  if (source.status) errors.push(...enumErrors(STATUS.source, source.status, `source ${label}.status`))
  if (source.license) required(source.license, ['verified'], errors, `source ${label}.license`)
}

function validateSkill(skill, errors, label) {
  required(skill, ['schema_version', 'canonical_skill_id', 'canonical_name', 'display_name', 'status', 'identity', 'source', 'capabilities', 'interfaces', 'tools', 'risk', 'quality', 'relations', 'analysis', 'created_at', 'updated_at'], errors, label)
  if (skill.status) errors.push(...enumErrors(STATUS.skill, skill.status, `${label}.status`))
  if (skill.identity) required(skill.identity, ['source_skill_ids', 'aliases', 'current_version_id'], errors, `${label}.identity`)
  if (skill.source) required(skill.source, ['source_id', 'path', 'license'], errors, `${label}.source`)
  for (const key of ['domains', 'task_types', 'workflow_stages', 'atomic_capabilities']) if (!Array.isArray(skill.capabilities?.[key])) errors.push(`${label}.capabilities.${key} must be array`)
  for (const key of ['inputs', 'outputs', 'handoff_outputs']) if (!Array.isArray(skill.interfaces?.[key])) errors.push(`${label}.interfaces.${key} must be array`)
}

function validatePack(pack, errors, label) {
  required(pack, ['schema_version', 'pack_id', 'name', 'status', 'intent', 'domain', 'created_by_run', 'version', 'members', 'excluded', 'workflow', 'compatibility', 'evidence', 'evaluation', 'updated_at'], errors, label)
  if (pack.status) errors.push(...enumErrors(STATUS.pack, pack.status, `${label}.status`))
  if (!Array.isArray(pack.members)) errors.push(`${label}.members must be array`)
  for (const [idx, member] of (pack.members || []).entries()) required(member, ['skill_id', 'version_id', 'role', 'stage', 'inclusion_reason'], errors, `${label}.members[${idx}]`)
}

function validateRelation(edge, errors, label) {
  required(edge, ['schema_version', 'subject', 'predicate', 'object', 'weight', 'evidence', 'source', 'created_at'], errors, label)
  if (edge.predicate && !RELATION_PREDICATES.has(edge.predicate)) errors.push(`${label}.predicate invalid: ${edge.predicate}`)
}

function validateAnalysisMarkdown(path, errors, warnings) {
  const text = readText(path)
  const label = relative(ROOT, path)
  if (!text.startsWith('---\n')) {
    errors.push(`${label} must have YAML frontmatter`)
    return
  }
  const parts = text.split('---')
  if (parts.length < 3) {
    errors.push(`${label} frontmatter is not closed`)
    return
  }
  const fm = parseYaml(parts[1], `${label} frontmatter`)
  required(fm, ['schema_version', 'skill_id', 'source_hash', 'analysis_version', 'confidence', 'updated_at'], errors, `${label}.frontmatter`)
  for (const section of ['Core Purpose', 'Trigger Semantics', 'Capability Breakdown', 'Workflow Role', 'Inputs / Outputs', 'Tool and Permission Profile', 'Compatibility Notes', 'Conflict Notes', 'Dedupe Notes', 'Evaluation Hooks', 'Evidence and Confidence']) {
    warnings.push(...(!text.includes(`## ${section}`) ? [`${label} missing section ${section}`] : []))
  }
}

function required(obj, keys, errors, label) {
  for (const key of keys) if (!(key in (obj || {}))) errors.push(`${label} missing required field ${key}`)
}

function enumErrors(set, value, label) {
  return set.has(value) ? [] : [`${label} must be one of ${Array.from(set).join(', ')}`]
}

export function computeCatalogHash() {
  const paths = [
    join(CATALOG, 'sources', 'registry.yaml'),
    join(CATALOG, 'sources', 'state.jsonl'),
    ...listFiles(join(CATALOG, 'skills', 'records'), (p) => p.endsWith('.yaml')),
    ...listFiles(join(CATALOG, 'analyses'), (p) => p.endsWith('.md')),
    ...listFiles(join(CATALOG, 'relations'), (p) => p.endsWith('.jsonl')),
    ...listFiles(join(CATALOG, 'packs', 'published'), (p) => p.endsWith('.yaml') || p.endsWith('.json') || p.endsWith('.md')),
  ].filter((path) => existsSync(path)).sort()
  const h = createHash('sha256')
  for (const path of paths) {
    h.update(relative(ROOT, path))
    h.update('\0')
    h.update(readText(path))
    h.update('\0')
  }
  return `sha256:${h.digest('hex')}`
}

export function buildIndexes() {
  const skills = loadSkillRecords().map(({ record }) => ({
    id: record.canonical_skill_id,
    name: record.display_name,
    canonical_name: record.canonical_name,
    status: record.status,
    domains: record.capabilities?.domains ?? [],
    task_types: record.capabilities?.task_types ?? [],
    workflow_stages: record.capabilities?.workflow_stages ?? [],
    quality_score: record.quality?.score ?? null,
    confidence: record.quality?.confidence ?? 'unknown',
    analysis: record.analysis?.path ?? null,
    updated_at: record.updated_at,
  })).sort((a, b) => a.id.localeCompare(b.id))
  const registry = loadRegistry()
  const sources = registry.sources.map((source) => ({ id: source.source_id, name: source.name, status: source.status, type: source.type, license: source.license ?? null }))
  const packs = loadPackRecords('published').map(({ record }) => ({ id: record.pack_id, name: record.name, status: record.status, domain: record.domain, version: record.version, score: record.evaluation?.score ?? null, updated_at: record.updated_at }))
  const domains = [...new Set([...skills.flatMap((s) => s.domains), ...packs.map((p) => p.domain)].filter(Boolean))].sort().map((id) => ({ id, skill_count: skills.filter((s) => s.domains.includes(id)).length, pack_count: packs.filter((p) => p.domain === id).length }))

  writeJsonl(join(CATALOG, 'indexes', 'skill-catalog.jsonl'), skills)
  writeJsonl(join(CATALOG, 'indexes', 'source-catalog.jsonl'), sources)
  writeJsonl(join(CATALOG, 'indexes', 'pack-catalog.jsonl'), packs)
  writeJsonl(join(CATALOG, 'indexes', 'domain-catalog.jsonl'), domains)
  writeShards(skills)
  const counts = { skills: skills.length, sources: sources.length, packs: packs.length, domains: domains.length }
  const shards = listFiles(join(CATALOG, 'indexes', 'shards'), (p) => p.endsWith('.jsonl')).map((p) => relative(ROOT, p))
  const catalogHash = computeCatalogHash()
  const manifestPath = join(CATALOG, 'indexes', 'manifest.json')
  let previousManifest = null
  if (existsSync(manifestPath)) {
    try { previousManifest = JSON.parse(readText(manifestPath)) } catch { previousManifest = null }
  }
  const generatedAt = previousManifest?.catalog_hash === catalogHash && stableStringify(previousManifest?.counts) === stableStringify(counts) && stableStringify(previousManifest?.shards) === stableStringify(shards)
    ? previousManifest.generated_at
    : nowIso()
  const manifest = { schema_version: 1, generated_at: generatedAt, catalog_hash: catalogHash, counts, shards }
  writeTextAtomic(manifestPath, stableStringify(manifest))
  return manifest
}

function writeJsonl(path, rows) {
  writeTextAtomic(path, rows.map((row) => JSON.stringify(sortDeep(row))).join('\n') + (rows.length ? '\n' : ''))
}

function writeShards(skills) {
  const dir = join(CATALOG, 'indexes', 'shards')
  ensureDir(dir)
  const shardSize = 1000
  if (skills.length === 0) {
    writeTextAtomic(join(dir, 'skills-00000.jsonl'), '')
    return
  }
  for (let i = 0; i < skills.length; i += shardSize) {
    const shard = skills.slice(i, i + shardSize)
    writeJsonl(join(dir, `skills-${String(i / shardSize).padStart(5, '0')}.jsonl`), shard)
  }
}

export function promotePassingCandidates() {
  const changed = []
  for (const { path, record } of loadPackRecords('candidates')) {
    if (record.evaluation?.status === 'passed' && record.evaluation?.score >= 0.78) {
      const published = { ...record, status: 'published', updated_at: nowIso() }
      const target = packRecordPath(record.pack_id, 'published')
      writeYaml(target, published)
      const evalSource = evaluationPathForPack(record.pack_id, 'candidate')
      const evalTarget = evaluationPathForPack(record.pack_id, 'published')
      if (existsSync(evalSource)) writeTextAtomic(evalTarget, readText(evalSource))
      const evidenceSource = evidencePathForPack(record.pack_id, 'candidate')
      const evidenceTarget = evidencePathForPack(record.pack_id, 'published')
      if (existsSync(evidenceSource)) writeTextAtomic(evidenceTarget, readText(evidenceSource))
      changed.push(relative(ROOT, target))
    }
  }
  return changed
}

export function detectImpact() {
  const skills = new Map(loadSkillRecords().map(({ record }) => [record.canonical_skill_id, record.identity?.current_version_id]))
  const changed = []
  for (const { path, record } of loadPackRecords('published')) {
    let stale = record.status === 'stale'
    for (const member of record.members ?? []) {
      const current = skills.get(member.skill_id)
      if (current && current !== member.version_id) stale = true
    }
    if (stale && record.status !== 'stale') {
      const next = { ...record, status: 'stale', updated_at: nowIso() }
      writeYaml(path, next)
      changed.push(relative(ROOT, path))
    }
  }
  return changed
}
