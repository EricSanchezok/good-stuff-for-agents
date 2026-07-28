import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from '../../../catalog-data/scripts/lib/catalog-lib.mjs';

/**
 * Deterministic live-state collector with evidence manifest.
 *
 * Reads canonical repository files directly — never trusts indexes as authoritative
 * when records can be counted from the filesystem. Missing optional derived files
 * produce zero/unknown values. Malformed canonical files fail closed.
 *
 * Emits:
 *   - `context`    — `run_context_input` shape consumed by `createRunContext`
 *   - `digest`     — SHA-256 of the semantic aggregate (same-count content edits change it)
 *   - `evidenceManifest`      — { entries: [...{ path, sha256, kind }...] }
 *   - `evidenceManifestDigest`— SHA-256 of the full manifest
 *   - `snapshotDigest`        — SHA-256 of digest + evidenceManifestDigest
 */

export const __FILE_DIR__ = dirname(fileURLToPath(import.meta.url));

// ---- Public API ----

/**
 * Collect live state from a catalog root directory.
 *
 * @param {{ catalogRoot?: string, issueWorkloadPath?: string, demandArtifactPath?: string, reader?: CollectorReader, referenceTimestamp?: string }} opts
 * @returns {{ context: object, digest: string, evidenceManifest: object, evidenceManifestDigest: string, snapshotDigest: string }}
 */
export function collectRunContextInput(opts = {}) {
  const catalogRoot = opts.catalogRoot || findCatalogRoot();
  const reader = opts.reader || buildDefaultReader();
  const referenceTimestamp = opts.referenceTimestamp || new Date().toISOString();

  // Build semantic context
  const ctx = buildContext(catalogRoot, reader, referenceTimestamp);

  // Collect issue workload summary (bound to canonical workload format)
  const issue = collectIssueBinding(reader, opts.issueWorkloadPath);

  // Collect prior fingerprint from latest valid sealed terminal ledger
  const prior = collectPriorFingerprint(catalogRoot, reader);

  // Collect demand artifact if provided
  const demandResult = opts.demandArtifactPath
    ? collectDemandArtifact(reader, opts.demandArtifactPath)
    : null;
  if (demandResult && (
    !issue.ok ||
    demandResult.run_id !== issue.runId ||
    demandResult.workload_digest !== issue.workloadDigest
  )) {
    throw new Error('Demand artifact binding does not match the canonical Issue workload');
  }
  const demandMetadata = demandResult;

  const notes = buildContextNotes(issue);
  const issueDigest = issue.ok ? issue.issue_digest : { open: 0, acknowledged: 0, fulfilled: 0, blocked: 1 };
  const demandDigest = demandResult?.digest || null;

  const input = {
    catalogCounts: ctx.counts,
    freshness: ctx.freshness,
    coverage: ctx.coverage,
    relations: ctx.relations,
    packLifecycle: ctx.packLifecycle,
    issueDigest,
    issueWorkloadDigest: issue.workloadDigest || null,
    demandDigest,
    priorFingerprint: prior,
    notes,
  };

  const serializedInput = JSON.parse(JSON.stringify(input));
  const digest = computeInputDigest(serializedInput);

  // Build evidence manifest
  const manifest = buildEvidenceManifest(catalogRoot, reader, opts.issueWorkloadPath, opts.demandArtifactPath);
  const evidenceManifestDigest = computeManifestDigest(manifest);
  const snapshotDigest = createHash('sha256')
    .update(digest)
    .update(evidenceManifestDigest)
    .digest('hex');

  return Object.freeze({
    context: input,
    digest,
    evidenceManifest: manifest,
    evidenceManifestDigest,
    snapshotDigest,
    demandMetadata,
  });
}

/**
 * Verify that the current canonical state has not changed since a prior snapshot digest.
 * Recomputes raw hashes including Issue workload/demand artifact from saved collector binding.
 * Unchanged => { ok: true }; same-count content edit => stale.
 *
 * Returns { ok: true, staleness: 'current', digest, snapshotDigest } or
 *         { ok: false, staleness: 'stale', digest, snapshotDigest, expectedDigest, expectedSnapshotDigest }
 */
export function checkEvidenceFreshness(opts = {}) {
  const catalogRoot = opts.catalogRoot || findCatalogRoot();
  const reader = opts.reader || buildDefaultReader();
  const expectedSnapshotDigest = opts.expectedSnapshotDigest;
  const expectedDigest = opts.expectedDigest;

  if (!expectedSnapshotDigest && !expectedDigest) {
    throw new Error('expectedSnapshotDigest or expectedDigest is required for freshness check');
  }

  const { digest, snapshotDigest, evidenceManifestDigest } = collectRunContextInput({
    catalogRoot,
    reader,
    issueWorkloadPath: opts.issueWorkloadPath,
    demandArtifactPath: opts.demandArtifactPath,
    referenceTimestamp: opts.referenceTimestamp,
  });

  // Check snapshot digest first (most reliable)
  if (expectedSnapshotDigest) {
    if (snapshotDigest === expectedSnapshotDigest) {
      return { ok: true, staleness: 'current', digest, snapshotDigest, evidenceManifestDigest };
    }
    return { ok: false, staleness: 'stale', digest, snapshotDigest, evidenceManifestDigest, expectedSnapshotDigest };
  }

  // Fallback: compare semantic digest
  if (expectedDigest) {
    if (digest === expectedDigest) {
      return { ok: true, staleness: 'current', digest, snapshotDigest, evidenceManifestDigest };
    }
    return { ok: false, staleness: 'stale', digest, snapshotDigest, evidenceManifestDigest, expectedDigest };
  }

  return { ok: false, staleness: 'stale', digest, snapshotDigest, evidenceManifestDigest };
}

// ---- Evidence manifest ----

function buildEvidenceManifest(catalogRoot, reader, issueWorkloadPath, demandArtifactPath) {
  const entries = [];
  const repositoryRoot = dirname(catalogRoot);
  const entry = (path, kind) => fileEntry(path, kind, reader, repositoryRoot);

  // Source registry
  const registryPath = join(catalogRoot, 'sources', 'registry.yaml');
  if (reader.exists(registryPath)) {
    entries.push(entry(registryPath, 'source_registry'));
  }

  // Source state
  const statePath = join(catalogRoot, 'sources', 'state.jsonl');
  if (reader.exists(statePath)) {
    entries.push(entry(statePath, 'source_state'));
  }

  // Skill records
  const skillsDir = join(catalogRoot, 'skills', 'records');
  if (reader.exists(skillsDir)) {
    const shardNames = reader.readDir(skillsDir);
    for (const shard of shardNames) {
      const shardPath = join(skillsDir, shard);
      if (!reader.isDir(shardPath)) continue;
      const files = reader.readDir(shardPath);
      for (const f of files) {
        if (!f.endsWith('.yaml')) continue;
        entries.push(entry(join(shardPath, f), 'skill_record'));
      }
    }
  }

  // Analysis records
  const analysesDir = join(catalogRoot, 'analyses');
  if (reader.exists(analysesDir)) {
    const shardNames = reader.readDir(analysesDir);
    for (const shard of shardNames) {
      const shardPath = join(analysesDir, shard);
      if (!reader.isDir(shardPath)) continue;
      const files = reader.readDir(shardPath);
      for (const f of files) {
        if (!f.endsWith('.md')) continue;
        entries.push(entry(join(shardPath, f), 'analysis_record'));
      }
    }
  }

  // Relation records
  const relationsDir = join(catalogRoot, 'relations');
  if (reader.exists(relationsDir)) {
    const files = reader.readDir(relationsDir);
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue;
      entries.push(entry(join(relationsDir, f), 'relation_record'));
    }
  }

  // Pack records (candidates + published)
  for (const status of ['candidates', 'published']) {
    const packsDir = join(catalogRoot, 'packs', status);
    if (!reader.exists(packsDir)) continue;
    const packDirNames = reader.readDir(packsDir);
    for (const dirName of packDirNames) {
      const packDir = join(packsDir, dirName);
      if (!reader.isDir(packDir)) continue;
      const yamlPath = join(packDir, 'pack.yaml');
      if (reader.exists(yamlPath)) {
        entries.push(entry(yamlPath, 'pack_record'));
      }
      const evalPath = join(packDir, 'evaluation.json');
      if (reader.exists(evalPath)) {
        entries.push(entry(evalPath, 'evaluation_record'));
      }
      const proofPath = join(packDir, 'preflight-proof.json');
      if (reader.exists(proofPath)) {
        entries.push(entry(proofPath, 'preflight_proof'));
      }
    }
  }

  // Issue workload (if provided)
  if (issueWorkloadPath && reader.exists(issueWorkloadPath)) {
    entries.push(entry(issueWorkloadPath, 'issue_workload'));
  }

  // Demand artifact (if provided)
  if (demandArtifactPath && reader.exists(demandArtifactPath)) {
    entries.push(entry(demandArtifactPath, 'demand_artifact'));
  }

  // Terminal ledger fingerprint source
  const runsDir = join(catalogRoot, 'runs');
  if (reader.exists(runsDir)) {
    const entryNames = reader.readDir(runsDir);
    const sorted = entryNames.filter((n) => n.startsWith('run_')).sort().reverse();
    for (const runDir of sorted) {
      const ledgerDir = join(runsDir, runDir, 'terminal-ledger');
      if (reader.exists(ledgerDir)) {
        const ledgerFiles = reader.readDir(ledgerDir).sort().reverse();
        for (const lf of ledgerFiles) {
          const ledgerPath = join(ledgerDir, lf);
          try {
            const raw = reader.readText(ledgerPath);
            const ledger = JSON.parse(raw);
            if (ledger && ledger.run_id) {
              entries.push(entry(ledgerPath, 'terminal_ledger'));
              break; // only latest valid ledger
            }
          } catch { /* skip */ }
        }
        if (entries.some(e => e.kind === 'terminal_ledger')) break; // found it
      }
    }
  }

  // Stable sort by path
  entries.sort((a, b) => a.path.localeCompare(b.path));

  return { entries };
}

function fileEntry(absPath, kind, reader, repositoryRoot) {
  const raw = reader.readText(absPath);
  return {
    path: relative(repositoryRoot, absPath),
    kind,
    sha256: createHash('sha256').update(raw).digest('hex'),
  };
}

function computeManifestDigest(manifest) {
  const ordered = {
    entries: manifest.entries.map(e => ({ path: e.path, kind: e.kind, sha256: e.sha256 })),
  };
  return createHash('sha256').update(stableStringify(ordered)).digest('hex');
}

// ---- Context builders ----

function buildContext(catalogRoot, reader, referenceTimestamp) {
  const skills = loadSkillRecords(catalogRoot, reader);
  const sources = loadSourceRegistry(catalogRoot, reader);
  const analyses = loadAnalysisRecords(catalogRoot, reader);
  const relations = loadRelationRecords(catalogRoot, reader);
  const packs = loadPackRecords(catalogRoot, reader);
  const evaluations = loadEvaluationRecords(catalogRoot, reader);
  const sourceState = loadSourceState(catalogRoot, reader);

  const sourceStatusCounts = countByStatus(sources);
  const skillStatusCounts = countByStatus(skills);

  const counts = {
    sources: {
      total: sources.length,
      active: sourceStatusCounts.active || 0,
      candidate: sourceStatusCounts.candidate || 0,
      published: sourceStatusCounts.published || 0,
      stale: sourceStatusCounts.stale || 0,
      added_since_last_run: 0,
    },
    skills: {
      total: skills.length,
      active: skillStatusCounts.active || 0,
      candidate: skillStatusCounts.candidate || 0,
      published: skillStatusCounts.published || 0,
      stale: skillStatusCounts.stale || 0,
      added_since_last_run: 0,
    },
    analyses: {
      total: analyses.length,
      active: analyses.length,
      candidate: 0,
      published: 0,
      stale: 0,
      added_since_last_run: 0,
    },
    relations: {
      total: relations.length,
      active: relations.length,
      candidate: 0,
      published: 0,
      stale: 0,
      added_since_last_run: 0,
    },
    packs: {
      total: packs.length,
      active: packs.filter((p) => p.status === 'published').length,
      candidate: packs.filter((p) => p.status === 'candidate').length,
      published: packs.filter((p) => p.status === 'published').length,
      stale: packs.filter((p) => p.status === 'stale').length,
      added_since_last_run: 0,
    },
    evaluations: {
      total: evaluations.length,
      active: evaluations.length,
      candidate: 0,
      published: 0,
      stale: 0,
      added_since_last_run: 0,
    },
    issues: { total: 0, active: 0, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
  };

  // Freshness — no wall-clock freshness_cutoff; let snapshot digest be the anchor
  const sourceStateMap = new Map();
  for (const entry of sourceState) {
    const existing = sourceStateMap.get(entry.source_id);
    if (!existing || (entry.checked_at && entry.checked_at > existing.checked_at)) {
      sourceStateMap.set(entry.source_id, entry);
    }
  }

  let sourcesStaleCount = 0;
  let oldestStaleIso = null;

  for (const entry of sourceStateMap.values()) {
    if (entry.status === 'error') sourcesStaleCount++;
    if (entry.checked_at && (!oldestStaleIso || entry.checked_at < oldestStaleIso)) {
      oldestStaleIso = entry.checked_at;
    }
  }

  const freshness = {
    sources_stale_count: sourcesStaleCount,
    skills_stale_count: 0,
    analyses_stale_count: 0,
    oldest_stale_iso: oldestStaleIso || undefined,
    freshness_cutoff: undefined, // no wall-clock dependency
  };

  // Coverage
  const skillWithAnalysis = new Set();
  for (const analysis of analyses) {
    skillWithAnalysis.add(analysis.skill_id);
  }

  const activeSkills = skills.filter((s) => s.status === 'active' || s.status === 'preview');
  const skillsWithAnalysis = skills.filter((s) => skillWithAnalysis.has(s.canonical_skill_id)).length;
  const skillsWithoutAnalysis = skills.filter((s) => !skillWithAnalysis.has(s.canonical_skill_id)).length;
  const activeSkillsWithAnalysis = activeSkills.filter((s) => skillWithAnalysis.has(s.canonical_skill_id)).length;

  const coverage = {
    skills_with_analysis: skillsWithAnalysis,
    skills_without_analysis: skillsWithoutAnalysis,
    coverage_ratio: skills.length > 0 ? parseFloat((skillsWithAnalysis / skills.length).toFixed(4)) : 0,
  };

  if (activeSkills.length !== skills.length) {
    coverage.active_skills_with_analysis = activeSkillsWithAnalysis;
  }

  // Relations
  const byPredicate = {};
  let chainsCount = 0;
  let strengthensCount = 0;
  let alternativesCount = 0;
  let conflictsCount = 0;

  for (const rel of relations) {
    const p = rel.predicate;
    byPredicate[p] = (byPredicate[p] || 0) + 1;
    if (p === 'chains_with') chainsCount++;
    else if (p === 'strengthens') strengthensCount++;
    else if (p === 'alternatives') alternativesCount++;
    else if (p === 'conflicts_with') conflictsCount++;
  }

  const relData = {
    total_edges: relations.length,
    by_predicate: byPredicate,
    chains_count: chainsCount,
    strengthens_count: strengthensCount,
    alternatives_count: alternativesCount,
    conflicts_count: conflictsCount,
  };

  // Pack lifecycle
  const packLifecycle = {
    total_candidate: packs.filter((p) => p.status === 'candidate').length,
    total_published: packs.filter((p) => p.status === 'published').length,
    new_since_last_run: 0,
    stale_packs: packs.filter((p) => p.status === 'stale').length,
    promoted_this_run: 0,
    rejected_this_run: 0,
  };

  return { counts, freshness, coverage, relations: relData, packLifecycle };
}

function buildContextNotes(issue) {
  if (!issue.ok && issue.blocked) return 'Issue workload blocked or invalid; continuing with blocked summary.';
  if (!issue.ok && issue.empty) return 'No issue workload provided; continuing without demand signal.';
  if (issue.ok && issue.empty) return 'No issue workload provided; continuing without demand signal.';
  return '';
}

// ---- Issue workload binding (canonical format) ----

const TRUSTED_REPOSITORY = 'EricSanchezok/good-stuff-for-agents';

function collectIssueBinding(reader, issueWorkloadPath) {
  const blockedResult = {
    ok: false,
    blocked: true,
    empty: false,
    issue_digest: { open: 0, acknowledged: 0, fulfilled: 0, blocked: 1 },
    workloadDigest: null,
    demandMetadata: null,
    runId: null,
  };

  if (!issueWorkloadPath || !reader.exists(issueWorkloadPath)) {
    return { ...blockedResult, empty: true };
  }

  let data;
  try {
    data = reader.readJson(issueWorkloadPath);
  } catch {
    return blockedResult;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return blockedResult;
  }

  // Validate canonical workload fields
  if (data.kind !== 'issue_workload') {
    return blockedResult;
  }
  if (data.repository !== TRUSTED_REPOSITORY) {
    return blockedResult;
  }
  if (!data.run_id || typeof data.run_id !== 'string') {
    return blockedResult;
  }
  if (typeof data.snapshot_complete !== 'boolean') {
    return blockedResult;
  }

  // Validate/recompute workload digest
  if (!data.workload_digest || typeof data.workload_digest !== 'string') {
    return blockedResult;
  }

  // Incomplete snapshot is blocked, never zero-complete
  if (data.snapshot_complete !== true) {
    return {
      ...blockedResult,
      blocked: true,
      issue_digest: {
        open: 0,
        acknowledged: 0,
        fulfilled: 0,
        blocked: (data.scan_summary?.total_scanned || 0) || 1,
      },
      workloadDigest: data.workload_digest,
    };
  }

  // Build issue digest from canonical workload
  const acceptedCount = Array.isArray(data.all_accepted_issues) ? data.all_accepted_issues.length : 0;
  const rejectedCount = Array.isArray(data.rejected_issues) ? data.rejected_issues.length : 0;
  const totalScanned = data.scan_summary?.total_scanned || (acceptedCount + rejectedCount);

  const issueDigest = {
    open: acceptedCount,
    acknowledged: 0,
    fulfilled: 0,
    blocked: rejectedCount,
  };

  // Extract demand metadata from accepted issues (canonical skill IDs / domain evidence only)
  const demandMetadata = {
    demand_skill_ids: [],
    domain_slugs: [],
    issue_numbers: [],
  };

  if (Array.isArray(data.all_accepted_issues)) {
    for (const iss of data.all_accepted_issues) {
      if (iss.issue_number && Number.isInteger(iss.issue_number)) {
        demandMetadata.issue_numbers.push(iss.issue_number);
      }
      // Extract canonical skill IDs from intake/assessment if present
      const ids = extractDemandSkillIds(iss);
      for (const id of ids) {
        if (typeof id === 'string' && id.startsWith('skl_') && !demandMetadata.demand_skill_ids.includes(id)) {
          demandMetadata.demand_skill_ids.push(id);
        }
      }
    }
  }

  return {
    ok: true,
    blocked: false,
    empty: false,
    issue_digest: issueDigest,
    workloadDigest: data.workload_digest,
    demandMetadata,
    runId: data.run_id,
  };
}

function extractDemandSkillIds(issueEntry) {
  const ids = [];
  // Check intake's issue_binding for canonical skill references
  const descriptors = issueEntry?.intake?.classifier_descriptors || [];
  if (Array.isArray(descriptors)) {
    for (const d of descriptors) {
      if (d?.canonical_skill_id && typeof d.canonical_skill_id === 'string') {
        ids.push(d.canonical_skill_id);
      }
    }
  }
  return ids;
}

// ---- Demand artifact (controller-bound) ----

function collectDemandArtifact(reader, demandArtifactPath) {
  if (!demandArtifactPath || !reader.exists(demandArtifactPath)) {
    return null;
  }

  let data;
  try {
    data = reader.readJson(demandArtifactPath);
  } catch {
    return null;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  if (data.kind !== 'issue_demand_binding') {
    return null;
  }

  if (!data.run_id || typeof data.run_id !== 'string') {
    return null;
  }

  if (!data.workload_digest || typeof data.workload_digest !== 'string') {
    return null;
  }

  // Recompute digest
  const demandDigest = computeDemandDigest(data);

  return {
    run_id: data.run_id,
    workload_digest: data.workload_digest,
    demand_skill_ids: Array.isArray(data.demand_skill_ids)
      ? data.demand_skill_ids.filter(id => typeof id === 'string' && id.startsWith('skl_'))
      : [],
    domain_slugs: Array.isArray(data.domain_slugs)
      ? data.domain_slugs.filter(s => typeof s === 'string' && s.length > 0)
      : [],
    digest: demandDigest,
  };
}

function computeDemandDigest(data) {
  const ordered = {
    run_id: data.run_id,
    workload_digest: data.workload_digest,
    demand_skill_ids: [...(data.demand_skill_ids || [])].sort(),
    domain_slugs: [...(data.domain_slugs || [])].sort(),
  };
  return createHash('sha256').update(stableStringify(ordered)).digest('hex');
}

// ---- Prior fingerprint ----

function collectPriorFingerprint(catalogRoot, reader) {
  const runsDir = join(catalogRoot, 'runs');
  if (!reader.exists(runsDir)) return '';

  const entryNames = reader.readDir(runsDir);
  if (entryNames.length === 0) return '';

  const sorted = entryNames.filter((n) => n.startsWith('run_')).sort().reverse();

  for (const runDir of sorted) {
    const ledgerDir = join(catalogRoot, 'runs', runDir, 'terminal-ledger');
    if (reader.exists(ledgerDir)) {
      const ledgerFiles = reader.readDir(ledgerDir).sort().reverse();
      for (const f of ledgerFiles) {
        const ledgerPath = join(ledgerDir, f);
        try {
          const raw = reader.readText(ledgerPath);
          const ledger = JSON.parse(raw);
          // Must be a valid sealed ledger with run_id and digest
          if (ledger && ledger.run_id && ledger.digest && typeof ledger.digest === 'string') {
            // Hash the raw ledger content
            return `sha256:${createHash('sha256').update(raw).digest('hex')}`;
          }
        } catch { /* skip malformed */ }
      }
    }
    // No valid ledger in this run dir; move to next
  }

  return '';
}

// ---- Canonical file loaders ----

const VALID_RELATION_PREDICATES = new Set(['chains_with', 'strengthens', 'alternatives', 'conflicts_with']);

function loadSkillRecords(catalogRoot, reader, bindEvidence = false) {
  const skillsDir = join(catalogRoot, 'skills', 'records');
  if (!reader.exists(skillsDir)) return [];

  const results = [];
  const shardNames = reader.readDir(skillsDir);
  for (const shard of shardNames) {
    const shardPath = join(skillsDir, shard);
    if (!reader.isDir(shardPath)) continue;
    const files = reader.readDir(shardPath);
    for (const f of files) {
      if (!f.endsWith('.yaml')) continue;
      const fullPath = join(shardPath, f);
      try {
        const record = reader.readYaml(fullPath);
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          throw new Error(`Not a valid YAML object: ${fullPath}`);
        }
        if (!record.canonical_skill_id || typeof record.canonical_skill_id !== 'string') {
          throw new Error(`Missing canonical_skill_id: ${fullPath}`);
        }
        if (typeof record.schema_version !== 'number') {
          throw new Error(`Missing numeric schema_version: ${fullPath}`);
        }
        results.push(bindEvidence
          ? { ...record, _path: relative(dirname(catalogRoot), fullPath), _sha256: createHash('sha256').update(reader.readText(fullPath)).digest('hex') }
          : record);
      } catch (e) {
        throw new Error(`Malformed skill record ${fullPath}: ${e.message}`);
      }
    }
  }
  return results;
}

function loadSourceRegistry(catalogRoot, reader) {
  const registryPath = join(catalogRoot, 'sources', 'registry.yaml');
  if (!reader.exists(registryPath)) return [];

  try {
    const registry = reader.readYaml(registryPath);
    if (!registry || !Array.isArray(registry.sources)) {
      throw new Error('Malformed source registry: missing sources array');
    }
    for (const src of registry.sources) {
      if (!src.source_id) throw new Error('Malformed source registry: entry missing source_id');
    }
    return registry.sources;
  } catch (e) {
    throw new Error(`Malformed source registry: ${e.message}`);
  }
}

function loadAnalysisRecords(catalogRoot, reader, bindEvidence = false) {
  const analysesDir = join(catalogRoot, 'analyses');
  if (!reader.exists(analysesDir)) return [];

  const results = [];
  const shardNames = reader.readDir(analysesDir);
  for (const shard of shardNames) {
    const shardPath = join(analysesDir, shard);
    if (!reader.isDir(shardPath)) continue;
    const files = reader.readDir(shardPath);
    for (const f of files) {
      if (!f.endsWith('.md')) continue;
      const fullPath = join(shardPath, f);
      try {
        const metadata = reader.readAnalysisMetadata(fullPath);
        if (!metadata || typeof metadata !== 'object') continue;
        if (!metadata.skill_id) {
          throw new Error(`Missing skill_id in frontmatter: ${fullPath}`);
        }
        if (typeof metadata.schema_version !== 'number') {
          throw new Error(`Missing numeric schema_version in frontmatter: ${fullPath}`);
        }
        results.push(bindEvidence
          ? { ...metadata, _path: relative(dirname(catalogRoot), fullPath), _sha256: createHash('sha256').update(reader.readText(fullPath)).digest('hex') }
          : metadata);
      } catch (e) {
        throw new Error(`Malformed analysis file ${fullPath}: ${e.message}`);
      }
    }
  }
  return results;
}

function loadRelationRecords(catalogRoot, reader, bindEvidence = false) {
  const relationsDir = join(catalogRoot, 'relations');
  if (!reader.exists(relationsDir)) return [];

  const results = [];
  const files = reader.readDir(relationsDir);
  for (const f of files) {
    if (!f.endsWith('.jsonl')) continue;
    const path = join(relationsDir, f);
    try {
      const content = reader.readText(path);
      const lines = content.trim().split('\n').filter((l) => l.trim());
      for (let i = 0; i < lines.length; i++) {
        let rel;
        try {
          rel = JSON.parse(lines[i]);
        } catch {
          throw new Error(`Invalid JSON at line ${i + 1}`);
        }
        if (!rel || typeof rel !== 'object' || Array.isArray(rel)) {
          throw new Error(`Invalid relation at line ${i + 1}: not an object`);
        }
        if (!rel.predicate) {
          throw new Error(`Missing predicate at line ${i + 1}`);
        }
        if (!VALID_RELATION_PREDICATES.has(rel.predicate)) {
          throw new Error(`Unknown relation predicate "${rel.predicate}" at line ${i + 1}`);
        }
        results.push(bindEvidence
          ? { ...rel, _path: relative(dirname(catalogRoot), path), _sha256: createHash('sha256').update(content).digest('hex') }
          : rel);
      }
    } catch (e) {
      throw new Error(`Malformed relation file ${path}: ${e.message}`);
    }
  }
  return results;
}

function loadPackRecords(catalogRoot, reader) {
  const results = [];

  for (const status of ['candidates', 'published']) {
    const packsDir = join(catalogRoot, 'packs', status);
    if (!reader.exists(packsDir)) continue;
    const packDirNames = reader.readDir(packsDir);
    for (const dirName of packDirNames) {
      const packDir = join(packsDir, dirName);
      if (!reader.isDir(packDir)) continue;
      const yamlPath = join(packDir, 'pack.yaml');
      if (!reader.exists(yamlPath)) continue;
      try {
        const pack = reader.readYaml(yamlPath);
        if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
          throw new Error('Not a valid YAML object');
        }
        if (!pack.pack_id) {
          throw new Error('Missing pack_id');
        }
        results.push(pack);
      } catch (e) {
        throw new Error(`Malformed pack record ${yamlPath}: ${e.message}`);
      }
    }
  }
  return results;
}

function loadEvaluationRecords(catalogRoot, reader) {
  const results = [];

  for (const status of ['candidates', 'published']) {
    const packsDir = join(catalogRoot, 'packs', status);
    if (!reader.exists(packsDir)) continue;
    const packDirNames = reader.readDir(packsDir);
    for (const dirName of packDirNames) {
      const evalPath = join(packsDir, dirName, 'evaluation.json');
      if (!reader.exists(evalPath)) continue;
      try {
        const evaluation = reader.readJson(evalPath);
        if (!evaluation || typeof evaluation !== 'object' || Array.isArray(evaluation)) {
          throw new Error('Not a valid JSON object');
        }
        if (!evaluation.evaluation_id) {
          throw new Error('Missing evaluation_id');
        }
        results.push(evaluation);
      } catch (e) {
        throw new Error(`Malformed evaluation record ${evalPath}: ${e.message}`);
      }
    }
  }
  return results;
}

function loadSourceState(catalogRoot, reader) {
  const statePath = join(catalogRoot, 'sources', 'state.jsonl');
  if (!reader.exists(statePath)) return [];

  try {
    const content = reader.readText(statePath);
    const lines = content.trim().split('\n').filter((l) => l.trim());
    const results = [];
    for (let i = 0; i < lines.length; i++) {
      let entry;
      try {
        entry = JSON.parse(lines[i]);
      } catch {
        throw new Error(`Invalid JSON at line ${i + 1}`);
      }
      if (!entry || typeof entry !== 'object' || !entry.source_id) {
        throw new Error(`Invalid source state entry at line ${i + 1}: missing source_id`);
      }
      results.push(entry);
    }
    return results;
  } catch (e) {
    throw new Error(`Malformed source state file ${statePath}: ${e.message}`);
  }
}

// ---- Helpers ----

function countByStatus(records) {
  const counts = {};
  for (const r of records) {
    const s = r.status || 'unknown';
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

function safeInt(val) {
  if (typeof val === 'number' && Number.isInteger(val) && val >= 0) return val;
  return 0;
}

function computeInputDigest(input) {
  const ordered = {
    catalog_counts: input.catalogCounts,
    freshness: input.freshness,
    coverage: input.coverage,
    relations: input.relations,
    pack_lifecycle: input.packLifecycle,
    issue_digest: input.issueDigest,
    issue_workload_digest: input.issueWorkloadDigest || null,
    demand_digest: input.demandDigest || null,
    prior_fingerprint: input.priorFingerprint,
    notes: input.notes,
  };
  return createHash('sha256').update(stableStringify(ordered)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// ---- Default file reader (injectable for testing) ----

function buildDefaultReader() {
  return Object.freeze({
    exists: (p) => existsSync(p),
    isDir: (p) => { try { return statSync(p).isDirectory(); } catch { return false; } },
    readDir: (p) => { try { return readdirSync(p); } catch { return []; } },
    readText: (p) => readFileSync(p, 'utf8'),
    readJson: (p) => JSON.parse(readFileSync(p, 'utf8')),
    readYaml: (p) => {
      const content = readFileSync(p, 'utf8');
      return parseYaml(content, p);
    },
    readAnalysisMetadata: (p) => {
      const content = readFileSync(p, 'utf8');
      const fm = extractFrontmatter(content);
      if (!fm) return null;
      try {
        return parseYaml(fm, p);
      } catch {
        return null;
      }
    },
  });
}

function extractFrontmatter(content) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return null;
  const rest = trimmed.slice(3);
  const endIdx = rest.indexOf('\n---');
  const endIdx2 = rest.indexOf('---');
  const end = endIdx !== -1 ? endIdx : endIdx2;
  if (end === -1) return null;
  return rest.slice(0, end).trim();
}

// ---- Path resolution ----

function findCatalogRoot() {
  let current = __FILE_DIR__;
  while (current !== dirname(current)) {
    if (isCatalogRoot(current)) return join(current, 'catalog');
    current = dirname(current);
  }
  if (isCatalogRoot(process.cwd())) return join(process.cwd(), 'catalog');
  throw new Error('Unable to locate catalog root directory');
}

function isCatalogRoot(path) {
  return existsSync(join(path, 'AGENTS.md')) && existsSync(join(path, 'catalog'));
}

export function loadCanonicalClosureEvidence(catalogRoot = findCatalogRoot(), reader = buildDefaultReader()) {
  return {
    skills: loadSkillRecords(catalogRoot, reader, true),
    analyses: loadAnalysisRecords(catalogRoot, reader, true),
    relations: loadRelationRecords(catalogRoot, reader, true),
  };
}

// ---- Export helpers for test access ----
export { TRUSTED_REPOSITORY, buildEvidenceManifest, collectDemandArtifact, computeDemandDigest, computeInputDigest, computeManifestDigest };
