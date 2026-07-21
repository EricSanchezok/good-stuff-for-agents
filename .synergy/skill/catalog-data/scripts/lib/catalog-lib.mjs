import { createHash, randomUUID } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

export const ROOT = findRepoRoot()
export const CATALOG = join(ROOT, 'catalog')

export const STATUS = {
  skill: new Set(['candidate', 'active', 'preview', 'deprecated', 'removed', 'broken', 'blocked']),
  pack: new Set(['candidate', 'rejected', 'published', 'stale', 'superseded', 'archived']),
  source: new Set(['candidate', 'active', 'preview', 'deprecated', 'removed', 'broken', 'blocked']),
}

export const RELATION_PREDICATES = new Set([
  'chains_with',
  'strengthens',
  'alternatives',
  'conflicts_with',
])

function findRepoRoot() {
  let current = dirname(fileURLToPath(import.meta.url))
  while (current !== dirname(current)) {
    if (isCatalogRoot(current)) return current
    current = dirname(current)
  }
  if (isCatalogRoot(process.cwd())) return process.cwd()
  throw new Error('Unable to locate Skill Intelligence Catalog root')
}

function isCatalogRoot(path) {
  return existsSync(join(path, 'AGENTS.md')) && existsSync(join(path, 'catalog')) && existsSync(join(path, '.synergy', 'skill'))
}

export const CATALOG_ID_MAX_BYTES = 200

export function resolveWithin(base, ...parts) {
  const basePath = resolve(base)
  for (const part of parts) {
    if (typeof part !== 'string' || part.length === 0) throw new Error('Path parts must be non-empty strings')
    if (isAbsolute(part) || win32.isAbsolute(part)) throw new Error(`Absolute path is not allowed: ${part}`)
    if (part.split(/[\\/]/).includes('..')) throw new Error(`Parent path segment is not allowed: ${part}`)
  }
  const target = resolve(basePath, ...parts)
  assertContained(basePath, target, parts.join('/'))
  assertSafePathChain(basePath, target, { allowMissing: true })
  return target
}

function assertContained(base, target, label = target) {
  const rel = relative(base, target)
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Path escapes base directory: ${label}`)
  }
}

function tryLstat(path) {
  try {
    return lstatSync(path)
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode
}

function inspectExistingPath(rootReal, path) {
  const first = lstatSync(path)
  if (first.isSymbolicLink()) throw new Error(`Symbolic link is not allowed: ${path}`)
  const real = realpathSync(path)
  const second = lstatSync(path)
  if (second.isSymbolicLink() || !sameIdentity(first, second)) throw new Error(`Path changed during safety check: ${path}`)
  assertContained(rootReal, real, path)
  return { real, stat: second }
}

function safeRoot(base) {
  const root = resolve(base)
  const rootStat = lstatSync(root)
  if (rootStat.isSymbolicLink()) throw new Error(`Symbolic link root is not allowed: ${root}`)
  if (!rootStat.isDirectory()) throw new Error(`Safety root is not a directory: ${root}`)
  const rootReal = realpathSync(root)
  const checked = lstatSync(root)
  if (checked.isSymbolicLink() || !sameIdentity(rootStat, checked)) throw new Error(`Safety root changed during check: ${root}`)
  return { root, rootReal }
}

function pathSegments(root, target) {
  const rel = relative(root, target)
  return rel ? rel.split(sep) : []
}

function assertSafePathChain(base, target, { allowMissing = false, targetType = null } = {}) {
  const { root, rootReal } = safeRoot(base)
  const absoluteTarget = resolve(target)
  assertContained(root, absoluteTarget, target)
  let current = root
  for (const segment of pathSegments(root, absoluteTarget)) {
    current = join(current, segment)
    const stat = tryLstat(current)
    if (!stat) {
      if (allowMissing) return { root, rootReal, target: absoluteTarget, missing: current }
      throw new Error(`Path does not exist: ${current}`)
    }
    const inspected = inspectExistingPath(rootReal, current)
    if (current !== absoluteTarget && !inspected.stat.isDirectory()) throw new Error(`Path ancestor is not a directory: ${current}`)
    if (current === absoluteTarget && targetType === 'file' && !inspected.stat.isFile()) throw new Error(`Path is not a regular file: ${current}`)
    if (current === absoluteTarget && targetType === 'directory' && !inspected.stat.isDirectory()) throw new Error(`Path is not a directory: ${current}`)
  }
  return { root, rootReal, target: absoluteTarget, missing: null }
}

function ensureSafeDirectory(base, directory) {
  const { root, rootReal } = safeRoot(base)
  const target = resolve(directory)
  assertContained(root, target, directory)
  let current = root
  for (const segment of pathSegments(root, target)) {
    current = join(current, segment)
    if (!tryLstat(current)) {
      try {
        mkdirSync(current)
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error
      }
    }
    const inspected = inspectExistingPath(rootReal, current)
    if (!inspected.stat.isDirectory()) throw new Error(`Path component is not a directory: ${current}`)
  }
  return target
}

export function assertSafeContainedPathForWrite(base, target) {
  const absoluteTarget = resolve(target)
  ensureSafeDirectory(base, dirname(absoluteTarget))
  return assertSafePathChain(base, absoluteTarget, { allowMissing: true }).target
}

export function assertSafeContainedPathForDelete(base, target, { type = null } = {}) {
  return assertSafePathChain(base, target, { targetType: type }).target
}

export function removeSafeContainedPath(base, target, options = {}) {
  const { type = null, ...removeOptions } = options
  const expectedType = removeOptions.recursive ? 'directory' : type
  const checked = assertSafeContainedPathForDelete(base, target, { type: expectedType })
  assertSafeContainedPathForDelete(base, checked, { type: expectedType })
  rmSync(checked, removeOptions)
}

export function assertCatalogId(kind, value) {
  const prefixes = {
    source: 'src_',
    skill: 'skl_',
    pack: 'pack_',
    evaluation: 'eval_',
    run: 'run_',
    candidate: 'cand_',
  }
  const prefix = prefixes[kind]
  if (!prefix) throw new Error(`Unknown catalog ID kind: ${kind}`)
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${kind} ID must be a non-empty string`)
  if (Buffer.byteLength(value, 'utf8') > CATALOG_ID_MAX_BYTES) throw new Error(`${kind} ID exceeds ${CATALOG_ID_MAX_BYTES} UTF-8 bytes`)
  if (value.includes('/') || value.includes('\\') || value.includes('..') || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`Invalid ${kind} ID: ${JSON.stringify(value)}`)
  }
  if (!value.startsWith(prefix) || !/^[a-z0-9_-]+$/.test(value) || value.length === prefix.length) {
    throw new Error(`Invalid ${kind} ID: ${JSON.stringify(value)}`)
  }
  return value
}

export function ensureDir(path, base = ROOT) {
  return ensureSafeDirectory(base, path)
}

export function listFiles(dir, predicate = () => true) {
  const root = resolve(dir)
  const rootStat = tryLstat(root)
  if (!rootStat) return []
  const { rootReal } = safeRoot(root)
  const out = []
  const visitedRealpaths = new Set()
  const visitedInodes = new Set()

  function walk(current) {
    const inspectedDirectory = inspectExistingPath(rootReal, current)
    if (!inspectedDirectory.stat.isDirectory()) throw new Error(`Walker root is not a directory: ${current}`)
    const inodeKey = `${inspectedDirectory.stat.dev}:${inspectedDirectory.stat.ino}`
    if (visitedRealpaths.has(inspectedDirectory.real) || visitedInodes.has(inodeKey)) throw new Error(`Filesystem cycle detected: ${current}`)
    visitedRealpaths.add(inspectedDirectory.real)
    visitedInodes.add(inodeKey)

    for (const entry of readdirSync(current)) {
      const path = join(current, entry)
      const stat = lstatSync(path)
      if (stat.isSymbolicLink()) throw new Error(`Symbolic link is not allowed: ${path}`)
      const inspected = inspectExistingPath(rootReal, path)
      if (inspected.stat.isDirectory()) walk(path)
      else if (inspected.stat.isFile() && predicate(path)) out.push(path)
    }
  }

  walk(root)
  return out.sort()
}

export function readText(path) {
  return readFileSync(path, 'utf8')
}

export function writeTextAtomic(path, content, base = ROOT) {
  const target = assertSafeContainedPathForWrite(base, path)
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}-${randomUUID()}`
  assertSafeContainedPathForWrite(base, tmp)
  try {
    writeFileSync(tmp, content, { flag: 'wx' })
    assertSafeContainedPathForWrite(base, target)
    assertSafePathChain(base, tmp, { targetType: 'file' })
    renameSync(tmp, target)
  } catch (error) {
    try {
      if (tryLstat(tmp)) removeSafeContainedPath(base, tmp, { force: true, type: 'file' })
    } catch {}
    throw error
  }
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

export function writeYaml(path, value, base = ROOT) {
  writeTextAtomic(path, toYaml(value), base)
}

export function readDraft(argv) {
  const source = argv[0]
  const text = source ? readText(resolveWithin(ROOT, source)) : readFileSync(0, 'utf8')
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
  const hash = createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 8)
  const joined = parts.filter(Boolean).join('-')
  // Keep base slug under 100 chars so full path stays under 255 bytes.
  // Full identity is recoverable from the hash; the slug is for readability only.
  const safe = joined.length > 100 ? joined.slice(0, 50) + '--' + hash + '--' + joined.slice(-40) : joined
  const base = slug(safe)
  return `${prefix}_${base}_${hash}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function sourceRecordPath(sourceId) {
  if (sourceId !== undefined) assertCatalogId('source', sourceId)
  return resolveWithin(CATALOG, 'sources', 'registry.yaml')
}

export function skillRecordPath(skillId) {
  assertCatalogId('skill', skillId)
  return resolveWithin(CATALOG, 'skills', 'records', prefixFor(skillId), `${skillId}.yaml`)
}

export function analysisPath(skillId) {
  assertCatalogId('skill', skillId)
  return resolveWithin(CATALOG, 'analyses', prefixFor(skillId), `${skillId}.md`)
}

export function packRecordPath(packId, status = 'candidate') {
  assertCatalogId('pack', packId)
  const bucket = status === 'published' ? 'published' : 'candidates'
  return resolveWithin(CATALOG, 'packs', bucket, packId, 'pack.yaml')
}

export function evaluationPathForPack(packId, status = 'candidate') {
  assertCatalogId('pack', packId)
  const bucket = status === 'published' ? 'published' : 'candidates'
  return resolveWithin(CATALOG, 'packs', bucket, packId, 'evaluation.json')
}

export function packContentHash(record) {
  const { evaluation, updated_at: updatedAt, ...content } = record
  return sha256(stableStringify(content))
}

export function createEvaluationBinding(packId) {
  assertCatalogId('pack', packId)
  const packPath = packRecordPath(packId, 'candidate')
  if (!existsSync(packPath)) throw new Error(`Candidate pack does not exist: ${packId}`)
  const pack = parseYamlFile(packPath)
  if (pack.pack_id !== packId || pack.status !== 'candidate') {
    throw new Error(`Pack ${packId} is not a current candidate`)
  }
  const packHash = packContentHash(pack)
  return {
    schema_version: 1,
    kind: 'pack_evaluation_binding',
    pack_id: packId,
    pack_status: 'candidate',
    pack_version: pack.version,
    pack_hash: packHash,
    evaluation_id: idFor('eval', [packId, 'candidate', packHash]),
    expected_path: relative(ROOT, evaluationPathForPack(packId, 'candidate')),
  }
}

export function assertCurrentEvaluationBinding(binding) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) throw new Error('Evaluation binding must be an object')
  assertCatalogId('pack', binding.pack_id)
  assertCatalogId('evaluation', binding.evaluation_id)
  if (binding.schema_version !== 1 || binding.kind !== 'pack_evaluation_binding') throw new Error('Unsupported evaluation binding')
  if (binding.pack_status !== 'candidate') throw new Error('Only candidate pack evaluation bindings are supported')
  const expected = createEvaluationBinding(binding.pack_id)
  for (const field of ['pack_status', 'pack_version', 'pack_hash', 'evaluation_id', 'expected_path']) {
    if (binding[field] !== expected[field]) throw new Error(`Evaluation binding ${field} is stale or mismatched`)
  }
  return {
    binding: expected,
    packPath: packRecordPath(binding.pack_id, 'candidate'),
    evaluationPath: evaluationPathForPack(binding.pack_id, 'candidate'),
  }
}

export function evidencePathForPack(packId, status = 'candidate') {
  assertCatalogId('pack', packId)
  const bucket = status === 'published' ? 'published' : 'candidates'
  return resolveWithin(CATALOG, 'packs', bucket, packId, 'evidence.md')
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

  const skillRecords = loadSkillRecords()
  const skills = new Map(skillRecords.map(({ record }) => [record.canonical_skill_id, record]))
  for (const { path, record } of skillRecords) validateSkill(record, errors, relative(ROOT, path))
  for (const { path, record } of loadPackRecords()) {
    const label = relative(ROOT, path)
    validatePack(record, errors, label)
    if (record.status === 'published') validatePublishedPack(record, errors, label, skills)
  }

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
  if (label.includes('published') && (pack.status === 'candidate' || pack.status === 'rejected')) errors.push(`${label}: published pack must not have status ${pack.status}`)
  if (label.includes('candidates') && (pack.status === 'published' || pack.status === 'stale')) errors.push(`${label}: candidate pack must not have status ${pack.status}`)
}

function validatePublishedPack(pack, errors, label, skills) {
  const evaluationPath = evaluationPathForPack(pack.pack_id, 'published')
  let evaluation = null
  if (existsSync(evaluationPath)) {
    try {
      evaluation = JSON.parse(readText(evaluationPath))
      if (!evaluation || typeof evaluation !== 'object' || Array.isArray(evaluation)) evaluation = null
    } catch (error) {
      errors.push(`${label}: published evaluation is invalid JSON: ${error.message}`)
    }
  }
  for (const reason of packPromotionIneligibilityReasons(pack, evaluation, skills, { requireFileEvaluation: true })) {
    errors.push(`${label}: published pack invariant failed: ${reason}`)
  }
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

function hasOnlyPassingSignals(evaluation, requireSignal = false) {
  const signals = []
  if (Object.hasOwn(evaluation, 'status')) signals.push(evaluation.status === 'passed')
  if (Object.hasOwn(evaluation, 'passed')) signals.push(evaluation.passed === true)
  return (!requireSignal || signals.length > 0) && signals.every(Boolean)
}

export function packPromotionIneligibilityReasons(record, fileEvaluation, skills, { requireFileEvaluation = false } = {}) {
  const reasons = []
  const inlineEvaluation = record.evaluation ?? {}
  const primaryEvaluation = fileEvaluation ?? inlineEvaluation
  if (requireFileEvaluation && !fileEvaluation) reasons.push('passing evaluation file is required')
  if (fileEvaluation) {
    if (fileEvaluation.status !== 'passed' || fileEvaluation.passed !== true) reasons.push('evaluation status and passed signals must consistently pass')
    if (requireFileEvaluation && fileEvaluation.output_id !== record.pack_id) reasons.push('evaluation must be bound to the same pack')
    if (requireFileEvaluation && (!fileEvaluation.evaluation_id || inlineEvaluation.evaluation_id !== fileEvaluation.evaluation_id)) reasons.push('inline and file evaluation IDs must match')
  } else if (!hasOnlyPassingSignals(primaryEvaluation, true)) {
    reasons.push('evaluation status and passed signals must consistently pass')
  }
  if (fileEvaluation && !hasOnlyPassingSignals(inlineEvaluation)) reasons.push('inline evaluation contradicts the evaluation file')

  const score = primaryEvaluation.overall_score ?? primaryEvaluation.score
  if (!Number.isFinite(score) || score < 0.78) reasons.push('evaluation score must be at least 0.78')

  const members = record.members ?? []
  if (members.length < 2) reasons.push('at least two members are required')
  for (const member of members) {
    const skill = skills.get(member.skill_id)
    if (!skill) {
      reasons.push(`member ${member.skill_id} does not exist`)
      continue
    }
    if (!['active', 'preview'].includes(skill.status)) reasons.push(`member ${member.skill_id} status ${skill.status} is not eligible`)
    if (skill.identity?.current_version_id !== member.version_id) reasons.push(`member ${member.skill_id} does not pin its current version`)
  }
  return reasons
}

export function isPackPromotionEligible(record, fileEvaluation, skills, options = {}) {
  return packPromotionIneligibilityReasons(record, fileEvaluation, skills, options).length === 0
}

export function promotePassingCandidates(cleanup = false, selectedPackIds = null) {
  const changed = []
  const skills = new Map(loadSkillRecords().map(({ record }) => [record.canonical_skill_id, record]))
  for (const { path, record } of loadPackRecords('candidates')) {
    if (selectedPackIds && !selectedPackIds.has(record.pack_id)) continue
    const evalPath = evaluationPathForPack(record.pack_id, 'candidate')
    let fileEvaluation = null
    if (existsSync(evalPath)) {
      try {
        fileEvaluation = JSON.parse(readText(evalPath))
        if (!fileEvaluation || typeof fileEvaluation !== 'object' || Array.isArray(fileEvaluation)) continue
      } catch { continue }
    }
    if (!isPackPromotionEligible(record, fileEvaluation, skills, { requireFileEvaluation: true })) continue

    if (!record.evaluation?.status || record.evaluation.status !== 'passed') {
      record.evaluation = { ...(record.evaluation ?? {}), status: 'passed' }
      writeYaml(path, record)
    }

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

    if (cleanup) {
      removeSafeContainedPath(CATALOG, path, { force: true, type: 'file' })
      if (existsSync(evalSource)) removeSafeContainedPath(CATALOG, evalSource, { force: true, type: 'file' })
      if (existsSync(evidenceSource)) removeSafeContainedPath(CATALOG, evidenceSource, { force: true, type: 'file' })
      const candidateDir = dirname(path)
      if (existsSync(candidateDir) && readdirSync(candidateDir).length === 0) removeSafeContainedPath(CATALOG, candidateDir, { force: true, type: 'directory' })
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
