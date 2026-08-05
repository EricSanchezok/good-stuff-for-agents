/**
 * Cold-start intent selector — evidence-watermark-driven.
 *
 * Produces at most 2 intents from canonical evidence gaps:
 *   1. Synced snapshot artifacts with no extractions
 *   2. Candidates not yet normalized
 *   3. Normalized skills without analysis
 *   4. Same-domain group ≥2 analyses without relations
 *   5. Issue demand gaps
 *
 * Each intent carries a domain, seed skill IDs, and a selection reason.
 * Seed IDs MUST be non-empty when the gap is known; zero seed IDs for
 * intents derived from aggregate counts is rejected.
 *
 * No synthetic intents. Zero eligible evidence => zero intents.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { buildEvidenceIndex } from './evidence-index-builder.mjs';
import { parseYaml } from '../../../catalog-data/scripts/lib/catalog-lib.mjs';
import { backlogToIntents } from './growth-backlog.mjs';

export function selectTargetIntentsColdStart({
  coverage,
  relations,
  packLifecycle,
  catalogCounts,
  issueDemandMetadata,
  evidenceIndex,
  maxTargets = 2,
  catalogRoot,
  reader,
  _parseYaml,
  backlog,
} = {}) {
  const intents = [];
  const seenSeeds = new Set();
  const yamlParser = _parseYaml || parseYaml;

  // Build evidence index if not provided
  const index = evidenceIndex || buildEvidenceIndex({ catalogRoot, reader });

  const hasExplicitDemand =
    issueDemandMetadata &&
    (issueDemandMetadata.demand_skill_ids?.length > 0 ||
     issueDemandMetadata.domain_slugs?.length > 0);

  // 0. Cross-run growth backlog: highest priority (carry unresolved dimensions forward)
  let backlogUsed = 0
  if (backlog && backlog.entries && backlog.entries.length > 0 && intents.length < maxTargets) {
    const backlogIntents = backlogToIntents({ backlog, maxTargets: maxTargets - intents.length })
    for (const intent of backlogIntents) {
      const seeds = (intent.seed_skill_ids || []).filter(s => !seenSeeds.has(s))
      if (seeds.length > 0) {
        intent.seed_skill_ids = seeds
        intents.push(intent)
        seeds.forEach(s => seenSeeds.add(s))
        backlogUsed++
      }
    }
  }

  // 1. Issue demand: highest priority (Controller-bound)
  if (hasExplicitDemand && intents.length < maxTargets) {
    const demandIds = issueDemandMetadata.demand_skill_ids || [];
    const domainSlugs = issueDemandMetadata.domain_slugs || [];
    const seeds = demandIds.filter(id => typeof id === 'string' && id.startsWith('skl_')).filter(s => !seenSeeds.has(s));
    if (seeds.length > 0) {
      const domain = domainSlugs.length > 0 ? domainSlugs[0] : 'demand';

      // Demand→source-discovery gap marking: check if demand seeds have zero coverage
      const skillIdsWithAnalysis = new Set()
      if (index.skill_ids_with_analysis_count > 0) {
        // Collect skill_ids from index if available; otherwise infer from analysis frontmatter
        try {
          const analysesDir = catalogRoot ? join(catalogRoot, 'analyses') : null
          if (analysesDir && reader && reader.exists(analysesDir)) {
            const shards = reader.readDir(analysesDir)
            for (const shard of shards) {
              const shardPath = join(analysesDir, shard)
              if (!reader.isDir(shardPath)) continue
              const files = reader.readDir(shardPath)
              for (const f of files) {
                if (!f.endsWith('.md')) continue
                try {
                  const content = reader.readText(join(shardPath, f))
                  const fm = extractFrontmatterStatic(content)
                  if (fm) {
                    const parsed = yamlParser(fm, join(shardPath, f))
                    if (parsed && typeof parsed === 'object' && parsed.skill_id) {
                      skillIdsWithAnalysis.add(parsed.skill_id)
                    }
                  }
                } catch {}
              }
            }
          }
        } catch {}
      }

      // Determine if demand seeds are uncovered: none of the demand skill IDs appear in any analysis frontmatter
      const uncoveredSeeds = seeds.filter(s => !skillIdsWithAnalysis.has(s))
      // Crude source-group coverage check: if we have zero snapshots for the implied domain
      const sourceGroupCovered = (index.snapshot_artifact_count || 0) > 0

      let requiresSourceDiscovery = false
      let demandGapReason = null
      if (uncoveredSeeds.length === seeds.length && !sourceGroupCovered) {
        requiresSourceDiscovery = true
        const keywords = seeds.map(s => {
          const parts = typeof s === 'string' ? s.split('_') : []
          if (parts.length >= 3) return parts[1]
          return s
        })
        demandGapReason = `capability_keywords: ${[...new Set(keywords)].join(', ')}`
      }

      const intent = {
        domain,
        reason: `Controller-bound issue demand: ${seeds.length} explicit skill IDs`,
        source: 'issue_demand',
        score: 0.95,
        seed_skill_ids: seeds.slice(0, 50),
        max_analysis_budget: Math.min(50, Math.max(1, seeds.length)),
      }
      if (requiresSourceDiscovery) {
        intent.requires_source_discovery = true
        intent.demand_gap_reason = demandGapReason
      }
      intents.push(intent);
      seeds.forEach(s => seenSeeds.add(s));
    }
  }

  // 2. Unevaluated snapshots → need extraction
  if (index.gap_flags.unevaluated_snapshots && intents.length < maxTargets) {
    const seeds = findSnapshotSkills(index);
    const nonDemandSeeds = seeds.filter(s => !seenSeeds.has(s));
    if (nonDemandSeeds.length > 0) {
      intents.push({
        domain: detectDomainFromSkills(nonDemandSeeds),
        reason: `${index.snapshot_artifact_count} source snapshot(s) without extraction`,
        source: 'snapshot_backlog',
        score: 0.85,
        seed_skill_ids: nonDemandSeeds.slice(0, 50),
        max_analysis_budget: Math.min(50, Math.max(1, nonDemandSeeds.length * 5)),
      });
      nonDemandSeeds.forEach(s => seenSeeds.add(s));
    }
  }

  // 3. Unnormalized candidates → need normalization
  if (index.gap_flags.unnormalized_candidates && intents.length < maxTargets) {
    const seeds = findCandidateSkills(index);
    const nonDemandSeeds = seeds.filter(s => !seenSeeds.has(s));
    if (nonDemandSeeds.length > 0) {
      intents.push({
        domain: detectDomainFromSkills(nonDemandSeeds),
        reason: `${index.candidate_count} unnormalized candidate(s)`,
        source: 'candidate_backlog',
        score: 0.80,
        seed_skill_ids: nonDemandSeeds.slice(0, 50),
        max_analysis_budget: Math.min(50, Math.max(1, nonDemandSeeds.length * 5)),
      });
      nonDemandSeeds.forEach(s => seenSeeds.add(s));
    }
  }

  // 4. Analysis gaps: skills without analysis
  if (index.gap_flags.analysis_gaps && intents.length < maxTargets) {
    const seeds = findSkillsNeedingAnalysis(index, catalogRoot, reader, yamlParser);
    const nonDemandSeeds = seeds.filter(s => !seenSeeds.has(s));
    if (nonDemandSeeds.length > 0) {
      intents.push({
        domain: detectDomainFromSkills(nonDemandSeeds),
        reason: `${index.skill_record_count - index.skill_ids_with_analysis_count} skill(s) without analysis`,
        source: 'analysis_backlog',
        score: 0.75,
        seed_skill_ids: nonDemandSeeds.slice(0, 50),
        max_analysis_budget: Math.min(50, Math.max(1, nonDemandSeeds.length * 3)),
      });
      nonDemandSeeds.forEach(s => seenSeeds.add(s));
    }
  }

  // 5. Relation potential: ≥2 analyses in same functional group, no relations
  if (index.gap_flags.relation_potential && intents.length < maxTargets) {
    const seeds = findSkillsNeedingRelations(index, catalogRoot, reader, yamlParser);
    const nonDemandSeeds = seeds.filter(s => !seenSeeds.has(s));
    if (nonDemandSeeds.length > 0) {
      intents.push({
        domain: detectDomainFromSkills(nonDemandSeeds),
        reason: `${index.analysis_count} analyses, ${index.gap_flags.same_domain_group_count} domain group(s), no relations`,
        source: 'relation_backlog',
        score: 0.70,
        seed_skill_ids: nonDemandSeeds.slice(0, 50),
        max_analysis_budget: Math.min(50, Math.max(1, nonDemandSeeds.length * 3)),
      });
    }
  }

  // Cap at maxTargets
  const capped = intents.length > maxTargets;
  const final = intents.slice(0, maxTargets);

  // Assertion: all intents must have non-empty seed_skill_ids
  for (const intent of final) {
    if (!intent.seed_skill_ids || intent.seed_skill_ids.length === 0) {
      throw new Error(`invariant: intent seed_skill_ids must be non-empty (source=${intent.source}, domain=${intent.domain})`);
    }
  }

  return {
    intents: final,
    total: final.length,
    max_targets: maxTargets,
    capped,
    has_demand: hasExplicitDemand,
    evidence_index: index,
    reason: final.length === 0 ? 'no_eligible_evidence' : undefined,
    backlog_used: backlogUsed,
  };
}

// -- Helpers --

function detectDomainFromSkills(skillIds) {
  if (skillIds.length === 0) return 'unclassified';
  // Look for domain from catalog records if catalogRoot/reader available
  // Fallback: use the canonical skill ID prefix as a stable domain indicator
  const sklId = skillIds[0];
  if (typeof sklId === 'string' && sklId.startsWith('skl_')) {
    const parts = sklId.split('_');
    // skl_<domain-hint>_<random> → use middle part if available
    if (parts.length >= 3) return parts[1];
  }
  return 'unclassified';
}

function findSnapshotSkills(index) {
  return index.snapshot_digest ? [`snp_${index.snapshot_digest.slice(0, 12)}`] : [];
}

function findCandidateSkills(index) {
  return index.candidate_digest ? [`cnd_${index.candidate_digest.slice(0, 12)}`] : [];
}

function findSkillsNeedingAnalysis(index, catalogRoot, reader, parseYamlFn) {
  const result = [];
  if (!catalogRoot || !reader) return result;
  try {
    const recordsDir = join(catalogRoot, 'skills', 'records');
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
            const record = parseYamlFn(content, path);
            if (record && typeof record === 'object' && record.canonical_skill_id) {
              result.push(record.canonical_skill_id);
            }
          } catch { /* skip */ }
          if (result.length >= 50) break;
        }
        if (result.length >= 50) break;
      }
    }
  } catch { /* safe fallthrough */ }
  return result.slice(0, 50);
}

function findSkillsNeedingRelations(index, catalogRoot, reader, parseYamlFn) {
  const seenSkills = new Set();
  if (!catalogRoot || !reader) return [...seenSkills];
  try {
    const analysesDir = join(catalogRoot, 'analyses');
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
            const fm = extractFrontmatterStatic(content);
            if (fm) {
              const parsed = parseYamlFn(fm, path);
              if (parsed && typeof parsed === 'object' && parsed.skill_id) {
                seenSkills.add(parsed.skill_id);
              }
            }
          } catch { /* skip */ }
        }
      }
    }
  } catch { /* safe fallthrough */ }
  return [...seenSkills].slice(0, 50);
}

function extractFrontmatterStatic(content) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return null;
  const rest = trimmed.slice(3);
  const endIdx = rest.indexOf('\n---');
  const end = endIdx !== -1 ? endIdx : rest.indexOf('---');
  if (end === -1) return null;
  return rest.slice(0, end).trim();
}
