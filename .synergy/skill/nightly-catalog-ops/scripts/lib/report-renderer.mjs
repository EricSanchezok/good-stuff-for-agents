/**
 * Deterministic report renderer.
 *
 * All reports, summaries, and manifests are rendered entirely from:
 *  - run-context (immutable snapshot of catalog state)
 *  - terminal ledger (computed terminal states)
 *
 * No hand-written summaries. No duplicate code paths.
 */
export function renderRunReport({ runContext, terminalLedger, finalGate, intents }) {
  const lines = [];

  // Header
  lines.push('# Nightly Catalog Run Report');
  lines.push('');
  lines.push(`**Run ID**: ${runContext.run_id}`);
  lines.push(`**Timestamp**: ${runContext.timestamp}`);
  lines.push(`**Ledger ID**: ${terminalLedger.ledger_id}`);
  lines.push('');

  // Run Context Summary
  lines.push('## Run Context');
  lines.push('');
  lines.push(`- Snapshot: ${runContext.snapshot_id}`);
  lines.push(`- Prior fingerprint: ${runContext.prior_fingerprint || 'none'}`);
  lines.push(`- Digest: ${runContext.digest}`);
  lines.push('');

  // Catalog Counts
  lines.push('### Catalog Counts');
  lines.push('');
  const cc = runContext.catalog_counts;
  lines.push(`- Sources: ${cc.sources.total} total (${cc.sources.active} active, ${cc.sources.candidate} candidate)`);
  lines.push(`- Skills: ${cc.skills.total} total (${cc.skills.active} active, ${cc.skills.candidate} candidate)`);
  lines.push(`- Analyses: ${cc.analyses.total || 0} total`);
  lines.push(`- Relations: ${cc.relations.total || 0} total`);
  lines.push(`- Packs: ${cc.packs.total || 0} total (${cc.packs.candidate || 0} candidate, ${cc.packs.published || 0} published)`);
  lines.push(`- Evaluations: ${cc.evaluations.total || 0} total`);
  lines.push(`- Issues: ${cc.issues.total || 0} total`);
  lines.push('');

  // Freshness
  lines.push('### Freshness');
  lines.push('');
  const f = runContext.freshness;
  lines.push(`- Sources stale: ${f.sources_stale_count}`);
  lines.push(`- Skills stale: ${f.skills_stale_count}`);
  lines.push(`- Analyses stale: ${f.analyses_stale_count}`);
  if (f.oldest_stale_iso) lines.push(`- Oldest stale: ${f.oldest_stale_iso}`);
  if (f.freshness_cutoff) lines.push(`- Cutoff: ${f.freshness_cutoff}`);
  lines.push('');

  // Coverage
  lines.push('### Coverage');
  lines.push('');
  const cov = runContext.coverage;
  lines.push(`- Skills with analysis: ${cov.skills_with_analysis}`);
  lines.push(`- Skills without analysis: ${cov.skills_without_analysis}`);
  lines.push(`- Coverage ratio: ${(cov.coverage_ratio * 100).toFixed(1)}%`);
  if (cov.active_skills_with_analysis !== undefined) {
    lines.push(`- Active skills with analysis: ${cov.active_skills_with_analysis}`);
  }
  lines.push('');

  // Relations
  lines.push('### Relations');
  lines.push('');
  const rel = runContext.relations;
  lines.push(`- Total edges: ${rel.total_edges}`);
  lines.push(`- Chains: ${rel.chains_count}, Strengthens: ${rel.strengthens_count}, Alternatives: ${rel.alternatives_count}, Conflicts: ${rel.conflicts_count}`);
  lines.push('');

  // Pack Lifecycle
  lines.push('### Pack Lifecycle');
  lines.push('');
  const pl = runContext.pack_lifecycle;
  lines.push(`- Candidates: ${pl.total_candidate}`);
  lines.push(`- Published: ${pl.total_published}`);
  lines.push(`- New since last run: ${pl.new_since_last_run}`);
  lines.push(`- Stale packs: ${pl.stale_packs}`);
  lines.push(`- Promoted this run: ${pl.promoted_this_run}`);
  lines.push(`- Rejected this run: ${pl.rejected_this_run}`);
  lines.push('');

  // Issue Digest
  lines.push('### Issue Digest');
  lines.push('');
  const id = runContext.issue_digest;
  lines.push(`- Open: ${id.open}, Acknowledged: ${id.acknowledged}, Fulfilled: ${id.fulfilled}, Blocked: ${id.blocked}`);
  lines.push('');

  // Target Intents
  if (intents && intents.intents && intents.intents.length > 0) {
    lines.push('## Target Intents');
    lines.push('');
    for (let i = 0; i < intents.intents.length; i++) {
      const intent = intents.intents[i];
      lines.push(`### Intent ${i + 1}: ${intent.domain}`);
      lines.push(`- Source: ${intent.source}`);
      lines.push(`- Score: ${intent.score.toFixed(3)}`);
      lines.push(`- Reason: ${intent.reason}`);
      lines.push(`- Analysis budget: ${intent.max_analysis_budget}`);
      lines.push('');
    }
  } else {
    lines.push('## Target Intents');
    lines.push('');
    lines.push('_No intents selected_');
    lines.push('');
  }

  // Terminal Ledger: Outcomes by category
  lines.push('## Terminal Ledger');
  lines.push('');
  lines.push(`**Run Outcome**: \`${terminalLedger.run_outcome.status}\``);
  lines.push('');
  lines.push(`> ${terminalLedger.run_outcome.summary}`);
  lines.push('');

  lines.push(`Total actions: ${terminalLedger.run_outcome.total_actions}`);
  lines.push(`Errors: ${terminalLedger.run_outcome.errors || 0}`);
  lines.push(`Warnings: ${terminalLedger.run_outcome.warnings || 0}`);
  lines.push('');

  renderOutcomeSection(lines, 'Source Outcomes', terminalLedger.source_outcomes);
  renderOutcomeSection(lines, 'Skill Outcomes', terminalLedger.skill_outcomes);
  renderOutcomeSection(lines, 'Relation Outcomes', terminalLedger.relation_outcomes);
  renderOutcomeSection(lines, 'Pack Outcomes', terminalLedger.pack_outcomes);
  renderOutcomeSection(lines, 'Issue Outcomes', terminalLedger.issue_outcomes);

  // Final Gate
  if (finalGate) {
    lines.push('## Final Gate');
    lines.push('');
    lines.push(`**Decision**: \`${finalGate.decision}\``);
    lines.push(`**Gate ID**: ${finalGate.gate_id}`);
    lines.push('');

    for (const check of finalGate.checks) {
      const icon = check.passed ? '✓' : '✗';
      lines.push(`- ${icon} **${check.name}**: ${check.details}`);
    }
    lines.push('');

    if (finalGate.errors.length > 0) {
      lines.push('### Gate Errors');
      for (const error of finalGate.errors) {
        lines.push(`- \`${error}\``);
      }
      lines.push('');
    }
    if (finalGate.warnings.length > 0) {
      lines.push('### Gate Warnings');
      for (const warning of finalGate.warnings) {
        lines.push(`- ${warning}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n') + '\n';
}

function renderOutcomeSection(lines, title, outcomes) {
  if (!outcomes || outcomes.length === 0) {
    lines.push(`### ${title}`);
    lines.push('');
    lines.push('_No outcomes_');
    lines.push('');
    return;
  }

  lines.push(`### ${title} (${outcomes.length})`);
  lines.push('');
  for (const entry of outcomes) {
    const extra = [entry.detail, entry.error_code].filter(Boolean).join(' | ');
    const extraSuffix = extra ? ` — ${extra}` : '';
    lines.push(`- **${entry.entity_id}**: \`${entry.state}\`${extraSuffix}`);
  }
  lines.push('');
}

/**
 * Render a JSON summary for machine consumption.
 */
export function renderRunSummaryJson({ runContext, terminalLedger, finalGate, intents }) {
  return JSON.stringify({
    schema_version: 3,
    run_id: runContext.run_id,
    ledger_id: terminalLedger.ledger_id,
    context_digest: runContext.digest,
    ledger_digest: terminalLedger.digest,
    timestamp: terminalLedger.timestamp,
    run_outcome: terminalLedger.run_outcome,
    gate: {
      gate_id: finalGate.gate_id,
      decision: finalGate.decision,
      passed: finalGate.passed,
      errors: finalGate.errors,
      warnings: finalGate.warnings,
    },
    intents: intents ? intents.intents.map((intent) => ({
      domain: intent.domain,
      source: intent.source,
      reason: intent.reason,
      score: intent.score,
      seed_skill_ids: intent.seed_skill_ids,
      max_analysis_budget: intent.max_analysis_budget,
    })) : [],
    outcome_counts: {
      sources: terminalLedger.source_outcomes.length,
      skills: terminalLedger.skill_outcomes.length,
      relations: terminalLedger.relation_outcomes.length,
      packs: terminalLedger.pack_outcomes.length,
      issues: terminalLedger.issue_outcomes.length,
    },
  }, null, 2) + '\n';
}
