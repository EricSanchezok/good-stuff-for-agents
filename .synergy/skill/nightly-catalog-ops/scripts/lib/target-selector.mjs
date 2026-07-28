/**
 * Target-first intent selection — hardened.
 *
 * Only two sources of intent are allowed:
 *   1. Controller-bound Issue demand (exact run_id/workload_digest binding, canonical skill IDs, domain slugs)
 *   2. Concrete relation component/domain evidence from immutable snapshot
 *
 * No synthetic intents. No cold-start, workflow-automation, integration, or
 * catalog-wide backfill from counts alone. Zero eligible evidence => zero
 * intents or explicit no_pack_clean.
 *
 * Constraints:
 *  - Max 2 intent targets per run.
 *  - Each intent carries a domain, seed skill IDs, and a selection reason.
 *  - Max 50 analysis budget per intent.
 */
export function selectTargetIntents({
  coverage,
  relations,
  packLifecycle,
  catalogCounts,
  issueDemandMetadata,
  maxTargets = 2,
  maxBudgetPerIntent = 50,
} = {}) {
  const intents = [];
  const hasExplicitDemand =
    issueDemandMetadata &&
    (issueDemandMetadata.demand_skill_ids?.length > 0 ||
     issueDemandMetadata.domain_slugs?.length > 0);

  // 1. Controller-bound Issue demand: highest priority
  if (hasExplicitDemand) {
    const demandIds = issueDemandMetadata.demand_skill_ids || [];
    const domainSlugs = issueDemandMetadata.domain_slugs || [];

    const domain = domainSlugs.length > 0 ? domainSlugs[0] : 'demand';
    const budget = Math.min(
      maxBudgetPerIntent,
      Math.max(1, demandIds.length)
    );

    intents.push({
      domain,
      reason: `Controller-bound demand: ${demandIds.length} explicit skill IDs, domains: ${domainSlugs.join(', ') || 'none'}`,
      source: 'issue_demand',
      score: 0.95,
      seed_skill_ids: demandIds.slice(0, budget),
      max_analysis_budget: budget,
    });

    // Domain hints as a second intent if available & distinct
    if (domainSlugs.length > 1 && intents.length < maxTargets) {
      const secondDomain = domainSlugs[1];
      intents.push({
        domain: secondDomain,
        reason: `Controller-bound domain hint: ${secondDomain}`,
        source: 'issue_domain_hint',
        score: 0.85,
        seed_skill_ids: [],
        max_analysis_budget: Math.min(maxBudgetPerIntent, 50),
      });
    }
  }

  // 2. Concrete relation component evidence — chains/alternatives/conflicts
  if (intents.length < maxTargets && relations) {
    // Only create relation-based intents from real evidence, not from zero counts
    const hasChains = (relations.chains_count || 0) > 0;
    const hasAlternatives = (relations.alternatives_count || 0) > 0;
    const hasConflicts = (relations.conflicts_count || 0) > 0;

    // Chains = composition evidence, scoped to chains_with predicate domain
    if (hasChains && intents.length < maxTargets) {
      intents.push({
        domain: detectChainDomain(relations),
        reason: `${relations.chains_count} chains_with relations — concrete composition evidence`,
        source: 'relation_chains',
        score: Math.min(0.8, relations.chains_count / Math.max(1, relations.total_edges || 1)),
        seed_skill_ids: [],
        max_analysis_budget: Math.min(maxBudgetPerIntent, relations.chains_count),
      });
    }

    // Alternatives/conflicts = resolution evidence
    if ((hasAlternatives || hasConflicts) && intents.length < maxTargets) {
      intents.push({
        domain: 'coverage-resolution',
        reason: `${relations.alternatives_count || 0} alternatives, ${relations.conflicts_count || 0} conflicts — resolution evidence`,
        source: 'unresolved_relations',
        score: Math.min(0.7, ((relations.alternatives_count || 0) + (relations.conflicts_count || 0)) / Math.max(1, relations.total_edges || 1)),
        seed_skill_ids: [],
        max_analysis_budget: Math.min(maxBudgetPerIntent, (relations.alternatives_count || 0) + (relations.conflicts_count || 0)),
      });
    }
  }

  // 3. No eligible evidence => zero intents
  if (intents.length === 0) {
    return {
      intents: [],
      total: 0,
      max_targets: maxTargets,
      capped: false,
      reason: 'no_eligible_evidence',
      has_demand: false,
    };
  }

  // Cap at max intents
  const capped = intents.length > maxTargets;
  const final = intents.slice(0, maxTargets);

  return {
    intents: final,
    total: final.length,
    max_targets: maxTargets,
    capped,
    has_demand: hasExplicitDemand,
  };
}

function detectChainDomain(relations) {
  const bp = relations.by_predicate || {};
  const chains = bp.chains_with || 0;
  if (chains > 10) return 'workflow-composition';
  if (chains > 3) return 'skill-chain';
  return 'composition';
}
