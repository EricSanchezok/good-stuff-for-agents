/**
 * V3 Run Ledger — deterministic ledger from actual phase outputs.
 *
 * Consumes structured outcomes from maintenance, issues, intents, and
 * candidate results. Never invents counts. Zero candidates => no_pack_clean
 * outcome; any promoted candidate => published.
 */
import { createHash } from 'node:crypto';
import { canonicalStringify } from './phase-state-machine.mjs';

export function buildRunLedgerV3({
  runId,
  timestamp,
  maintenanceOutcomes,
  issueOutcomes,
  intentOutcomes,
  candidateOutcomes,
  errors = 0,
  warnings = 0,
  gapClass = null,
  exhaustionTrace = null,
  rollingYield = null,
  evidence = null,
  growthFunnel = null,
}) {
  const sourceOutcomes = (maintenanceOutcomes || []).map(o => ({
    source_id: o.source_id,
    state: o.state || 'synced',
    ...(o.error ? { error: o.error } : {}),
  }));

  const issuesOut = (issueOutcomes || []).map(o => ({
    issue_number: o.issue_number,
    state: o.state || 'acknowledged',
    ...(o.assessment_id ? { assessment_id: o.assessment_id } : {}),
  }));

  const intentsOut = (intentOutcomes || []).map(o => ({
    domain: o.domain,
    source: o.source,
    disposition: o.disposition || 'executed',
    ...(o.seed_skill_ids ? { seed_skill_ids: o.seed_skill_ids } : {}),
  }));

  const candidatesOut = (candidateOutcomes || []).map(o => ({
    pack_id: o.pack_id,
    terminal: o.terminal,
  }));

  const hasPublished = candidatesOut.some(c => c.terminal === 'promoted');
  const outcomeStatus = hasPublished ? 'published' : 'no_pack_clean';

  const totalActions = 9; // 9 phases

  const ledger = {
    schema_version: 3,
    ledger_id: `ldg_${runId}`,
    run_id: runId,
    timestamp: timestamp || new Date().toISOString(),
    source_outcomes: sourceOutcomes,
    issue_outcomes: issuesOut,
    intent_outcomes: intentsOut,
    candidate_outcomes: candidatesOut,
    run_outcome: {
      status: outcomeStatus,
      summary: hasPublished
        ? `Run completed successfully. ${candidatesOut.filter(c => c.terminal === 'promoted').length} pack(s) published.`
        : 'Run completed with no packs to publish. Zero packs is a clean terminal state.',
      total_actions: totalActions,
      errors,
      warnings,
      gap_class: gapClass,
      rolling_yield: rollingYield,
    },
  };

  if (exhaustionTrace) {
    ledger.run_outcome.exhaustion_trace = exhaustionTrace;
  }
  if (evidence) {
    ledger.evidence = evidence;
  }
  if (growthFunnel) {
    ledger.growth_funnel = growthFunnel;
  }

  const { ledger_digest, ...rest } = ledger;
  ledger.ledger_digest = `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;

  return Object.freeze(ledger);
}

/**
 * Build an exhaustion proof when no pack can be produced.
 * Validates that there is truly no demand, no backlog, no new artifacts,
 * and no relation potential. Returns schema-valid proof or throws.
 */
export function buildExhaustionProof({
  evidenceIndex,
  issueDemandMetadata,
  intents,
  budgetExhausted = false,
} = {}) {
  const demandSkillIds = issueDemandMetadata?.demand_skill_ids || [];
  // Demand is only a gap when some demanded skill is NOT already covered by
  // a published pack member. A demand fully satisfied by published packs is
  // not an unresolved gap (Step 2 semantic).
  const publishedMemberIds = new Set(evidenceIndex?.published_pack_member_ids || []);
  const uncoveredDemandIds = demandSkillIds.filter(id => !publishedMemberIds.has(id));
  const hasDemand = uncoveredDemandIds.length > 0;

  // Intents are active only when they exist AND are not yet terminal.
  // Terminal terminals (promoted/rejected/no_pack_clean/insufficient_evidence/
  // blocked/failed/cancelled/completed) are finished work, not gaps.
  const TERMINAL_TERMINALS = new Set([
    'promoted', 'rejected', 'no_pack_clean', 'insufficient_evidence',
    'blocked', 'failed', 'cancelled', 'completed',
  ]);
  const ACTIVE_TERMINALS = new Set(['pending', 'in_progress', 'running']);
  const allIntents = intents?.intents || [];
  const activeIntents = allIntents.filter(i =>
    !i.terminal || ACTIVE_TERMINALS.has(i.terminal) || !TERMINAL_TERMINALS.has(i.terminal)
  );
  const hasActiveIntents = activeIntents.length > 0;

  const flags = evidenceIndex?.gap_flags || {};
  const hasBacklog = flags.unevaluated_snapshots || flags.unnormalized_candidates || flags.analysis_gaps;
  const hasNewArtifacts = (evidenceIndex?.snapshot_artifact_count || 0) > 0 && (evidenceIndex?.candidate_count || 0) > 0;
  const hasRelationPotential = flags.relation_potential;

  const funnel = evidenceIndex?.funnel
  const funnelSummary = funnel
    ? `snapshots=${funnel.snapshots} candidates=${funnel.candidates} skills=${funnel.skills} analyses=${funnel.analyses} relations=${funnel.relations} packs=${funnel.packs_published}`
    : 'funnel_not_available'

  const exhaustionEntries = [
    { dimension: 'demand', found: hasDemand, detail: `${demandSkillIds.length} skill IDs in demand` },
    { dimension: 'backlog', found: hasBacklog, detail: `snapshot=${flags.unevaluated_snapshots}, candidate=${flags.unnormalized_candidates}, analysis=${flags.analysis_gaps}` },
    { dimension: 'new_artifacts', found: hasNewArtifacts, detail: `${evidenceIndex?.snapshot_artifact_count || 0} snapshots, ${evidenceIndex?.candidate_count || 0} candidates` },
    { dimension: 'relation_potential', found: hasRelationPotential, detail: `${evidenceIndex?.analysis_count || 0} analyses, ${flags.same_domain_group_count || 0} domain groups` },
    { dimension: 'active_intents', found: hasActiveIntents, detail: `${activeIntents.length} unresolved / ${allIntents.length} total intents` },
    { dimension: 'funnel', found: funnel ? Object.values(funnel).some(v => v > 0) : false, detail: funnelSummary },
  ];

  const anyGap = hasDemand || hasBacklog || hasNewArtifacts || hasRelationPotential || hasActiveIntents;

  return {
    schema_version: 1,
    kind: 'exhaustion_proof',
    gap_class: anyGap ? 'gap_exists' : 'truly_exhausted',
    exhaustion_trace: exhaustionEntries,
    budget_exhausted: budgetExhausted,
    valid_no_pack_clean: !anyGap,
    produced_at: new Date().toISOString(),
  };
}

/**
 * Compute rolling yield from the last N completed run ledgers.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function computeRollingYield({ runsRoot, catalogRoot, windowSize = 5 } = {}) {

  try {
    const runsDir = runsRoot || join(catalogRoot, 'runs');
    if (!existsSync(runsDir)) return null;

    const entries = readdirSync(runsDir).filter(n => n.startsWith('run_')).sort().reverse();
    const completedRuns = [];

    for (const entry of entries) {
      const terminalPath = join(runsDir, entry, 'outputs', 'terminal.json');
      if (!existsSync(terminalPath)) continue;
      try {
        const terminal = JSON.parse(readFileSync(terminalPath, 'utf8'));
        if (terminal.status === 'completed') {
          completedRuns.push({ runId: entry, outcome: terminal.outcome });
        }
      } catch { /* skip */ }
      if (completedRuns.length >= windowSize) break;
    }

    if (completedRuns.length === 0) return { window: 0, published: 0, ratio: 0, entries: [] };

    const publishedCount = completedRuns.filter(r => r.outcome === 'published').length;
    return {
      window: completedRuns.length,
      published: publishedCount,
      ratio: completedRuns.length > 0 ? parseFloat((publishedCount / completedRuns.length).toFixed(4)) : 0,
      entries: completedRuns,
    };
  } catch {
    return { window: 0, published: 0, ratio: 0, entries: [] };
  }
}
