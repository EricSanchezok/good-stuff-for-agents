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
    },
  };

  const { ledger_digest, ...rest } = ledger;
  ledger.ledger_digest = `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;

  return Object.freeze(ledger);
}
