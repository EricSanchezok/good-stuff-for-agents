import { createHash } from 'node:crypto';
import { validateAgainstSchema, runContextSchemaV1 } from '../../../catalog-data/scripts/lib/schema-validators.mjs';

/**
 * Creates an immutable run-context snapshot.
 * All orchestration phases consume this same frozen object.
 * Once sealed, no caller may mutate it — mutations go through ledger.
 *
 * snapshot_digest and evidence_manifest_digest are required SHA-256 hex strings
 * that bind the run context to the exact collector snapshot evidence.
 */
export function createRunContext({
  runId,
  snapshotId,
  timestamp,
  catalogCounts,
  freshness,
  coverage,
  relations,
  packLifecycle,
  issueDigest,
  demandMetadata,
  priorFingerprint,
  snapshotDigest,
  evidenceManifestDigest,
  notes,
} = {}) {
  const resolvedRunId = runId || generateRunId();
  const ctx = {
    schema_version: 1,
    run_id: resolvedRunId,
    snapshot_id: snapshotId || `snap_${resolvedRunId}`,
    timestamp: timestamp || new Date().toISOString(),
    catalog_counts: normalizeCatalogCounts(catalogCounts),
    freshness: normalizeFreshness(freshness),
    coverage: normalizeCoverage(coverage),
    relations: normalizeRelations(relations),
    pack_lifecycle: normalizePackLifecycle(packLifecycle),
    issue_digest: normalizeIssueDigest(issueDigest),
    demand_metadata: normalizeDemandMetadata(demandMetadata),
    prior_fingerprint: priorFingerprint || '',
    snapshot_digest: validateHexDigest(snapshotDigest, 'snapshot_digest'),
    evidence_manifest_digest: validateHexDigest(evidenceManifestDigest, 'evidence_manifest_digest'),
    notes: notes || '',
  };

  const validation = validateAgainstSchema(ctx, runContextSchemaV1);
  if (!validation.ok) {
    throw new Error(`Invalid run context: ${validation.errors.join('; ')}`);
  }

  const digest = computeDigest(ctx);

  return Object.freeze({
    ...ctx,
    digest,
    _sealed: true,
  });
}

/**
 * Resume from a saved context if the digest matches.
 * Returns null on digest mismatch (no silent reuse).
 */
export function resumeRunContext(saved, expectedDigest) {
  if (!saved || typeof saved !== 'object') return null;
  if (!/^[a-f0-9]{64}$/u.test(expectedDigest || '')) return null;

  const { digest: savedDigest, _sealed, ...record } = saved;
  const validation = validateAgainstSchema(record, runContextSchemaV1);
  if (!validation.ok) return null;

  const actual = computeDigest(record);
  if (savedDigest !== expectedDigest || actual !== expectedDigest) return null;

  return Object.freeze({
    ...record,
    digest: actual,
    _sealed: true,
  });
}

export function computeContextDigest(ctx) {
  return computeDigest(ctx);
}

export function serializeRunContext(ctx) {
  const { digest, _sealed, ...record } = ctx;
  return { ...record, digest };
}

// --- internals ---

function generateRunId() {
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const rand = Math.random().toString(36).slice(2, 8);
  return `run_${ts}-${rand}`;
}

function validateHexDigest(value, label) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${label} must be a 64-character lowercase SHA-256 hex string, got: ${typeof value === 'string' ? value.slice(0, 20) + '...' : String(value)}`);
  }
  return value;
}

function computeDigest(ctx) {
  const ordered = {
    schema_version: ctx.schema_version,
    run_id: ctx.run_id,
    snapshot_id: ctx.snapshot_id,
    timestamp: ctx.timestamp,
    catalog_counts: ctx.catalog_counts,
    freshness: ctx.freshness,
    coverage: ctx.coverage,
    relations: ctx.relations,
    pack_lifecycle: ctx.pack_lifecycle,
    issue_digest: ctx.issue_digest,
    demand_metadata: ctx.demand_metadata,
    prior_fingerprint: ctx.prior_fingerprint,
    snapshot_digest: ctx.snapshot_digest,
    evidence_manifest_digest: ctx.evidence_manifest_digest,
    notes: ctx.notes,
  };
  return createHash('sha256').update(stableStringify(ordered)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeCatalogCounts(input = {}) {
  return {
    sources: countEntry(input.sources),
    skills: countEntry(input.skills),
    analyses: countEntry(input.analyses),
    relations: countEntry(input.relations),
    packs: countEntry(input.packs),
    evaluations: countEntry(input.evaluations),
    issues: countEntry(input.issues),
  };
}

function countEntry(raw) {
  const entry = raw || {};
  return stripUndefined({
    total: safeInt(entry.total, 0),
    active: safeInt(entry.active),
    candidate: safeInt(entry.candidate),
    published: safeInt(entry.published),
    stale: safeInt(entry.stale),
    added_since_last_run: safeInt(entry.added_since_last_run, 0),
  });
}

function normalizeFreshness(input = {}) {
  return stripUndefined({
    sources_stale_count: safeInt(input.sources_stale_count, 0),
    skills_stale_count: safeInt(input.skills_stale_count, 0),
    analyses_stale_count: safeInt(input.analyses_stale_count, 0),
    oldest_stale_iso: input.oldest_stale_iso || undefined,
    freshness_cutoff: input.freshness_cutoff || undefined,
  });
}

function normalizeCoverage(input = {}) {
  return stripUndefined({
    skills_with_analysis: safeInt(input.skills_with_analysis, 0),
    skills_without_analysis: safeInt(input.skills_without_analysis, 0),
    coverage_ratio: safeNum(input.coverage_ratio, 0),
    active_skills_with_analysis: safeInt(input.active_skills_with_analysis),
  });
}

function normalizeRelations(input = {}) {
  return {
    total_edges: safeInt(input.total_edges, 0),
    by_predicate: input.by_predicate || {},
    chains_count: safeInt(input.chains_count, 0),
    strengthens_count: safeInt(input.strengthens_count, 0),
    alternatives_count: safeInt(input.alternatives_count, 0),
    conflicts_count: safeInt(input.conflicts_count, 0),
  };
}

function normalizePackLifecycle(input = {}) {
  return {
    total_candidate: safeInt(input.total_candidate, 0),
    total_published: safeInt(input.total_published, 0),
    new_since_last_run: safeInt(input.new_since_last_run, 0),
    stale_packs: safeInt(input.stale_packs, 0),
    promoted_this_run: safeInt(input.promoted_this_run, 0),
    rejected_this_run: safeInt(input.rejected_this_run, 0),
  };
}

function normalizeIssueDigest(input = {}) {
  return {
    open: safeInt(input.open, 0),
    acknowledged: safeInt(input.acknowledged, 0),
    fulfilled: safeInt(input.fulfilled, 0),
    blocked: safeInt(input.blocked, 0),
  };
}

function normalizeDemandMetadata(input = {}) {
  return {
    demand_skill_ids: uniqueSortedStrings(input.demand_skill_ids, (value) => value.startsWith('skl_')),
    domain_slugs: uniqueSortedStrings(input.domain_slugs),
  };
}

function uniqueSortedStrings(values, predicate = () => true) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0 && predicate(value)))].sort();
}

function safeInt(val, fallback = 0) {
  if (typeof val === 'number' && Number.isInteger(val) && val >= 0) return val;
  return fallback;
}

function safeNum(val, fallback = 0) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return fallback;
}

function stripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
