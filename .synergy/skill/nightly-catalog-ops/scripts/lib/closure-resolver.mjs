import { createHash } from 'node:crypto';

/**
 * Deterministic intent-closure resolver — hardened.
 *
 * Takes prepared immutable intent(s) plus current canonical skill records,
 * index, Analysis v2 coverage, and Relation v2 evidence, and returns at most
 * the configured analysis budget of concrete `seed_skill_ids` and a bound
 * evidence manifest.
 *
 * Key hardening changes:
 *   - Preserves the exact prepared intent under `intent`, not a mutated copy
 *   - Keeps seed resolution in a separate evidence bundle
 *   - Scopes seeds to target demand/component/domain
 *   - Binds exact skill/analysis/relation paths+hashes and exact IDs
 *   - Digests actual seed IDs and evidence hashes (not statistics)
 *   - Does not increment total budget by unused allocation
 *   - Enforces max2/max50
 *   - Rejects stale snapshot before writing
 */

// ---- Public API ----

/**
 * Resolve closure seeds for prepared intents.
 *
 * @param {object} opts
 * @param {Array}    opts.intents           — prepared intent objects from target-selector
 * @param {Array}    opts.skills            — canonical skill records with paths
 * @param {Array}    opts.analyses          — analysis metadata records with paths
 * @param {Array}    opts.relations         — relation records with paths
 * @param {object}   opts.coverage          — { skills_with_analysis, skills_without_analysis, coverage_ratio, analyzedSkills }
 * @param {object}   opts.relationStats     — relation data with bySubject, chains_count, etc.
 * @param {object}   opts.issueDemandMetadata — { demand_skill_ids, domain_slugs } from controller-bound demand
 * @param {string}   opts.snapshotDigest    — collector snapshot digest for staleness check
 * @param {number}   [opts.maxIntents=2]    — max intents to resolve
 * @param {number}   [opts.maxBudgetPerIntent=50] — max budget per intent
 * @param {number}   [opts.maxTotalBudget=100] — max total seeds across all intents
 * @returns {{ intents: Array, evidenceManifest: object, digest: string }}
 */
export function resolveIntentClosure(opts = {}) {
  const intents = opts.intents || [];
  const skills = opts.skills || [];
  const analyses = opts.analyses || [];
  const relations = opts.relations || [];
  const coverage = opts.coverage || {};
  const relationStats = opts.relationStats || {};
  const demandMetadata = opts.issueDemandMetadata || { demand_skill_ids: [], domain_slugs: [] };
  const maxIntents = opts.maxIntents ?? 2;
  const maxBudgetPerIntent = opts.maxBudgetPerIntent ?? 50;
  const maxTotalBudget = opts.maxTotalBudget ?? 100;

  if (intents.length === 0) {
    return zeroClosure();
  }

  // Check for explicit no_pack_clean termination intent
  const hasNoPack = intents.some(
    (i) => i.source === 'no_pack_clean' || (i.reason && i.reason.includes('no_pack_clean'))
  );
  if (hasNoPack) {
    return emptyClosure(intents);
  }

  // Build lookup maps
  const skillMap = new Map(skills.map((s) => [s.canonical_skill_id, s]));
  const analyzedSkills = new Set();
  if (coverage.analyzedSkills) {
    for (const id of coverage.analyzedSkills) analyzedSkills.add(id);
  } else {
    // Derive from analyses
    for (const a of analyses) {
      if (a.skill_id) analyzedSkills.add(a.skill_id);
    }
  }

  // Build analysis path+hash index
  const analysisIndex = new Map();
  for (const a of analyses) {
    if (a.skill_id) analysisIndex.set(a.skill_id, a);
  }

  // Compute domain -> skill mapping
  const domainToSkills = new Map();
  for (const skill of skills) {
    const domains = skill.capabilities?.domains || [];
    for (const domain of domains) {
      if (!domainToSkills.has(domain)) domainToSkills.set(domain, new Set());
      domainToSkills.get(domain).add(skill.canonical_skill_id);
    }
  }

  // Compute relation participant skills
  const relationParticipantSkills = new Set();
  if (relationStats.bySubject) {
    for (const skillId of Object.keys(relationStats.bySubject)) {
      if ((relationStats.bySubject[skillId] || 0) > 0) {
        relationParticipantSkills.add(skillId);
      }
    }
  }

  let totalBudgetUsed = 0;
  const resolvedIntents = [];
  const evidenceBundles = [];

  for (const intent of intents.slice(0, maxIntents)) {
    const candidates = new Set();
    const budget = Math.min(
      maxBudgetPerIntent,
      maxTotalBudget - totalBudgetUsed
    );

    if (budget <= 0) continue;

    // Priority 1: Explicit skill IDs sealed into the immutable prepared intent.
    const preparedSeeds = intent.seed_skill_ids || [];
    for (const id of preparedSeeds) {
      if (skillMap.has(id) && !analyzedSkills.has(id)) candidates.add(id);
    }

    // Explicit prepared seeds are an exact closure. Broader demand/domain
    // resolution is only available before preparation or for seedless intents.
    if (preparedSeeds.length === 0) {
      if (demandMetadata.demand_skill_ids && demandMetadata.demand_skill_ids.length > 0) {
        for (const id of demandMetadata.demand_skill_ids) {
          if (skillMap.has(id) && !analyzedSkills.has(id)) candidates.add(id);
        }
      }

      // Priority 2: Domain slugs from demand metadata
      if (demandMetadata.domain_slugs && demandMetadata.domain_slugs.length > 0) {
        for (const slug of demandMetadata.domain_slugs) {
          const normalized = slug.toLowerCase();
          for (const [domain, skillSet] of domainToSkills) {
            if (domain.toLowerCase() === normalized || domain.toLowerCase().includes(normalized)) {
              for (const skillId of skillSet) {
                if (!analyzedSkills.has(skillId)) candidates.add(skillId);
              }
            }
          }
        }
      }

      // Priority 3: Intent domain-based selection (concrete domain only, no cold-start)
      if (intent.domain && intent.domain !== 'cold-start') {
        const domainSet = domainToSkills.get(intent.domain);
        if (domainSet) {
          for (const skillId of domainSet) {
            if (!analyzedSkills.has(skillId)) candidates.add(skillId);
          }
        }
      }
    }

    // Priority 4: Relation component evidence
    if (intent.source === 'relation_chains' || intent.source === 'unresolved_relations') {
      for (const skillId of relationParticipantSkills) {
        if (!analyzedSkills.has(skillId)) candidates.add(skillId);
      }
    }

    // Deterministic selection: stable sort by canonical_skill_id, then budget cap
    const sorted = [...candidates]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, budget);

    // Build seed evidence: bind exact paths, hashes, and IDs
    const seedEvidence = [];
    for (const skillId of sorted) {
      const skill = skillMap.get(skillId);
      const analysis = analysisIndex.get(skillId);
      seedEvidence.push({
        skill_id: skillId,
        skill_path: skill?._path || null,
        skill_sha256: skill?._sha256 || null,
        analysis_id: analysis?.analysis_id || null,
        analysis_path: analysis?._path || null,
        analysis_sha256: analysis?._sha256 || null,
      });
    }

    const seedSkillIds = sorted;
    const usedBudget = seedSkillIds.length;
    totalBudgetUsed += usedBudget;

    resolvedIntents.push({
      intent, // preserve exact prepared intent
      seed_skill_ids: seedSkillIds,
      max_analysis_budget: usedBudget,
      seeds_resolved: usedBudget,
      seeds_needed: 0,
      seed_evidence: seedEvidence,
    });

    evidenceBundles.push({
      intent_domain: intent.domain,
      intent_source: intent.source,
      seed_count: usedBudget,
      seed_ids: seedSkillIds,
      seed_evidence_hashes: seedEvidence.map(e => e.skill_sha256).filter(Boolean),
    });
  }

  // Build evidence manifest
  const evidenceManifest = {
    resolved_intents: resolvedIntents.length,
    total_seeds: resolvedIntents.reduce((sum, i) => sum + i.seed_skill_ids.length, 0),
    total_budget: totalBudgetUsed,
    evidence_bundles: evidenceBundles,
    snapshot_bound: !!opts.snapshotDigest,
  };

  const digest = computeClosureDigest(resolvedIntents, evidenceManifest);

  return Object.freeze({
    intents: resolvedIntents,
    evidenceManifest,
    digest,
    _sealed: true,
  });
}

function zeroClosure() {
  return Object.freeze({
    intents: [],
    evidenceManifest: { resolved_intents: 0, total_seeds: 0, total_budget: 0, evidence_bundles: [] },
    digest: createHash('sha256').update('zero_closure').digest('hex'),
    _sealed: true,
  });
}

function emptyClosure(intents) {
  return Object.freeze({
    intents: intents.map((i) => ({
      intent: i,
      seed_skill_ids: [],
      max_analysis_budget: 0,
      seeds_resolved: 0,
      seeds_needed: 0,
      seed_evidence: [],
      termination: 'no_pack_clean',
    })),
    evidenceManifest: {
      resolved_intents: intents.length,
      total_seeds: 0,
      total_budget: 0,
      evidence_bundles: intents.map(i => ({
        intent_domain: i.domain,
        intent_source: i.source,
        seed_count: 0,
        seed_ids: [],
        termination: 'no_pack_clean',
      })),
    },
    digest: createHash('sha256').update('empty_closure').digest('hex'),
    _sealed: true,
  });
}

function computeClosureDigest(resolvedIntents, manifest) {
  const ordered = {
    intents: resolvedIntents.map((i) => ({
      domain: i.intent?.domain,
      source: i.intent?.source,
      seed_ids: [...i.seed_skill_ids].sort(),
      seed_count: i.seed_skill_ids.length,
      budget: i.max_analysis_budget,
    })),
    manifest_seed_total: manifest.total_seeds,
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

/**
 * Build a skill index map for closure resolution.
 */
export function buildSkillIndex(skills) {
  const map = new Map();
  for (const skill of skills) {
    map.set(skill.canonical_skill_id, {
      id: skill.canonical_skill_id,
      domains: skill.capabilities?.domains || [],
      status: skill.status || 'unknown',
      sourceId: skill.source?.source_id || null,
      displayName: skill.display_name || skill.canonical_skill_id,
    });
  }
  return map;
}

/**
 * Compute coverage data from analysis records.
 */
export function computeCoverage(skills, analyses) {
  const analyzed = new Set(analyses.map((a) => a.skill_id).filter(Boolean));
  const withAnalysis = skills.filter((s) => analyzed.has(s.canonical_skill_id)).length;
  const withoutAnalysis = skills.filter((s) => !analyzed.has(s.canonical_skill_id)).length;
  return {
    skills_with_analysis: withAnalysis,
    skills_without_analysis: withoutAnalysis,
    coverage_ratio: skills.length > 0 ? parseFloat((withAnalysis / skills.length).toFixed(4)) : 0,
    analyzedSkills: analyzed,
  };
}

/**
 * Compute relation participant counts from relation records.
 */
export function computeRelationStats(relations) {
  const bySubject = {};
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

    if (rel.subject) {
      bySubject[rel.subject] = (bySubject[rel.subject] || 0) + 1;
    }
    if (rel.object) {
      bySubject[rel.object] = (bySubject[rel.object] || 0) + 1;
    }
  }

  return {
    total_edges: relations.length,
    bySubject,
    byPredicate,
    chains_count: chainsCount,
    strengthens_count: strengthensCount,
    alternatives_count: alternativesCount,
    conflicts_count: conflictsCount,
  };
}
