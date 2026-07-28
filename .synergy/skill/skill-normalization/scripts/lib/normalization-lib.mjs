import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, lstatSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, relative } from 'node:path'
import {
  assertCatalogId,
  assertSafeContainedPathForDelete,
  ensureDir,
  idFor,
  listFiles,
  loadRegistry as loadCatalogRegistry,
  loadSkillRecords as loadCatalogSkillRecords,
  nowIso,
  prefixFor,
  readJsonl,
  resolveWithin,
  ROOT,
  sha256,
  stableStringify,
  writeTextAtomic,
} from '../../../catalog-data/scripts/lib/catalog-lib.mjs'

const CATALOG = join(ROOT, 'catalog')
const SNAPSHOTS_DIR = join(CATALOG, 'sources', 'snapshots')
const WRITE_SKILL_RECORD = join(
  ROOT,
  '.synergy', 'skill', 'catalog-data', 'scripts', 'write-skill-record.mjs',
)

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const WORKLOAD_SCHEMA = 2
const DECISIONS_SCHEMA = 1

const VALID_DECISIONS = new Set([
  'new',
  'update',
  'duplicate_needs_curation',
  'rejected',
  'blocked',
])

const WRITABLE_DECISIONS = new Set(['new', 'update'])

// ── Decision-level allowed top-level keys ────────────────────────────────────
const DECISION_TOP_KEYS = new Set([
  'item_digest',
  'decision',
  'canonical_name',   // only for 'new'
  'reason',
  'draft_fields',
])

// ── Top-level decisions document allowed keys ────────────────────────────────
const DECISIONS_DOC_TOP_KEYS = new Set([
  'schema_version',
  'run_id',
  'workload_digest',
  'decisions',
])

// ── Fields allowed in agent-supplied draft_fields ─────────────────────────────
const ALLOWED_DRAFT_FIELDS = new Set(['display_name'])

// ── Fields that must never appear in draft_fields ─────────────────────────────
const CONTROLLED_FIELDS = new Set([
  'canonical_skill_id',
  'canonical_name',
  'identity',
  'source',
  'created_at',
  'updated_at',
  'schema_version',
  'status',
  'analysis',
  'curation',
  'relations',
  'quality',
  'capabilities',
  'interfaces',
  'tools',
  'risk',
])

// ── Size limits ──────────────────────────────────────────────────────────────
const MAX_REASON_BYTES = 2000
const MAX_DISPLAY_NAME_BYTES = 200
const MAX_CANONICAL_NAME_BYTES = 200
const MAX_DECISION_KEYS = 20

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function assertSha256Digest(value, label) {
  if (typeof value !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label}: expected sha256: hex digest, got ${JSON.stringify(value)}`)
  }
}

function assertNonEmptyString(value, label, maxBytes = Infinity) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label}: must be a non-empty string`)
  }
  if (Buffer.byteLength(value, 'utf8') > maxBytes) {
    throw new Error(`${label}: exceeds ${maxBytes} byte limit (got ${Buffer.byteLength(value, 'utf8')})`)
  }
}

function assertPlainObject(value, label) {
  if (value !== null && (typeof value !== 'object' || Array.isArray(value))) {
    throw new Error(`${label}: must be a plain object`)
  }
}

function assertStringOrNull(value, label) {
  if (value !== null && typeof value !== 'string') {
    throw new Error(`${label}: must be a string or null`)
  }
}

function fileDigest(path) {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`)
  return sha256(readFileSync(path, 'utf8'))
}

function recordsDigest(records) {
  const h = createHash('sha256')
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id))
  for (const { id, content } of sorted) {
    h.update(id)
    h.update('\0')
    h.update(content)
    h.update('\0')
  }
  return `sha256:${h.digest('hex')}`
}

// Load the canonical list of existing skill records (for binding).
function loadExistingRecordsDigest(recordsDir) {
  const dir = recordsDir || join(CATALOG, 'skills', 'records')
  if (!existsSync(dir)) return sha256('')
  const entries = []
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry)
      if (lstatSync(p).isDirectory()) { walk(p) }
      else if (entry.endsWith('.yaml')) {
        const content = readFileSync(p, 'utf8')
        const rel = relative(dir, p)
        entries.push({ id: rel, content })
      }
    }
  }
  walk(dir)
  entries.sort((a, b) => a.id.localeCompare(b.id))
  return recordsDigest(entries)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Snapshot manifest resolution
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load all snapshot manifest files and index them by (source_id, path).
 * Returns a Map of "source_id::path" → manifest record.
 */
function loadSnapshotIndex(snapshotDir) {
  const index = new Map()
  const dir = snapshotDir || SNAPSHOTS_DIR
  if (!existsSync(dir)) return index

  const paths = listFiles(dir, (p) => p.endsWith('.json'))
  for (const path of paths) {
    let manifest
    try {
      const safePath = assertSafeContainedPathForDelete(dir, path, { type: 'file' })
      manifest = JSON.parse(readFileSync(safePath, 'utf8'))
    } catch {
      continue
    }
    if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.artifacts)) continue

    for (const artifact of manifest.artifacts) {
      if (!artifact.source_id || !artifact.path) continue
      const key = `${artifact.source_id}::${artifact.path}`
      // Keep the latest (highest checked_at) manifest for each key
      const existing = index.get(key)
      if (!existing || String(manifest.checked_at) > String(existing.manifest.checked_at)) {
        index.set(key, { manifest, artifact })
      }
    }
  }
  return index
}

/**
 * Compute a digest over the snapshot manifests used for binding.
 */
function computeSnapshotManifestsDigest(snapshotIndex) {
  const h = createHash('sha256')
  const keys = [...snapshotIndex.keys()].sort()
  for (const key of keys) {
    h.update(key)
    h.update('\0')
    h.update(stableStringify(snapshotIndex.get(key).manifest))
    h.update('\0')
  }
  return `sha256:${h.digest('hex')}`
}

/**
 * Resolve a candidate's provenance against snapshot manifests.
 * Returns { resolved: true, manifest, artifact } for exact match,
 * or { resolved: false, reason } for blocked.
 *
 * The candidate's provenance artifact_binding must match exactly one snapshot
 * artifact on: source_id, remote_path, pinned_commit, git_blob_oid, and content_digest.
 * Registry current ref alone is insufficient.
 */
function resolveCandidateSnapshot(candidate, snapshotIndex) {
  const provenance = candidate.provenance
  if (!provenance || !provenance.artifact_binding) {
    return { resolved: false, reason: 'candidate missing provenance artifact_binding' }
  }

  const b = provenance.artifact_binding
  if (!b.source_id || !b.remote_path) {
    return { resolved: false, reason: 'provenance artifact_binding missing source_id or remote_path' }
  }

  const key = `${b.source_id}::${b.remote_path}`
  const entry = snapshotIndex.get(key)
  if (!entry) {
    return { resolved: false, reason: `no snapshot manifest found for ${key}` }
  }

  const { manifest, artifact } = entry

  // Must match on pinned_commit
  if (b.pinned_commit) {
    if (artifact.upstream_ref !== b.pinned_commit && manifest.upstream_ref !== b.pinned_commit) {
      return { resolved: false, reason: `pinned_commit mismatch: candidate=${b.pinned_commit}, snapshot=${artifact.upstream_ref ?? manifest.upstream_ref}` }
    }
  }

  // Must match on git_blob_oid or content_digest
  const snapshotOid = artifact.git_blob_oid ?? artifact.content_digest
  const candidateOid = b.git_blob_oid ?? candidate.content_digest
  if (snapshotOid && candidateOid && snapshotOid !== candidateOid) {
    return { resolved: false, reason: `blob OID mismatch: candidate=${candidateOid}, snapshot=${snapshotOid}` }
  }

  // Also verify the candidate's content_digest matches the snapshot's
  if (candidate.content_digest && artifact.content_digest && candidate.content_digest !== artifact.content_digest) {
    return { resolved: false, reason: `content_digest mismatch: candidate=${candidate.content_digest}, snapshot=${artifact.content_digest}` }
  }

  return { resolved: true, manifest, artifact }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Identity
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute a deterministic target skill ID from reviewed canonical_name + source + path.
 * This is the ONLY function that computes canonical skill IDs for new records.
 */
export function computeTargetSkillId(canonicalName, sourceId, path) {
  assertNonEmptyString(canonicalName, 'canonical_name', MAX_CANONICAL_NAME_BYTES)
  assertNonEmptyString(sourceId, 'source_id')
  assertNonEmptyString(path, 'path')
  const skillId = idFor('skl', [canonicalName, sourceId, path])
  return assertCatalogId('skill', skillId)
}

/**
 * Build an identity HINT (not a decision) for a candidate.
 * The canonical_skill_id here is a hint derived from declared_name;
 * the semantic agent may supply a different canonical_name for 'new' decisions.
 */
export function buildWorkloadIdentityHint(candidate) {
  const canonicalName = candidate.declared_name
  const skillId = idFor('skl', [canonicalName, candidate.source_id, candidate.path])
  return {
    canonical_skill_id: assertCatalogId('skill', skillId),
    canonical_name: canonicalName,
    display_name: canonicalName,
  }
}

/**
 * Find an existing skill record that might match a candidate.
 * Returns the FULL record (not a summary) for binding into workload.
 */
export function findExistingMatch(candidate, existingSkills) {
  const hint = buildWorkloadIdentityHint(candidate)
  const byId = existingSkills.get(hint.canonical_skill_id)
  if (byId) return { match_type: 'exact_id', record: byId, hint }

  for (const [, record] of existingSkills) {
    if (
      record.source?.source_id === candidate.source_id &&
      record.source?.path === candidate.path
    ) {
      return { match_type: 'source_path', record, hint }
    }
  }

  return { match_type: 'none', record: null, hint }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Candidate & source validation
// ═══════════════════════════════════════════════════════════════════════════════

export function validateCandidateProvenance(candidate) {
  const reasons = []
  if (!candidate.source_id) reasons.push('missing source_id')
  if (!candidate.path) reasons.push('missing path')
  if (!candidate.content_digest) reasons.push('missing content_digest')
  if (!candidate.declared_name) reasons.push('missing declared_name')
  if (!candidate.candidate_id) reasons.push('missing candidate_id')
  return reasons
}

export function buildSourceSummary(candidate, registry) {
  const src = registry.sources.find(s => s.source_id === candidate.source_id) ?? null
  if (!src) return null
  if (!['active', 'preview'].includes(src.status)) return null
  return {
    source_id: src.source_id,
    name: src.name,
    url: src.url ?? null,
    type: src.type,
    status: src.status,
    license: src.license ?? null,
    last_ref: src.state?.last_ref ?? null,
    last_checked_at: src.state?.last_checked_at ?? null,
  }
}

/**
 * Check that a source exists, is approved, and matches the candidate.
 */
export function validateSourceApproval(sourceSummary) {
  if (!sourceSummary) return ['source not found in registry or not active/preview']
  return []
}

// ═══════════════════════════════════════════════════════════════════════════════
// Digest computation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute input binding digests: candidate JSONL, source registry, existing records, snapshot manifests.
 * @param {Map} [snapshotIndex] - snapshot index for snapshot_manifests_digest
 */
export function computeInputBindings(candidateJsonlPath, registryPath, recordsDir, snapshotIndex) {
  return {
    candidate_jsonl_digest: fileDigest(candidateJsonlPath),
    source_registry_digest: fileDigest(registryPath),
    existing_records_digest: loadExistingRecordsDigest(recordsDir),
    snapshot_manifests_digest: computeSnapshotManifestsDigest(snapshotIndex ?? new Map()),
  }
}

/**
 * Compute the full workload digest binding all inputs.
 */
export function computeWorkloadDigest(items, provenanceBlocked, inputBindings) {
  const payload = [
    stableStringify(inputBindings),
    stableStringify(provenanceBlocked),
    ...items.map(item =>
      stableStringify({
        candidate_id: item.candidate.candidate_id,
        content_digest: item.candidate.content_digest,
        source_id: item.candidate.source_id,
        path: item.candidate.path,
        declared_name: item.candidate.declared_name,
        hint_skill_id: item.identity_hint.canonical_skill_id,
        existing_match_type: item.existing_match?.record?.canonical_skill_id ? 'matched' : 'none',
        existing_skill_id: item.existing_match?.record?.canonical_skill_id ?? null,
        source_status: item.source?.status ?? 'unapproved',
      }),
    ),
  ].join('\0')
  return sha256(payload)
}

/**
 * Compute a per-item digest.
 */
export function computeItemDigest(item) {
  return sha256(stableStringify({
    candidate_id: item.candidate.candidate_id,
    content_digest: item.candidate.content_digest,
    source_id: item.candidate.source_id,
    path: item.candidate.path,
    declared_name: item.candidate.declared_name,
    hint_skill_id: item.identity_hint.canonical_skill_id,
    existing_match_type: item.existing_match?.match_type ?? 'none',
    existing_skill_id: item.existing_match?.record?.canonical_skill_id ?? null,
  }))
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 1: Prepare workload
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prepare a normalization workload.
 *
 * @param {string} runId
 * @param {object} [opts]
 * @param {string} [opts.candidatesPath] - path to candidate JSONL (default: catalog/skills/candidates/<runId>.jsonl)
 * @param {string} [opts.registryPath] - path to source registry (default: catalog/sources/registry.yaml)
 * @param {string} [opts.recordsDir] - path to skill records dir (default: catalog/skills/records/)
 * @param {string} [opts.snapshotDir] - path to snapshot manifests dir (default: catalog/sources/snapshots/)
 * @param {string} [opts.outputDir] - output directory for workload (default: reports/skill-normalization/<runId>/)
 * @param {Function} [opts.loadRegistryFn] - injected registry loader
 * @param {Function} [opts.loadSkillRecordsFn] - injected skill records loader
 */
export function prepareWorkload(runId, opts = {}) {
  const {
    candidatesPath = resolveWithin(CATALOG, 'skills', 'candidates', `${runId}.jsonl`),
    registryPath = join(CATALOG, 'sources', 'registry.yaml'),
    recordsDir = join(CATALOG, 'skills', 'records'),
    snapshotDir = SNAPSHOTS_DIR,
    outputDir = resolveWithin(ROOT, 'reports', 'skill-normalization', runId),
    loadRegistryFn = loadCatalogRegistry,
    loadSkillRecordsFn = loadCatalogSkillRecords,
  } = opts

  if (!existsSync(candidatesPath)) throw new Error(`Candidate file not found: ${candidatesPath}`)
  const candidates = readJsonl(candidatesPath)
  if (candidates.length === 0) throw new Error(`Candidate file is empty: ${candidatesPath}`)

  // Detect duplicate candidate IDs or same source+path within batch
  const seenCandidateIds = new Set()
  const seenSourcePaths = new Set()
  for (const c of candidates) {
    if (c.candidate_id) {
      if (seenCandidateIds.has(c.candidate_id)) {
        throw new Error(`Duplicate candidate_id in batch: ${c.candidate_id}`)
      }
      seenCandidateIds.add(c.candidate_id)
    }
    if (c.source_id && c.path) {
      const sp = `${c.source_id}::${c.path}`
      if (seenSourcePaths.has(sp)) {
        throw new Error(`Duplicate source+path in batch: ${sp}`)
      }
      seenSourcePaths.add(sp)
    }
  }

  const registry = loadRegistryFn()
  const existingSkills = new Map(
    loadSkillRecordsFn().map(({ record }) => [record.canonical_skill_id, record]),
  )

  // Load snapshot manifests for provenance resolution
  const snapshotIndex = loadSnapshotIndex(snapshotDir)

  const inputBindings = computeInputBindings(candidatesPath, registryPath, recordsDir, snapshotIndex)
  const now = nowIso()

  const items = []
  const provenanceBlocked = []

  for (const candidate of candidates) {
    const blockedReasons = validateCandidateProvenance(candidate)
    if (blockedReasons.length > 0) {
      provenanceBlocked.push({
        candidate_id: candidate.candidate_id ?? 'unknown',
        declared_name: candidate.declared_name ?? null,
        source_id: candidate.source_id ?? null,
        path: candidate.path ?? null,
        content_digest: candidate.content_digest ?? null,
        reasons: blockedReasons,
        terminal: 'provenance_blocked',
      })
      continue
    }

    // Resolve candidate provenance against snapshot manifests
    const snapshotRes = resolveCandidateSnapshot(candidate, snapshotIndex)
    if (!snapshotRes.resolved) {
      provenanceBlocked.push({
        candidate_id: candidate.candidate_id,
        declared_name: candidate.declared_name,
        source_id: candidate.source_id,
        path: candidate.path,
        content_digest: candidate.content_digest,
        reasons: [`snapshot provenance not resolved: ${snapshotRes.reason}`],
        terminal: 'provenance_blocked',
      })
      continue
    }

    const sourceSummary = buildSourceSummary(candidate, registry)
    const existing = findExistingMatch(candidate, existingSkills)
    const hint = existing.hint

    const item = {
      candidate: sortCandidateForWorkload(candidate),
      identity_hint: hint,
      source: sourceSummary,
      existing_match: existing.match_type !== 'none'
        ? { match_type: existing.match_type, record: existing.record }
        : null,
      snapshot: {
        manifest_path: relative(ROOT, resolveWithin(SNAPSHOTS_DIR, `${snapshotRes.manifest.source_id}_${snapshotRes.manifest.checked_at?.replace(/[:.]/g, '-') ?? 'unknown'}.json`)),
        source_id: snapshotRes.manifest.source_id,
        upstream_ref: snapshotRes.manifest.upstream_ref,
        artifact_binding: candidate.provenance?.artifact_binding ?? null,
      },
    }
    item.item_digest = computeItemDigest(item)

    if (items.some(it => it.item_digest === item.item_digest)) {
      throw new Error(`Duplicate item digest (hash collision?): ${item.item_digest}`)
    }
    items.push(item)
  }

  const workloadDigest = computeWorkloadDigest(items, provenanceBlocked, inputBindings)

  const workload = {
    schema_version: WORKLOAD_SCHEMA,
    run_id: runId,
    workload_digest: workloadDigest,
    created_at: now,
    input_bindings: inputBindings,
    candidate_count: candidates.length,
    provenance_blocked_count: provenanceBlocked.length,
    item_count: items.length,
    provenance_blocked: provenanceBlocked,
    items,
  }

  ensureDir(outputDir)
  const workloadPath = resolveWithin(outputDir, 'workload.json')
  writeTextAtomic(workloadPath, stableStringify(workload), ROOT)

  return { workloadPath, workload }
}

function sortCandidateForWorkload(candidate) {
  return {
    candidate_id: candidate.candidate_id,
    source_id: candidate.source_id,
    path: candidate.path,
    content_digest: candidate.content_digest,
    declared_name: candidate.declared_name,
    format: candidate.format ?? null,
    parse_confidence: candidate.parse_confidence ?? null,
    extracted_at: candidate.extracted_at ?? null,
    schema_version: candidate.schema_version ?? null,
    provenance: candidate.provenance ?? null,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 2 & 3: Validate + Finalize
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load workload and verify integrity (digest, input bindings).
 */
export function loadWorkload(runId, opts = {}) {
  const {
    workloadDir = resolveWithin(ROOT, 'reports', 'skill-normalization', runId),
    candidatesPath = resolveWithin(CATALOG, 'skills', 'candidates', `${runId}.jsonl`),
    registryPath = join(CATALOG, 'sources', 'registry.yaml'),
    recordsDir = join(CATALOG, 'skills', 'records'),
    snapshotDir = SNAPSHOTS_DIR,
  } = opts

  // Load current snapshot index for TOCTOU recheck
  const currentSnapshotIndex = loadSnapshotIndex(snapshotDir)

  const workloadPath = resolveWithin(workloadDir, 'workload.json')
  if (!existsSync(workloadPath)) throw new Error(`Workload not found: ${workloadPath}`)
  const raw = readFileSync(workloadPath, 'utf8')
  const workload = JSON.parse(raw)

  // Schema version check
  if (workload.schema_version !== WORKLOAD_SCHEMA) {
    throw new Error(`Workload schema_version ${workload.schema_version} != ${WORKLOAD_SCHEMA}`)
  }

  // Verify workload digest (self-consistency)
  const actualDigest = computeWorkloadDigest(workload.items, workload.provenance_blocked, workload.input_bindings)
  if (actualDigest !== workload.workload_digest) {
    throw new Error(`Workload digest mismatch: expected ${workload.workload_digest}, computed ${actualDigest}`)
  }

  // Verify input bindings against current files
  const currentBindings = computeInputBindings(candidatesPath, registryPath, recordsDir, currentSnapshotIndex)
  const bound = workload.input_bindings
  if (bound.candidate_jsonl_digest !== currentBindings.candidate_jsonl_digest) {
    throw new Error(
      `Candidate JSONL changed since workload: bound=${bound.candidate_jsonl_digest} current=${currentBindings.candidate_jsonl_digest}`,
    )
  }
  if (bound.source_registry_digest !== currentBindings.source_registry_digest) {
    throw new Error(
      `Source registry changed since workload: bound=${bound.source_registry_digest} current=${currentBindings.source_registry_digest}`,
    )
  }
  if (bound.existing_records_digest !== currentBindings.existing_records_digest) {
    throw new Error(
      `Existing records changed since workload: bound=${bound.existing_records_digest} current=${currentBindings.existing_records_digest}`,
    )
  }
  // TOCTOU: snapshot manifests must match exactly
  if (bound.snapshot_manifests_digest && bound.snapshot_manifests_digest !== currentBindings.snapshot_manifests_digest) {
    throw new Error(
      `Snapshot manifests changed since workload: bound=${bound.snapshot_manifests_digest} current=${currentBindings.snapshot_manifests_digest}`,
    )
  }

  // Build item index
  const itemIndex = new Map()
  for (const item of workload.items) {
    if (itemIndex.has(item.item_digest)) {
      throw new Error(`Duplicate item digest in workload: ${item.item_digest}`)
    }
    if (!item.candidate?.candidate_id) {
      throw new Error(`Workload item missing candidate_id: ${item.item_digest}`)
    }
    if (!item.candidate?.source_id) {
      throw new Error(`Workload item missing source_id: ${item.item_digest}`)
    }
    itemIndex.set(item.item_digest, item)
  }

  return { workload, itemIndex }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Decisions validation (strict)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a decisions document. Returns { valid, errors }.
 * Enforces strict field allowlists and size limits.
 */
export function validateDecisions(decisions, workload, itemIndex) {
  const errors = []

  // ── Top-level document shape ───────────────────────────────────────────
  if (decisions === null || typeof decisions !== 'object' || Array.isArray(decisions)) {
    return { valid: false, errors: ['Decisions document must be a plain object'] }
  }

  // Unknown top-level keys
  for (const key of Object.keys(decisions)) {
    if (!DECISIONS_DOC_TOP_KEYS.has(key)) {
      errors.push(`Unknown top-level key in decisions document: "${key}"`)
    }
  }

  if (decisions.schema_version !== DECISIONS_SCHEMA) {
    errors.push(
      `Decisions schema_version ${decisions.schema_version} != ${DECISIONS_SCHEMA}`,
    )
  }
  if (decisions.run_id !== workload.run_id) {
    errors.push(
      `Decisions run_id "${decisions.run_id}" != workload run_id "${workload.run_id}"`,
    )
  }
  assertStringOrNull(decisions.workload_digest, 'workload_digest')
  if (decisions.workload_digest !== workload.workload_digest) {
    errors.push(
      `Decisions workload_digest "${decisions.workload_digest}" does not match workload "${workload.workload_digest}"`,
    )
  }
  if (!Array.isArray(decisions.decisions)) {
    errors.push('Decisions must contain a "decisions" array')
    return { valid: false, errors }
  }

  const seenItems = new Set()
  const seenCanonicalNames = new Set()

  for (let i = 0; i < decisions.decisions.length; i++) {
    const d = decisions.decisions[i]
    const label = `decisions[${i}]`

    if (d === null || typeof d !== 'object' || Array.isArray(d)) {
      errors.push(`${label}: must be a plain object`)
      continue
    }

    // ── Unknown keys ─────────────────────────────────────────────────────
    for (const key of Object.keys(d)) {
      if (!DECISION_TOP_KEYS.has(key)) {
        errors.push(`${label}: unknown key "${key}"`)
      }
    }
    if (Object.keys(d).length > MAX_DECISION_KEYS) {
      errors.push(`${label}: too many keys (max ${MAX_DECISION_KEYS})`)
    }

    // ── Required fields ──────────────────────────────────────────────────
    if (!d.item_digest) {
      errors.push(`${label}: missing item_digest`)
      continue
    }

    assertStringOrNull(d.item_digest, `${label}.item_digest`)
    assertSha256Digest(d.item_digest, `${label}.item_digest`)

    const item = itemIndex.get(d.item_digest)
    if (!item) {
      errors.push(`${label}: unknown item_digest "${d.item_digest}"`)
      continue
    }

    if (seenItems.has(d.item_digest)) {
      errors.push(`${label}: duplicate item_digest "${d.item_digest}"`)
      continue
    }
    seenItems.add(d.item_digest)

    // ── Decision ─────────────────────────────────────────────────────────
    if (!d.decision || typeof d.decision !== 'string') {
      errors.push(`${label}: missing or invalid decision`)
      continue
    }
    if (!VALID_DECISIONS.has(d.decision)) {
      errors.push(`${label}: invalid decision "${d.decision}"`)
      continue
    }

    // ── Reason ───────────────────────────────────────────────────────────
    if (!d.reason || typeof d.reason !== 'string' || d.reason.trim().length === 0) {
      errors.push(`${label}: missing or empty reason`)
    } else if (Buffer.byteLength(d.reason, 'utf8') > MAX_REASON_BYTES) {
      errors.push(
        `${label}: reason exceeds ${MAX_REASON_BYTES} byte limit (got ${Buffer.byteLength(d.reason, 'utf8')})`,
      )
    }

    // ── canonical_name (only for 'new') ───────────────────────────────────
    if (d.decision === 'new') {
      if (!d.canonical_name || typeof d.canonical_name !== 'string' || d.canonical_name.trim().length === 0) {
        errors.push(`${label}: 'new' decision requires canonical_name`)
      } else if (Buffer.byteLength(d.canonical_name, 'utf8') > MAX_CANONICAL_NAME_BYTES) {
        errors.push(
          `${label}: canonical_name exceeds ${MAX_CANONICAL_NAME_BYTES} byte limit`,
        )
      } else if (!/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/.test(d.canonical_name)) {
        errors.push(
          `${label}: canonical_name must be lowercase alphanumeric with dots/hyphens/underscores`,
        )
      }
      // Check canonical_name uniqueness across 'new' decisions
      if (d.canonical_name && seenCanonicalNames.has(d.canonical_name)) {
        errors.push(
          `${label}: duplicate canonical_name "${d.canonical_name}" used in another 'new' decision`,
        )
      }
      if (d.canonical_name) seenCanonicalNames.add(d.canonical_name)
    } else {
      // canonical_name is NOT allowed for non-'new' decisions
      if (d.canonical_name !== undefined) {
        errors.push(`${label}: canonical_name is only allowed for 'new' decisions`)
      }
    }

    // ── update requires existing_match ───────────────────────────────────
    if (d.decision === 'update') {
      if (!item.existing_match?.record) {
        errors.push(`${label}: 'update' decision but no existing record matched`)
      }
    }

    // ── draft_fields ─────────────────────────────────────────────────────
    if (d.draft_fields !== undefined) {
      if (d.draft_fields === null || typeof d.draft_fields !== 'object' || Array.isArray(d.draft_fields)) {
        errors.push(`${label}: draft_fields must be a plain object`)
      } else {
        for (const key of Object.keys(d.draft_fields)) {
          if (CONTROLLED_FIELDS.has(key)) {
            errors.push(`${label}: draft_fields contains controlled field "${key}"`)
          }
          if (!ALLOWED_DRAFT_FIELDS.has(key)) {
            errors.push(`${label}: draft_fields contains disallowed field "${key}" (only display_name is allowed)`)
          }
        }
        if (typeof d.draft_fields.display_name === 'string') {
          if (Buffer.byteLength(d.draft_fields.display_name, 'utf8') > MAX_DISPLAY_NAME_BYTES) {
            errors.push(
              `${label}: display_name exceeds ${MAX_DISPLAY_NAME_BYTES} byte limit`,
            )
          }
        } else if (d.draft_fields.display_name !== undefined) {
          errors.push(`${label}: display_name must be a string`)
        }
      }
    }
  }

  // ── Coverage: every workload item must have a decision ──────────────────
  if (seenItems.size !== workload.item_count) {
    errors.push(
      `Decision count ${seenItems.size} does not match workload item_count ${workload.item_count}. Every workload item must have exactly one decision.`,
    )
  }

  // ── Every candidate (including provenance-blocked) must have final outcome tracked ──
  const totalCandidates = workload.item_count + workload.provenance_blocked_count
  // The outcomes will include blocked items; validateDecisions only checks workload items.
  // The finalize step also records outcomes for provenance_blocked.

  return errors.length === 0 ? { valid: true } : { valid: false, errors }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Draft building
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a new skill record draft.
 * Uses the candidate's exact pinned snapshot provenance for source.upstream_ref
 * and source URL/path. License and status still map from the approved registry.
 */
export function buildNewDraft(item, canonicalName, draftFields, targetSkillId) {
  const candidate = item.candidate
  const sourceSummary = item.source
  const provenance = candidate.provenance
  const binding = provenance?.artifact_binding ?? null

  // Pinned provenance ref takes precedence over registry last_ref
  const upstreamRef = binding?.pinned_commit ?? provenance?.upstream_ref ?? sourceSummary?.last_ref ?? null
  // Use provenance URL/raw_url, fall back to registry URL
  const sourceUrl = provenance?.raw_url ?? provenance?.url ?? sourceSummary?.url ?? binding?.raw_url ?? null
  const sourcePath = candidate.path

  return {
    canonical_skill_id: targetSkillId,
    canonical_name: canonicalName,
    display_name: draftFields?.display_name ?? canonicalName,
    status: 'active',
    identity: {
      source_skill_ids: [candidate.candidate_id],
      aliases: [],
      current_version_id: candidate.content_digest,
    },
    source: {
      source_id: candidate.source_id,
      path: sourcePath,
      url: sourceUrl,
      upstream_ref: upstreamRef,
      license: sourceSummary?.license ?? { spdx: null, verified: false },
    },
    capabilities: { domains: [], task_types: [], workflow_stages: [], atomic_capabilities: [] },
    interfaces: { inputs: [], outputs: [], handoff_outputs: [] },
    tools: { required: [], optional: [] },
    risk: { side_effect_level: 'none', risk_surfaces: [] },
    quality: { score: null, confidence: 'unknown' },
    relations: { duplicates: [], complements: [], conflicts: [] },
    analysis: {
      path: `catalog/analyses/${prefixFor(targetSkillId)}/${targetSkillId}.md`,
      hash: null,
    },
    curation: { notes: [] },
  }
}

/**
 * Build an update draft that preserves EVERY non-version field from the existing record.
 * Uses the candidate's exact pinned snapshot provenance for source.upstream_ref
 * and source URL/path. License still maps from the approved registry.
 */
export function buildUpdateDraft(item, existingRecord, draftFields) {
  const candidate = item.candidate
  const sourceSummary = item.source
  const rec = existingRecord
  const provenance = candidate.provenance
  const binding = provenance?.artifact_binding ?? null

  // Pinned provenance ref takes precedence; fallback chain preserves existing identity
  const upstreamRef = binding?.pinned_commit ?? provenance?.upstream_ref ?? sourceSummary?.last_ref ?? rec.source?.upstream_ref ?? null
  const sourceUrl = provenance?.raw_url ?? provenance?.url ?? sourceSummary?.url ?? rec.source?.url ?? binding?.raw_url ?? null
  const sourcePath = candidate.path

  return {
    canonical_skill_id: rec.canonical_skill_id,
    canonical_name: rec.canonical_name,
    display_name: draftFields?.display_name ?? rec.display_name,
    status: rec.status ?? 'active',
    identity: {
      source_skill_ids: Array.from(new Set([
        ...(rec.identity?.source_skill_ids ?? []),
        candidate.candidate_id,
      ])),
      aliases: rec.identity?.aliases ?? [],
      current_version_id: candidate.content_digest,
    },
    source: {
      source_id: candidate.source_id,
      path: sourcePath,
      url: sourceUrl,
      upstream_ref: upstreamRef,
      license: sourceSummary?.license ?? rec.source?.license ?? { spdx: null, verified: false },
    },
    capabilities: rec.capabilities ?? { domains: [], task_types: [], workflow_stages: [], atomic_capabilities: [] },
    interfaces: rec.interfaces ?? { inputs: [], outputs: [], handoff_outputs: [] },
    tools: rec.tools ?? { required: [], optional: [] },
    risk: rec.risk ?? { side_effect_level: 'none', risk_surfaces: [] },
    quality: rec.quality ?? { score: null, confidence: 'unknown' },
    relations: rec.relations ?? { duplicates: [], complements: [], conflicts: [] },
    analysis: rec.analysis ?? {
      path: `catalog/analyses/${prefixFor(rec.canonical_skill_id)}/${rec.canonical_skill_id}.md`,
      hash: null,
    },
    curation: rec.curation ?? { notes: [] },
    created_at: rec.created_at,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Preflight (all-or-nothing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run preflight: build all drafts, detect collisions, validate before any write.
 * Returns { ok, drafts, outcomes, idCollisions, errors }.
 */
export function runPreflight(decisions, workload, itemIndex) {
  const errors = []
  const draftEntries = [] // { targetSkillId, draft, item, decision }

  const targetIds = new Set()
  const newRecordsByTargetId = new Map()

  for (const d of decisions.decisions) {
    const item = itemIndex.get(d.item_digest)
    if (!item) {
      errors.push(`Item not found for item_digest: ${d.item_digest}`)
      continue
    }

    if (d.decision === 'new') {
      const canonicalName = d.canonical_name
      const targetSkillId = computeTargetSkillId(
        canonicalName,
        item.candidate.source_id,
        item.candidate.path,
      )

      // Detect collision: same target ID from different items
      if (targetIds.has(targetSkillId)) {
        if (newRecordsByTargetId.has(targetSkillId)) {
          const other = newRecordsByTargetId.get(targetSkillId)
          errors.push(
            `ID collision: items "${other}" and "${d.item_digest}" both resolve to target ${targetSkillId}`,
          )
        } else {
          // collision with update target
          errors.push(
            `ID collision: new target ${targetSkillId} conflicts with existing record`
          )
        }
        continue
      }
      targetIds.add(targetSkillId)
      newRecordsByTargetId.set(targetSkillId, d.item_digest)

      const draft = buildNewDraft(item, canonicalName, d.draft_fields, targetSkillId)
      draftEntries.push({ targetSkillId, draft, item, decision: d })
      continue
    }

    if (d.decision === 'update') {
      if (!item.existing_match?.record) {
        errors.push(`Update decision but no existing record for item ${d.item_digest}`)
        continue
      }
      const existingRecord = item.existing_match.record
      const targetSkillId = existingRecord.canonical_skill_id

      // Detect collision: update target already claimed by a new decision
      if (newRecordsByTargetId.has(targetSkillId)) {
        errors.push(
          `ID collision: update target ${targetSkillId} already claimed by new decision for "${newRecordsByTargetId.get(targetSkillId)}"`,
        )
        continue
      }
      targetIds.add(targetSkillId)

      const draft = buildUpdateDraft(item, existingRecord, d.draft_fields)
      draftEntries.push({ targetSkillId, draft, item, decision: d })
      continue
    }

    // Non-writable decisions do not create drafts
  }

  const idCollisions = errors.filter(e => e.includes('collision'))
  const otherErrors = errors.filter(e => !e.includes('collision'))

  return {
    ok: errors.length === 0,
    draftEntries,
    idCollisions,
    errors: otherErrors,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Apply decisions (finalize)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply decisions to workload items. Does preflight first, then writes all-or-nothing.
 *
 * @param {object} decisions - validated decisions document
 * @param {object} workload - validated workload
 * @param {Map} itemIndex
 * @param {object} opts
 * @param {boolean} opts.dryRun - simulate only
 * @param {string} opts.outputDir - output directory for drafts/outcomes
 * @param {Function} opts.writeSkillRecordFn - injected writer function (draft) => void
 */
export function applyDecisions(decisions, workload, itemIndex, opts = {}) {
  const {
    dryRun = false,
    outputDir = resolveWithin(ROOT, 'reports', 'skill-normalization', workload.run_id),
    writeSkillRecordFn = defaultWriteSkillRecord,
  } = opts

  // ── Preflight ────────────────────────────────────────────────────────────
  const preflight = runPreflight(decisions, workload, itemIndex)
  if (!preflight.ok) {
    const allErrors = [...preflight.idCollisions, ...preflight.errors]
    throw new Error(`Preflight failed:\n${allErrors.map(e => `  - ${e}`).join('\n')}`)
  }

  const outcomes = []
  const written = []
  const draftEntries = preflight.draftEntries
  const draftEntryMap = new Map(
    draftEntries.map(de => [de.decision.item_digest, de])
  )

  ensureDir(outputDir)

  // ── Process each decision ───────────────────────────────────────────────
  for (const d of decisions.decisions) {
    const item = itemIndex.get(d.item_digest)
    if (!item) {
      outcomes.push({
        item_digest: d.item_digest,
        candidate_id: null,
        declared_name: null,
        decision: d.decision,
        reason: d.reason,
        status: 'error',
        error: 'item not found in workload',
        written: false,
      })
      continue
    }

    const outcome = {
      item_digest: d.item_digest,
      candidate_id: item.candidate.candidate_id,
      declared_name: item.candidate.declared_name,
      decision: d.decision,
      reason: d.reason,
      written: false,
    }

    if (WRITABLE_DECISIONS.has(d.decision)) {
      const entry = draftEntryMap.get(d.item_digest)
      if (!entry) {
        outcome.status = 'error'
        outcome.error = 'draft missing after preflight'
        outcomes.push(outcome)
        continue
      }

      outcome.canonical_skill_id = entry.targetSkillId

      if (!dryRun) {
        writeSkillRecordFn(entry.draft)
        const draftPath = resolveWithin(outputDir, `draft-${entry.targetSkillId}.json`)
        writeTextAtomic(draftPath, stableStringify({
          schema_version: 1,
          draft: entry.draft,
          item_digest: d.item_digest,
          decision: d.decision,
          reason: d.reason,
          finalize_digest: computeDecisionsDigest(decisions),
        }), ROOT)
        outcome.written = true
        outcome.canonical_skill_id = entry.targetSkillId
        written.push(entry.targetSkillId)
        outcome.status = 'written'
      } else {
        outcome.canonical_skill_id = entry.targetSkillId
        outcome.simulated = true
        outcome.status = 'would_write'
      }
      outcomes.push(outcome)
      continue
    }

    // ── Non-writable terminals ─────────────────────────────────────────────
    const hint = item.identity_hint
    outcome.canonical_skill_id = hint?.canonical_skill_id ?? null
    outcome.status = 'noted'

    if (!dryRun) {
      const handoffPath = resolveWithin(outputDir, `outcome-${hint?.canonical_skill_id ?? outcome.candidate_id}.json`)
      writeTextAtomic(handoffPath, stableStringify({
        schema_version: 1,
        item_digest: d.item_digest,
        candidate_id: item.candidate.candidate_id,
        declared_name: item.candidate.declared_name,
        decision: d.decision,
        reason: d.reason,
        workload_digest: workload.workload_digest,
        decisions_digest: computeDecisionsDigest(decisions),
      }), ROOT)
    }
    outcomes.push(outcome)
  }

  // ── Add provenance-blocked outcomes ────────────────────────────────────
  for (const blocked of (workload.provenance_blocked ?? [])) {
    outcomes.push({
      item_digest: null,
      candidate_id: blocked.candidate_id,
      declared_name: blocked.declared_name ?? 'unknown',
      decision: 'blocked',
      canonical_skill_id: null,
      reason: `Provenance invalid: ${blocked.reasons.join('; ')}`,
      status: 'noted',
      written: false,
      preblocked: true,
    })
  }

  return { outcomes, written, dryRun, draftEntries }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Decisions digest (for idempotence)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Content-address decisions so repeated finalize can detect no-op.
 */
export function computeDecisionsDigest(decisions) {
  return sha256(stableStringify({
    run_id: decisions.run_id,
    workload_digest: decisions.workload_digest,
    schema_version: decisions.schema_version,
    decisions: decisions.decisions.map(d => ({
      item_digest: d.item_digest,
      decision: d.decision,
      canonical_name: d.canonical_name ?? null,
      reason: d.reason,
      draft_fields: d.draft_fields ?? null,
    })),
  }))
}

// ═══════════════════════════════════════════════════════════════════════════════
// Idempotence check
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if finalization already occurred for this workload+decisions combination.
 * Returns { finalized, existingDigest }.
 */
export function checkAlreadyFinalized(runId, decisionsDigest, opts = {}) {
  const outputDir = opts.outputDir ?? resolveWithin(ROOT, 'reports', 'skill-normalization', runId)
  const outcomesPath = resolveWithin(outputDir, 'finalization-outcomes.json')
  if (!existsSync(outcomesPath)) return { finalized: false, existingDigest: null }

  let existing
  try {
    existing = JSON.parse(readFileSync(outcomesPath, 'utf8'))
  } catch {
    return { finalized: false, existingDigest: null }
  }

  if (existing.decisions_digest === decisionsDigest) {
    return { finalized: true, existingDigest: decisionsDigest, same: true }
  }

  return { finalized: true, existingDigest: existing.decisions_digest ?? null, same: false }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Outcome report
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Write outcome report. No-op if already written with same digest (idempotent).
 */
export function writeOutcomeReport(runId, outcomes, written, decisionsDigest, workloadDigest, opts = {}) {
  const outputDir = opts.outputDir ?? resolveWithin(ROOT, 'reports', 'skill-normalization', runId)
  ensureDir(outputDir)

  const summary = {
    schema_version: 1,
    run_id: runId,
    workload_digest: workloadDigest,
    decisions_digest: decisionsDigest,
    total: outcomes.length,
    written_count: written.length,
    decisions: {
      new: outcomes.filter(o => o.decision === 'new').length,
      update: outcomes.filter(o => o.decision === 'update').length,
      duplicate_needs_curation: outcomes.filter(o => o.decision === 'duplicate_needs_curation').length,
      rejected: outcomes.filter(o => o.decision === 'rejected').length,
      blocked: outcomes.filter(o => o.decision === 'blocked').length,
    },
    written_skills: written,
    outcomes,
    generated_at: nowIso(),
  }

  const summaryPath = resolveWithin(outputDir, 'finalization-outcomes.json')
  writeTextAtomic(summaryPath, stableStringify(summary), ROOT)
  return summaryPath
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default canonical writer (production)
// ═══════════════════════════════════════════════════════════════════════════════

function defaultWriteSkillRecord(draft) {
  const proc = spawnSync(process.execPath, [WRITE_SKILL_RECORD], {
    input: stableStringify(draft),
    encoding: 'utf8',
  })
  if (proc.status !== 0) {
    throw new Error(
      `write-skill-record.mjs failed for ${draft.canonical_skill_id}:\n${proc.stderr || proc.stdout}`,
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// High-level finalize (orchestrates validate + preflight + apply + report)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full finalize flow: load, validate, preflight, write, report.
 * Throws on any failure.
 */
export function finalizeWorkload(runId, decisions, opts = {}) {
  const {
    dryRun = false,
    candidatesPath,
    registryPath,
    recordsDir,
    snapshotDir,
    outputDir,
    workloadDir,
    writeSkillRecordFn,
  } = opts

  // Resolve paths: workloadDir and outputDir may differ in tests; production uses reports/
  const resolvedOutputDir = outputDir ?? resolveWithin(ROOT, 'reports', 'skill-normalization', runId)
  const resolvedWorkloadDir = workloadDir ?? resolvedOutputDir

  // 0. Compute decisions digest for idempotence
  const decisionsDigest = computeDecisionsDigest(decisions)

  // 0a. Idempotence check
  const { finalized, existingDigest, same } = checkAlreadyFinalized(runId, decisionsDigest, { outputDir: resolvedOutputDir })
  if (finalized && same) {
    return {
      status: 'already_finalized',
      message: 'Workload already finalized with identical decisions',
      outcomes_path: resolveWithin(resolvedOutputDir, 'finalization-outcomes.json'),
      written: [],
      outcomes: [],
      dryRun,
    }
  }
  if (finalized && !same) {
    throw new Error(
      `Workload already finalized with different decisions (digest=${existingDigest}). Cannot finalize same workload twice with different decisions.`,
    )
  }

  // 1. Load and verify workload
  const { workload, itemIndex } = loadWorkload(runId, {
    workloadDir: resolvedWorkloadDir,
    candidatesPath,
    registryPath,
    recordsDir,
    snapshotDir,
  })

  // 2. Validate decisions
  const validation = validateDecisions(decisions, workload, itemIndex)
  if (!validation.valid) {
    throw new Error(`Decisions validation failed:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`)
  }

  // 3. Apply (preflight + write)
  const result = applyDecisions(decisions, workload, itemIndex, {
    dryRun,
    outputDir: resolvedOutputDir,
    writeSkillRecordFn,
  })

  // 4. Write outcome report
  const summaryPath = writeOutcomeReport(
    runId,
    result.outcomes,
    result.written,
    decisionsDigest,
    workload.workload_digest,
    { outputDir: resolvedOutputDir },
  )

  return {
    status: 'ok',
    dry_run: dryRun,
    total: result.outcomes.length,
    written: result.written,
    written_skills: result.written,
    summary_path: summaryPath,
    outcomes: result.outcomes,
  }
}
