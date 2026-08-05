/**
 * Deterministic evidence-index builder.
 *
 * Reads canonical catalog directories to compute evidence watermark gaps
 * for cold-start intent selection and exhaustion proofs. Never invents
 * counts — everything is derived from actual filesystem state.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { CATALOG } from '../../../catalog-data/scripts/lib/catalog-lib.mjs';

import { parseYaml } from '../../../catalog-data/scripts/lib/catalog-lib.mjs';

/**
 * @param {object} opts
 * @param {string} [opts.catalogRoot]
 * @param {object} [opts.reader]
 * @returns {object} evidence index with gap flags
 */
export function buildEvidenceIndex(opts = {}) {
  const catalogRoot = opts.catalogRoot || CATALOG;
  const reader = opts.reader || buildDefaultReader();
  const repositoryRoot = dirname(catalogRoot);

  const snapshotDir = join(catalogRoot, 'sources', 'snapshots');
  const candidatesDir = join(catalogRoot, 'skills', 'candidates');
  const recordsDir = join(catalogRoot, 'skills', 'records');
  const analysesDir = join(catalogRoot, 'analyses');
  const relationsDir = join(catalogRoot, 'relations');
  const candidatePacksDir = join(catalogRoot, 'packs', 'candidates');
  const publishedPacksDir = join(catalogRoot, 'packs', 'published');

  // Snapshot artifacts: count source snapshot JSON files
  let snapshotArtifactCount = 0;
  let snapshotDigest = '';
  const snapshotHashes = [];
  if (reader.exists(snapshotDir)) {
    const entries = reader.readDir(snapshotDir);
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const path = join(snapshotDir, entry);
      try {
        const content = reader.readText(path);
        const h = createHash('sha256').update(content).digest('hex');
        snapshotHashes.push(h);
        snapshotArtifactCount++;
      } catch { /* skip malformed */ }
    }
  }
  if (snapshotHashes.length > 0) {
    snapshotDigest = createHash('sha256').update(snapshotHashes.sort().join('')).digest('hex');
  }

  // Candidate extraction (JSONL)
  let candidateCount = 0;
  let candidateDigest = '';
  const candidateHashes = [];
  if (reader.exists(candidatesDir)) {
    const files = reader.readDir(candidatesDir);
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue;
      const path = join(candidatesDir, f);
      try {
        const content = reader.readText(path);
        candidateHashes.push(createHash('sha256').update(content).digest('hex'));
        // Count non-empty lines
        candidateCount += content.trim().split('\n').filter(l => l.trim()).length;
      } catch { /* skip malformed */ }
    }
  }
  if (candidateHashes.length > 0) {
    candidateDigest = createHash('sha256').update(candidateHashes.sort().join('')).digest('hex');
  }

  // Skill records: YAML sharded
  let skillRecordCount = 0;
  let skillDigest = '';
  const skillHashes = [];
  if (reader.exists(recordsDir)) {
    const shards = reader.readDir(recordsDir);
    for (const shard of shards) {
      const shardPath = join(recordsDir, shard);
      if (!reader.isDir(shardPath)) continue;
      const files = reader.readDir(shardPath);
      for (const f of files) {
        if (!f.endsWith('.yaml')) continue;
        const path = join(shardPath, f);
        try {
          const content = reader.readText(path);
          skillHashes.push(createHash('sha256').update(content).digest('hex'));
          skillRecordCount++;
        } catch { /* skip malformed */ }
      }
    }
  }
  if (skillHashes.length > 0) {
    skillDigest = createHash('sha256').update(skillHashes.sort().join('')).digest('hex');
  }

  // Analyses: markdown with frontmatter
  let analysisCount = 0;
  let analysisDigest = '';
  const analysisHashes = [];
  const skillIdsWithAnalysis = new Set();
  if (reader.exists(analysesDir)) {
    const shards = reader.readDir(analysesDir);
    for (const shard of shards) {
      const shardPath = join(analysesDir, shard);
      if (!reader.isDir(shardPath)) continue;
      const files = reader.readDir(shardPath);
      for (const f of files) {
        if (!f.endsWith('.md')) continue;
        const path = join(shardPath, f);
        try {
          const content = reader.readText(path);
          analysisHashes.push(createHash('sha256').update(content).digest('hex'));
          analysisCount++;
          // Parse frontmatter for skill_id
          const fm = extractFrontmatter(content);
          if (fm) {
            try {
              const parsed = parseYaml(fm, path);
              if (parsed && typeof parsed === 'object' && parsed.skill_id) {
                skillIdsWithAnalysis.add(parsed.skill_id);
              }
            } catch { /* skip */ }
          }
        } catch { /* skip malformed */ }
      }
    }
  }
  if (analysisHashes.length > 0) {
    analysisDigest = createHash('sha256').update(analysisHashes.sort().join('')).digest('hex');
  }

  // Relations: JSONL
  let relationCount = 0;
  let relationDigest = '';
  const relationHashes = [];
  const relationPredicates = {};
  if (reader.exists(relationsDir)) {
    const files = reader.readDir(relationsDir);
    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue;
      const path = join(relationsDir, f);
      try {
        const content = reader.readText(path);
        relationHashes.push(createHash('sha256').update(content).digest('hex'));
        const lines = content.trim().split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const rel = JSON.parse(line);
            if (rel && rel.predicate) {
              relationPredicates[rel.predicate] = (relationPredicates[rel.predicate] || 0) + 1;
            }
          } catch { /* skip */ }
        }
        relationCount += lines.length;
      } catch { /* skip malformed */ }
    }
  }
  if (relationHashes.length > 0) {
    relationDigest = createHash('sha256').update(relationHashes.sort().join('')).digest('hex');
  }

  // Pack candidates
  let packCandidateCount = 0;
  if (reader.exists(candidatePacksDir)) {
    const packDirs = reader.readDir(candidatePacksDir);
    for (const d of packDirs) {
      if (reader.exists(join(candidatePacksDir, d, 'pack.yaml'))) packCandidateCount++;
    }
  }

  // Pack published
  let packPublishedCount = 0;
  if (reader.exists(publishedPacksDir)) {
    const packDirs = reader.readDir(publishedPacksDir);
    for (const d of packDirs) {
      if (reader.exists(join(publishedPacksDir, d, 'pack.yaml'))) packPublishedCount++;
    }
  }

  // Compute gap flags
  const hasUnevaluatedSnapshots = snapshotArtifactCount > 0 && candidateCount === 0;
  const hasUnnormalizedCandidates = candidateCount > 0 && skillRecordCount === 0;
  const analysisCoverage = skillRecordCount > 0
    ? skillIdsWithAnalysis.size / skillRecordCount
    : 0;
  const hasAnalysisGaps = analysisCoverage < 1.0 && skillRecordCount > 0;
  const sameDomainAnalyses = analysisCount >= 2; // simplified: 2+ analyses exist

  // Domain-level: groups inferred from first 2 chars of skill ID
  const domainGroups = new Set();
  for (const sid of skillIdsWithAnalysis) {
    if (typeof sid === 'string' && sid.length >= 6) {
      domainGroups.add(sid.slice(0, 6));
    }
  }

  const hasRelationPotential = sameDomainAnalyses && domainGroups.size > 0 && relationCount === 0;

  const index = {
    snapshot_artifact_count: snapshotArtifactCount,
    snapshot_digest: snapshotDigest ? `sha256:${snapshotDigest}` : '',
    candidate_count: candidateCount,
    candidate_digest: candidateDigest ? `sha256:${candidateDigest}` : '',
    skill_record_count: skillRecordCount,
    skill_digest: skillDigest ? `sha256:${skillDigest}` : '',
    analysis_count: analysisCount,
    analysis_digest: analysisDigest ? `sha256:${analysisDigest}` : '',
    skill_ids_with_analysis_count: skillIdsWithAnalysis.size,
    analysis_coverage_ratio: parseFloat(analysisCoverage.toFixed(4)),
    relation_count: relationCount,
    relation_digest: relationDigest ? `sha256:${relationDigest}` : '',
    relation_predicate_counts: relationPredicates,
    pack_candidate_count: packCandidateCount,
    pack_published_count: packPublishedCount,
    gap_flags: {
      unevaluated_snapshots: hasUnevaluatedSnapshots,
      unnormalized_candidates: hasUnnormalizedCandidates,
      analysis_gaps: hasAnalysisGaps,
      relation_potential: hasRelationPotential,
      same_domain_group_count: domainGroups.size,
    },
    funnel: {
      snapshots: snapshotArtifactCount,
      candidates: candidateCount,
      skills: skillRecordCount,
      analyses: analysisCount,
      relations: relationCount,
      packs_published: packPublishedCount,
    },
  };

  const ordered = {
    ...index,
    gap_flags: { ...index.gap_flags },
  };
  index.evidence_index_digest = `sha256:${createHash('sha256').update(
    JSON.stringify(ordered, Object.keys(ordered).sort())
  ).digest('hex')}`;

  return index;
}

function extractFrontmatter(content) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return null;
  const rest = trimmed.slice(3);
  const endIdx = rest.indexOf('\n---');
  const end = endIdx !== -1 ? endIdx : rest.indexOf('---');
  if (end === -1) return null;
  return rest.slice(0, end).trim();
}

function buildDefaultReader() {
  return Object.freeze({
    exists: (p) => { try { return existsSync(p); } catch { return false; } },
    isDir: (p) => { try { return statSync(p).isDirectory(); } catch { return false; } },
    readDir: (p) => { try { return readdirSync(p); } catch { return []; } },
    readText: (p) => readFileSync(p, 'utf8'),
  });
}

export { buildDefaultReader };
