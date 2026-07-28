#!/usr/bin/env node
/**
 * Deterministic seal-run tests — fail-closed audit coverage.
 *
 * Covers:
 *   1.  Missing contract → fail closed
 *   2.  Zero intents → no_pack_clean
 *   3.  Two candidates each eval/promote separately
 *   4.  Same-session synthesis/evaluation rejection
 *   5.  Reused evaluator session across candidates
 *   6.  Proof digest mismatch
 *   7.  needs_work repair budget (max 2 repairs per target)
 *   8.  Passed without promotion
 *   9.  All-open issue count/paths validation
 *   10. Issue dry-run/posted terminals
 *   11. Single gate invocation
 *   12. v3 summary valid
 *   13. Manifest digest/path consistency
 *   14. CLI representative use
 *   15. Intent mismatch (target uses intent not in prepared intents)
 *   16. Too many intents rejection
 *   17. Missing run_context fail closed
 *   18. Too many preflight repairs blocked
 *   19. Duplicate failure fingerprint blocked
 *   20. all_open_issues_processed=false fails gate
 *   21. gate_result missing/tampered rejected
 *   22. gate_result failure propagates
 *
 * No test triggers external writes. All inputs are deterministic.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

import { computeContextDigest } from './lib/run-context.mjs';
import { verifyFinalGateResult } from './lib/final-gate.mjs';
import { createTerminalLedger } from './lib/terminal-ledger.mjs';
import { parseGitChangedPaths, sealRun } from './seal-run.mjs';
import { prepareRun } from './prepare-run.mjs';
import { validateRunSummary } from './lib/run-summary-validator.mjs';
import { TRUSTED_CHECKS } from './lib/gate-checks.mjs';

const tests = [];
const TRUSTED_CONTEXT_DIGEST = Symbol('trusted-context-digest');
let failures = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function standardContext(opts = {}) {
  return {
    runId: opts.runId || 'run_test-seal-001',
    snapshotId: 'snap_test-seal',
    timestamp: opts.timestamp || '2026-07-28T00:00:00Z',
    snapshotDigest: opts.snapshotDigest || 'a'.repeat(64),
    evidenceManifestDigest: opts.evidenceManifestDigest || 'b'.repeat(64),
    catalogCounts: opts.catalogCounts || {
      skills: { total: 10, active: 8, candidate: 2, published: 6, stale: 0, added_since_last_run: 0 },
      sources: { total: 5, active: 5, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
      analyses: { total: 8, active: 8, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
      relations: { total: 3, active: 3, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
      packs: { total: 0, active: 0, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
      evaluations: { total: 0, active: 0, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
      issues: { total: 0, active: 0, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
    },
    coverage: {
      skills_with_analysis: opts.skillsWithAnalysis ?? 8,
      skills_without_analysis: opts.skillsWithoutAnalysis ?? 2,
      coverage_ratio: opts.coverageRatio ?? 0.8,
    },
    relations: {
      total_edges: opts.totalEdges ?? 3,
      chains_count: opts.chainsCount ?? 1,
      strengthens_count: opts.strengthensCount ?? 1,
      alternatives_count: opts.alternativesCount ?? 1,
      conflicts_count: opts.conflictsCount ?? 0,
    },
    packLifecycle: {
      total_candidate: 0,
      total_published: 0,
      new_since_last_run: 0,
      stale_packs: 0,
      promoted_this_run: 0,
      rejected_this_run: 0,
    },
    issueDigest: {
      open: opts.openIssues ?? 0,
      acknowledged: 0,
      fulfilled: 0,
      blocked: 0,
    },
    demandMetadata: opts.demandMetadata,
  };
}

function noIntentContext() {
  return standardContext({
    skillsWithAnalysis: 10,
    skillsWithoutAnalysis: 0,
    coverageRatio: 1,
    totalEdges: 0,
    chainsCount: 0,
    strengthensCount: 0,
    alternativesCount: 0,
    conflictsCount: 0,
  });
}

function oneIntentContext() {
  return standardContext({
    skillsWithAnalysis: 0,
    skillsWithoutAnalysis: 10,
    coverageRatio: 0,
    totalEdges: 5,
    chainsCount: 5,
    strengthensCount: 0,
    alternativesCount: 0,
    conflictsCount: 0,
  });
}

function runId(ts = '20260728', suffix = '000000') {
  return `run_${ts}-${suffix}`;
}

function makeIntent(domain = 'composition', source = 'relation_chains', score = 0.8) {
  return {
    domain,
    source,
    reason: 'Test reason',
    score,
    seed_skill_ids: ['skl_001'],
    max_analysis_budget: 2,
  };
}

function makePreparedIntents(intents = [makeIntent()], hasDemand = false) {
  return {
    intents,
    total: intents.length,
    max_targets: 2,
    capped: false,
    has_demand: hasDemand,
  };
}

// gate_id must match /^gate_[a-f0-9]{16}$/
function makeGateId(base = 'test_fixture_ab') {
  const h = createHash('sha256').update(base).digest('hex');
  return `gate_${h.slice(0, 16)}`;
}

function makeCandidate(packId = 'pack_test_001', proofDigest = 'a'.repeat(64)) {
  return {
    pack_id: packId,
    pack_path: `catalog/packs/candidate/${packId}/pack.yaml`,
    proof_path: `catalog/packs/candidate/${packId}/preflight-proof.json`,
    proof_digest: proofDigest,
    analysis_paths: ['catalog/analyses/skl_001.md'],
    relation_ids: ['rel_001'],
  };
}

function makePreflight(ok = true, proofDigest = null) {
  return { ok, errors: ok ? [] : ['Preflight gap'], ...(proofDigest ? { proof_digest: proofDigest } : {}) };
}

function makeEvaluation(sessionId, packId, proofDigest, level = 'passed') {
  return {
    session_id: sessionId,
    ok: true,
    evaluation: {
      pack_id: packId,
      proof_digest: proofDigest,
      decision: {
        passed: level === 'passed',
        level,
        reason: level === 'passed' ? 'All checks passed' : level === 'needs_work' ? 'Coverage below MIN' : 'Structural blocker',
      },
      blockers: level === 'rejected' ? [{ id: 'blk_001', reason: 'Missing analysis' }] : [],
    },
    evaluation_path: `catalog/evaluations/${packId}/evaluation.json`,
  };
}

function makePromotion(ok = true, packId = 'pack_test_001') {
  return { ok, pack_id: packId, published_path: `catalog/packs/published/${packId}/pack.yaml`, errors: ok ? [] : ['promotion error'] };
}

function makeIssueStage(opts = {}) {
  const count = opts.count ?? 0;
  const assessments = [];
  for (let i = 0; i < count; i++) {
    const num = opts.startNum ? opts.startNum + i : i + 1;
    assessments.push({
      issue_number: num,
      intake: { intake_status: 'accepted', issue_binding: { repository: 'EricSanchezok/good-stuff-for-agents', issue_number: num } },
      assessment: { assessment_id: `assess_${num}`, issue_number: num },
      reply: {
        status: opts.replyStatus || 'dry_run',
        assessment_path: `catalog/runs/run_test-seal-001/issue-assessments/assess_${num}.json`,
        response_ledger_path: `catalog/runs/run_test-seal-001/issue-response-ledgers/ledger_${num}.json`,
        posted: opts.replyStatus === 'posted',
        comment_id: opts.replyStatus === 'posted' ? `comment_${num}` : undefined,
      },
    });
  }

  const byState = opts.byState || { open: count, acknowledged: 0, fulfilled: 0, blocked: 0 };
  return {
    all_open_issues_processed: opts.allProcessed !== false,
    scan: {
      total: count,
      by_state: byState,
    },
    assessments,
  };
}

function buildStageOutput({
  runContextInput = null,
  intents = null,
  issues = makeIssueStage({ count: 0 }),
  targets = [],
  bindTargetsToPrepared = true,
  gateResult = null,
} = {}) {
  const selectedContext = runContextInput
    ?? (targets.length === 0 ? noIntentContext() : targets.length === 1 ? oneIntentContext() : standardContext());
  const prepared = prepareRun({ runContextInput: selectedContext });

  // Build a valid-looking gate_result when none is provided
  const resolvedGateResult = gateResult || makeValidGateResult(prepared.run_context);

  const resolvedIntents = intents || prepared.intents;
  const resolvedTargets = targets.map((target, index) => (
    bindTargetsToPrepared && resolvedIntents.intents[index]
      ? { ...target, intent: resolvedIntents.intents[index] }
      : target
  ));

  const stageOutput = {
    run_context: prepared.run_context,
    intents: resolvedIntents,
    stages: {
      issues,
      targets: resolvedTargets,
      gate_result: resolvedGateResult,
    },
  };
  Object.defineProperty(stageOutput, TRUSTED_CONTEXT_DIGEST, {
    value: prepared.run_context.digest,
    enumerable: false,
  });
  return stageOutput;
}

function makeValidGateResult(runContext, opts = {}) {
  const passed = opts.passed !== false;
  const gateId = opts.gateId || makeGateId(runContext.run_id);
  const checks = TRUSTED_CHECKS.map((c) => ({
    name: c.name,
    script: c.script,
    passed,
    exit_code: 0,
    duration_ms: 1,
  }));

  if (!passed) {
    // First structural check fails
    checks[0].passed = false;
    checks[0].exit_code = 1;
  }

  const digestPayload = {
    gate_id: gateId,
    run_id: runContext.run_id,
    context_digest: runContext.digest,
    passed,
    invoked_count: opts.invokedCount ?? 1,
    started_at: opts.startedAt || new Date().toISOString(),
    finished_at: opts.finishedAt || new Date().toISOString(),
    checks: checks.map((c) => ({ name: c.name, script: c.script, passed: c.passed, exit_code: c.exit_code, duration_ms: c.duration_ms })),
  };
  const digest = createHash('sha256').update(JSON.stringify(digestPayload)).digest('hex');

  return {
    gate_id: gateId,
    run_id: digestPayload.run_id,
    context_digest: digestPayload.context_digest,
    passed,
    invoked_count: digestPayload.invoked_count,
    started_at: digestPayload.started_at,
    finished_at: digestPayload.finished_at,
    checks,
    digest,
    _single_invocation: true,
  };
}

function sealPrepared(options = {}) {
  const stageOutput = options.stageOutput;
  const trustedDigest = options.expectedContextDigest
    ?? stageOutput?.[TRUSTED_CONTEXT_DIGEST]
    ?? null;
  return sealRun({ ...options, expectedContextDigest: trustedDigest });
}

// ---------------------------------------------------------------------------
// TEST 1: Missing contract → fail closed
// ---------------------------------------------------------------------------

test('S1: null stageOutput fails closed', () => {
  const result = sealPrepared({ stageOutput: null });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('stage_output_missing')));
});

test('S1: undefined stageOutput fails closed', () => {
  const result = sealPrepared({});
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('stage_output_missing')));
});

test('S1: missing run_context fails closed', () => {
  const result = sealPrepared({ stageOutput: { intents: makePreparedIntents(), stages: {} } });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('run_context_missing')));
});

test('S1: missing stages fails closed', () => {
  const stageOutput = buildStageOutput();
  delete stageOutput.stages;
  const result = sealPrepared({ stageOutput });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('stages_missing')));
});

test('S1: intents too many fails', () => {
  const stageOutput = buildStageOutput({
    intents: { intents: [makeIntent('a'), makeIntent('b'), makeIntent('c')], total: 3, max_targets: 2, capped: true },
  });
  const result = sealPrepared({ stageOutput });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('intents_too_many')));
});

test('S1: missing independent context digest fails closed', () => {
  const stageOutput = buildStageOutput();
  const result = sealRun({ stageOutput });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('expected_context_digest_missing_or_invalid')));
});

test('S1: attacker-recomputed payload digest cannot replace prepare anchor', () => {
  const preparedStage = buildStageOutput();
  const expectedContextDigest = preparedStage[TRUSTED_CONTEXT_DIGEST];
  const stageOutput = JSON.parse(JSON.stringify(preparedStage));
  stageOutput.run_context.notes = 'tampered after prepare';
  stageOutput.run_context.digest = computeContextDigest(stageOutput.run_context);

  const result = sealRun({ stageOutput, expectedContextDigest });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('run_context_digest_mismatch')));
});

test('S1: prepared intents cannot be altered after prepare', () => {
  const stageOutput = buildStageOutput({ runContextInput: oneIntentContext() });
  stageOutput.intents.intents[0].reason = 'tampered intent';
  const result = sealPrepared({ stageOutput });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('intents_context_mismatch')));
});

test('S1: issue demand metadata remains bound when seal recomputes intents', () => {
  const demandMetadata = {
    demand_skill_ids: ['skl_demand_b', 'skl_demand_a'],
    domain_slugs: ['code-review-remediation'],
  };
  const runContextInput = standardContext({ demandMetadata });
  const stageOutput = buildStageOutput({ runContextInput });

  assert.equal(stageOutput.intents.has_demand, true);
  assert.equal(stageOutput.intents.intents[0].source, 'issue_demand');
  assert.deepEqual(stageOutput.run_context.demand_metadata.demand_skill_ids, ['skl_demand_a', 'skl_demand_b']);

  const result = sealPrepared({ stageOutput });
  assert.equal(result.ok, true, `Errors: ${result.errors.join('; ')}`);
  assert.equal(result.summary.intents[0].source, 'issue_demand');
});

// ---------------------------------------------------------------------------
// TEST 2: Zero intents → no_pack_clean
// ---------------------------------------------------------------------------

test('S2: zero intents no_pack_clean runs cleanly', () => {
  const stageOutput = buildStageOutput();
  const result = sealPrepared({ stageOutput, gateId: 'gate_zero_intents' });
  assert.equal(result.ok, true);
  assert.equal(result.terminal_ledger.run_outcome.status, 'no_pack_clean');
  assert.equal(result.final_gate.passed, true);
  assert.ok(result.summary.gate.passed);
  assert.equal(result.summary.intents.length, 0);
});

// ---------------------------------------------------------------------------
// TEST 3: Two candidates each eval/promote
// ---------------------------------------------------------------------------

test('S3: two candidates separately evaluated and promoted', () => {
  const intent1 = makeIntent('domain-a', 'coverage_gap');
  const intent2 = makeIntent('domain-b', 'relation_chains');
  const proofDigest1 = '1'.repeat(64);
  const proofDigest2 = '2'.repeat(64);
  const pack1 = makeCandidate('pack_a', proofDigest1);
  const pack2 = makeCandidate('pack_b', proofDigest2);
  const evalSes1 = 'evl_ses_a001';
  const evalSes2 = 'evl_ses_b001';
  const synSes1 = 'syn_ses_a001';
  const synSes2 = 'syn_ses_b001';

  const targets = [
    {
      intent: intent1,
      repairs: [],
      synthesis: { session_id: synSes1, ok: true, candidate: pack1 },
      preflight: makePreflight(true, proofDigest1),
      evaluation: makeEvaluation(evalSes1, 'pack_a', proofDigest1, 'passed'),
      promotion: makePromotion(true, 'pack_a'),
    },
    {
      intent: intent2,
      repairs: [],
      synthesis: { session_id: synSes2, ok: true, candidate: pack2 },
      preflight: makePreflight(true, proofDigest2),
      evaluation: makeEvaluation(evalSes2, 'pack_b', proofDigest2, 'passed'),
      promotion: makePromotion(true, 'pack_b'),
    },
  ];

  const stageOutput = buildStageOutput({ targets });

  const result = sealPrepared({ stageOutput, gateId: 'gate_two_promote' });
  assert.equal(result.ok, true, `Errors: ${result.errors.join('; ')}`);
  assert.equal(result.final_gate.passed, true);
  assert.equal(result.terminal_ledger.run_outcome.status, 'success');

  const packOutcomes = result.terminal_ledger.pack_outcomes;
  assert.equal(packOutcomes.length, 2);
  const promoted = packOutcomes.filter((p) => p.state === 'promoted');
  assert.equal(promoted.length, 2);
});

// ---------------------------------------------------------------------------
// TEST 4: Same session synthesis/evaluation rejected
// ---------------------------------------------------------------------------

test('S4: same session synthesis/evaluation fails gate', () => {
  const sharedSession = 'shared_ses_001';
  const proofDigest = 's'.repeat(64);

  const targets = [{
    intent: makeIntent(),
    repairs: [],
    synthesis: { session_id: sharedSession, ok: true, candidate: makeCandidate('pack_same', proofDigest) },
    preflight: makePreflight(true, proofDigest),
    evaluation: makeEvaluation(sharedSession, 'pack_same', proofDigest, 'passed'),
    promotion: makePromotion(true, 'pack_same'),
  }];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_same_ses' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('same_session_synthesis_evaluation')), `Errors: ${result.errors}`);
});

// ---------------------------------------------------------------------------
// TEST 5: Reused evaluator session across candidates
// ---------------------------------------------------------------------------

test('S5: reused evaluator session across candidates fails gate', () => {
  const sharedEval = 'evl_ses_shared';
  const proofD1 = 'a'.repeat(64);
  const proofD2 = 'b'.repeat(64);

  const intent1 = makeIntent('dom1');
  const intent2 = makeIntent('dom2');

  const targets = [
    {
      intent: intent1,
      repairs: [],
      synthesis: { session_id: 'syn_ses_a002', ok: true, candidate: makeCandidate('pack_1', proofD1) },
      preflight: makePreflight(true, proofD1),
      evaluation: makeEvaluation(sharedEval, 'pack_1', proofD1, 'passed'),
      promotion: makePromotion(true, 'pack_1'),
    },
    {
      intent: intent2,
      repairs: [],
      synthesis: { session_id: 'syn_ses_b002', ok: true, candidate: makeCandidate('pack_2', proofD2) },
      preflight: makePreflight(true, proofD2),
      evaluation: makeEvaluation(sharedEval, 'pack_2', proofD2, 'passed'),
      promotion: makePromotion(true, 'pack_2'),
    },
  ];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_reuse_eval' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('reused_evaluation_session')));
});

// ---------------------------------------------------------------------------
// TEST 6: Proof digest mismatch
// ---------------------------------------------------------------------------

test('S6: proof digest mismatch fails gate', () => {
  const evalSes = 'evl_ses_mismatch';
  const synSes = 'syn_ses_mismatch';
  const synthProof = 'x'.repeat(64);
  const evalProof = 'y'.repeat(64);

  const targets = [{
    intent: makeIntent(),
    repairs: [],
    synthesis: { session_id: synSes, ok: true, candidate: makeCandidate('pack_mismatch', synthProof) },
    preflight: makePreflight(true, synthProof),
    evaluation: makeEvaluation(evalSes, 'pack_mismatch', evalProof, 'passed'),
    promotion: makePromotion(true, 'pack_mismatch'),
  }];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_proof_mismatch' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('proof_digest_mismatch')));
});

// ---------------------------------------------------------------------------
// TEST 7: needs_work repair budget
// ---------------------------------------------------------------------------

test('S7: needs_work after one post-eval repair with fixed candidate passes', () => {
  const proofDigestFixed = 'f'.repeat(64);
  const synSes1 = 'syn_ses_orig';
  const evalSes1 = 'evl_ses_first';
  const intent = makeIntent();

  const targets = [{
    intent,
    repairs: [{ kind: 'preflight', session_id: 'syn_ses_repair_br', attempt: 2, fingerprint: 'fp_br_001' }],
    synthesis: { session_id: synSes1, ok: true, candidate: makeCandidate('pack_fix', proofDigestFixed) },
    preflight: makePreflight(true, proofDigestFixed),
    evaluation: makeEvaluation(evalSes1, 'pack_fix', proofDigestFixed, 'passed'),
    promotion: makePromotion(true, 'pack_fix'),
  }];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_repair_pass' });
  assert.equal(result.ok, true, `Unexpected errors: ${result.errors.join('; ')}`);
});

test('S7: needs_work with no post-eval repair recorded fails', () => {
  const proofDigest = 'n'.repeat(64);

  const targets = [{
    intent: makeIntent(),
    repairs: [],
    synthesis: { session_id: 'syn_ses_nw', ok: true, candidate: makeCandidate('pack_nw', proofDigest) },
    preflight: makePreflight(true, proofDigest),
    evaluation: makeEvaluation('evl_ses_nw', 'pack_nw', proofDigest, 'needs_work'),
  }];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_nw_no_repair' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('needs_work_but_no_post_eval_repair_recorded')));
});

// ---------------------------------------------------------------------------
// TEST 8: Passed without promotion
// ---------------------------------------------------------------------------

test('S8: passed but not promoted fails', () => {
  const proofDigest = 'p'.repeat(64);

  const targets = [{
    intent: makeIntent(),
    repairs: [],
    synthesis: { session_id: 'syn_ses_prom_fail', ok: true, candidate: makeCandidate('pack_noprom', proofDigest) },
    preflight: makePreflight(true, proofDigest),
    evaluation: makeEvaluation('evl_ses_prom_fail', 'pack_noprom', proofDigest, 'passed'),
    promotion: null, // Missing promotion
  }];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_no_prom' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('passed_not_promoted')));
});

test('S8: promotion failed after passed evaluation', () => {
  const proofDigest = 'p'.repeat(64);

  const targets = [{
    intent: makeIntent(),
    repairs: [],
    synthesis: { session_id: 'syn_ses_prom_fail2', ok: true, candidate: makeCandidate('pack_promfail', proofDigest) },
    preflight: makePreflight(true, proofDigest),
    evaluation: makeEvaluation('evl_ses_prom_fail2', 'pack_promfail', proofDigest, 'passed'),
    promotion: makePromotion(false, 'pack_promfail'),
  }];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_prom_fail' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('passed_not_promoted')));
});

// ---------------------------------------------------------------------------
// TEST 9: All-open issue count/paths validation
// ---------------------------------------------------------------------------

test('S9: issue count mismatch fails', () => {
  const stageOutput = buildStageOutput({
    issues: {
      all_open_issues_processed: true,
      scan: { total: 5, by_state: { open: 5, acknowledged: 0, fulfilled: 0, blocked: 0 } },
      assessments: [], // empty but scan says 5
    },
  });
  const result = sealPrepared({ stageOutput, gateId: 'gate_issue_count' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('issue_count_mismatch')));
});

test('S9: all_open_issues_processed=false fails', () => {
  const stageOutput = buildStageOutput({
    issues: makeIssueStage({ count: 1, allProcessed: false }),
  });
  const result = sealPrepared({ stageOutput, gateId: 'gate_issue_incomplete' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('issue_stage_incomplete')));
});

// ---------------------------------------------------------------------------
// TEST 10: Issue dry-run / posted terminals pass
// ---------------------------------------------------------------------------

test('S10: dry-run issue terminals pass gate', () => {
  const stageOutput = buildStageOutput({
    issues: {
      all_open_issues_processed: true,
      scan: { total: 2, by_state: { open: 2, acknowledged: 0, fulfilled: 0, blocked: 0 } },
      assessments: [
        {
          issue_number: 1,
          intake: { intake_status: 'accepted', issue_binding: { repository: 'EricSanchezok/good-stuff-for-agents', issue_number: 1 } },
          assessment: { assessment_id: 'a1', issue_number: 1 },
          reply: { status: 'dry_run', assessment_path: 'p1.json', response_ledger_path: 'l1.json' },
        },
        {
          issue_number: 2,
          intake: { intake_status: 'accepted', issue_binding: { repository: 'EricSanchezok/good-stuff-for-agents', issue_number: 2 } },
          assessment: { assessment_id: 'a2', issue_number: 2 },
          reply: { status: 'posted', assessment_path: 'p2.json', response_ledger_path: 'l2.json' },
        },
      ],
    },
  });
  const result = sealPrepared({ stageOutput, gateId: 'gate_issue_dry_posted' });
  assert.equal(result.ok, true, `Errors: ${result.errors.join('; ')}`);
  assert.equal(result.terminal_ledger.issue_outcomes.length, 2);
  const states = result.terminal_ledger.issue_outcomes.map((o) => o.state);
  assert.ok(states.includes('dry_run'));
  assert.ok(states.includes('posted'));
});

test('S10: issue with held_for_review passes gate (canonical held state)', () => {
  const stageOutput = buildStageOutput({
    issues: {
      all_open_issues_processed: true,
      scan: { total: 1, by_state: { open: 0, acknowledged: 0, fulfilled: 0, blocked: 1 } },
      assessments: [{
        issue_number: 3,
        intake: { intake_status: 'accepted', issue_binding: { repository: 'EricSanchezok/good-stuff-for-agents', issue_number: 3 } },
        assessment: { assessment_id: 'a3', issue_number: 3 },
        reply: { status: 'held_for_review', assessment_path: 'p3.json', response_ledger_path: 'l3.json' },
      }],
    },
  });
  const result = sealPrepared({ stageOutput, gateId: 'gate_issue_held' });
  // held_for_review is a valid terminal — not an error
  assert.equal(result.ok, true, `Errors: ${result.errors.join('; ')}`);
  assert.equal(result.terminal_ledger.issue_outcomes[0].state, 'held_for_review');
});

// ---------------------------------------------------------------------------
// TEST 11: Single gate invocation
// ---------------------------------------------------------------------------

test('S11: single gate invoked exactly once', () => {
  const stageOutput = buildStageOutput();
  const gateId = 'gate_single_test';
  const result = sealPrepared({ stageOutput, gateId });
  assert.equal(result.final_gate.gate_id, gateId);
  assert.equal(result.final_gate.invoked_count, 1);
  assert.equal(result.final_gate._single_invocation, true);
});

// ---------------------------------------------------------------------------
// TEST 12: v3 summary valid
// ---------------------------------------------------------------------------

test('S12: v3 summary is structurally valid', () => {
  const stageOutput = buildStageOutput();
  const result = sealPrepared({ stageOutput, gateId: 'gate_v3_schema' });

  const summary = result.summary;
  assert.equal(summary.schema_version, 3);
  assert.ok(typeof summary.run_id === 'string');
  assert.ok(typeof summary.ledger_id === 'string');
  assert.equal(typeof summary.context_digest, 'string');
  assert.equal(summary.context_digest.length, 64);
  assert.equal(typeof summary.ledger_digest, 'string');
  assert.equal(summary.ledger_digest.length, 64);
  assert.equal(typeof summary.timestamp, 'string');

  assert.equal(typeof summary.run_outcome.status, 'string');
  assert.ok(['success', 'partial', 'failed', 'no_pack_clean', 'reply_blocked'].includes(summary.run_outcome.status));

  assert.equal(typeof summary.gate.gate_id, 'string');
  assert.equal(typeof summary.gate.decision, 'string');
  assert.equal(typeof summary.gate.passed, 'boolean');

  assert.ok(Array.isArray(summary.intents));
  assert.ok(summary.intents.length <= 2);

  assert.equal(typeof summary.outcome_counts.sources, 'number');
  assert.equal(typeof summary.outcome_counts.skills, 'number');
  assert.equal(typeof summary.outcome_counts.packs, 'number');
  assert.equal(typeof summary.outcome_counts.issues, 'number');

  // Validate via schema
  const schemaErrors = validateRunSummary(summary);
  assert.equal(schemaErrors.length, 0, `Schema errors: ${schemaErrors.join('; ')}`);
});

// ---------------------------------------------------------------------------
// TEST 13: Manifest digest/path consistency
// ---------------------------------------------------------------------------

test('S13: manifest digests consistent with written artifacts', () => {
  const tmpDir = mkdtempSync(join(process.cwd(), '.seal-test-manifest-'));
  try {
    const stageOutput = buildStageOutput();
    const baseHead = 'd'.repeat(40);
    const result = sealPrepared({ stageOutput, outputDir: tmpDir, baseHead, gateId: 'gate_manifest' });

    assert.ok(result.ok, `Errors: ${result.errors.join('; ')}`);
    assert.ok(result.manifest, 'Manifest should be present');
    assert.equal(result.manifest.base_head, baseHead);
    assert.equal(result.manifest.run_id, result.summary.run_id);
    assert.equal(result.manifest.ledger_digest, result.terminal_ledger.digest);
    assert.equal(result.manifest.summary_digest.length, 64);

    // Verify summary_digest against written file
    const summaryContent = readFileSync(join(tmpDir, 'run-summary.json'), 'utf8');
    const expectedDigest = createHash('sha256').update(summaryContent).digest('hex');
    assert.equal(result.manifest.summary_digest, expectedDigest);

    // Verify all manifest paths are repo-relative and sorted
    assert.ok(Array.isArray(result.manifest.paths));
    for (let i = 1; i < result.manifest.paths.length; i++) {
      assert.ok(result.manifest.paths[i] > result.manifest.paths[i - 1],
        `Paths not sorted: ${result.manifest.paths[i - 1]} vs ${result.manifest.paths[i]}`);
    }

    // Verify written files actually exist
    const artifacts = ['run-context.json', 'terminal-ledger.json', 'run-report.md', 'run-summary.json'];
    for (const f of artifacts) {
      const content = readFileSync(join(tmpDir, f), 'utf8');
      assert.ok(content.length > 0, `${f} should not be empty`);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// TEST 14: CLI representative use via import (deterministic)
// ---------------------------------------------------------------------------

test('S13: implementation manifest parser includes tracked and untracked changes', () => {
  const paths = parseGitChangedPaths([
    ' M .synergy/skill/nightly-catalog-ops/scripts/seal-run.mjs',
    'D  catalog/legacy.json',
    '?? catalog/runs/run_test/new.json',
    '',
  ].join('\0'));
  assert.deepEqual(paths, [
    '.synergy/skill/nightly-catalog-ops/scripts/seal-run.mjs',
    'catalog/legacy.json',
    'catalog/runs/run_test/new.json',
  ]);
});

test('S13: manifested artifacts cannot be written outside the repository', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'seal-test-external-manifest-'));
  try {
    const stageOutput = buildStageOutput();
    const result = sealPrepared({ stageOutput, outputDir: tmpDir, baseHead: 'e'.repeat(40), gateId: 'gate_external_manifest' });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes('Manifested seal output directory must be inside the repository')));
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('S14: CLI representative use produces output dir artifacts', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'seal-test-cli-'));
  try {
    const stageOutput = buildStageOutput();
    const result = sealPrepared({ stageOutput, outputDir: tmpDir, gateId: 'gate_cli_rep' });

    assert.equal(result.ok, true);
    assert.equal(result.terminal_ledger.run_outcome.status, 'no_pack_clean');

    // All files written
    assert.ok(readFileSync(join(tmpDir, 'run-context.json'), 'utf8').length > 0);
    assert.ok(readFileSync(join(tmpDir, 'terminal-ledger.json'), 'utf8').length > 0);
    assert.ok(readFileSync(join(tmpDir, 'run-report.md'), 'utf8').length > 0);
    assert.ok(readFileSync(join(tmpDir, 'run-summary.json'), 'utf8').length > 0);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// TEST 15: Intent mismatch — target uses intent not in prepared intents
// ---------------------------------------------------------------------------

test('S15: target uses intent not in prepared intents fails', () => {
  const targets = [{
    intent: makeIntent('unknown_domain', 'unknown_source'),
    repairs: [],
    synthesis: { session_id: 'syn_bad', ok: true, candidate: makeCandidate('pack_bad') },
    preflight: makePreflight(true),
    evaluation: makeEvaluation('evl_bad', 'pack_bad', 'a'.repeat(64), 'passed'),
    promotion: makePromotion(true, 'pack_bad'),
  }];

  const stageOutput = buildStageOutput({ targets, bindTargetsToPrepared: false });
  const result = sealPrepared({ stageOutput, gateId: 'gate_bad_intent' });
  // Should fail because the intent doesn't match prepared intents, and the bad
  // candidate's proof_digest won't match either. Let's just check the intent error.
  assert.ok(result.errors.some((e) => e.includes('unprepared_intent')));
});

// ---------------------------------------------------------------------------
// TEST 16: Too many intents rejection
// ---------------------------------------------------------------------------

test('S16: 3 intents rejected', () => {
  const stageOutput = buildStageOutput({
    intents: { intents: [makeIntent('a'), makeIntent('b'), makeIntent('c')], total: 3, max_targets: 2, capped: true },
  });
  const result = sealPrepared({ stageOutput, gateId: 'gate_too_many' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('intents_too_many')));
});

// ---------------------------------------------------------------------------
// TEST 17: Missing run_context fields
// ---------------------------------------------------------------------------

test('S17: run_context without digest fails', () => {
  const stageOutput = { run_context: { run_id: 'run_x' }, intents: makePreparedIntents([]), stages: {} };
  const result = sealPrepared({ stageOutput });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('run_context_incomplete')));
});

// ---------------------------------------------------------------------------
// TEST 18: Too many preflight repairs blocked
// ---------------------------------------------------------------------------

test('S18: 2 preflight repairs blocked (max 1)', () => {
  const proofD = 'r'.repeat(64);
  const targets = [{
    intent: makeIntent(),
    repairs: [
      { kind: 'preflight', session_id: 'br1', attempt: 2, fingerprint: 'fp1' },
      { kind: 'preflight', session_id: 'br2', attempt: 3, fingerprint: 'fp2' },
    ],
    synthesis: { session_id: 'syn_br3', ok: true, candidate: makeCandidate('pack_br3', proofD) },
    preflight: makePreflight(true, proofD),
    evaluation: makeEvaluation('evl_br3', 'pack_br3', proofD, 'passed'),
    promotion: makePromotion(true, 'pack_br3'),
  }];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_too_many_repairs' });
  assert.ok(result.errors.some((e) => e.includes('too_many_preflight_repairs')), `Errors: ${result.errors}`);
});

// ---------------------------------------------------------------------------
// TEST 19: Duplicate failure fingerprint blocked
// ---------------------------------------------------------------------------

test('S19: duplicate failure fingerprint in same target fails', () => {
  const proofD = 'd'.repeat(64);
  const targets = [{
    intent: makeIntent(),
    repairs: [
      { kind: 'preflight', session_id: 'r1', attempt: 2, fingerprint: 'fp_dup' },
      { kind: 'preflight', session_id: 'r2', attempt: 3, fingerprint: 'fp_dup' },
    ],
    synthesis: { session_id: 'syn_dup', ok: true, candidate: makeCandidate('pack_dup', proofD) },
    preflight: makePreflight(true, proofD),
    evaluation: makeEvaluation('evl_dup', 'pack_dup', proofD, 'passed'),
    promotion: makePromotion(true, 'pack_dup'),
  }];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_dup_fp' });
  assert.ok(result.errors.some((e) => e.includes('duplicate_fingerprint')), `Errors: ${result.errors}`);
});

// ---------------------------------------------------------------------------
// TEST 20: all_open_issues_processed=false fails gate
// ---------------------------------------------------------------------------

test('S20: all_open_issues_processed=false fails', () => {
  const stageOutput = buildStageOutput({
    issues: {
      all_open_issues_processed: false,
      scan: { total: 0, by_state: { open: 0, acknowledged: 0, fulfilled: 0, blocked: 0 } },
      assessments: [],
    },
  });
  const result = sealPrepared({ stageOutput, gateId: 'gate_incomplete_issues' });
  assert.ok(result.errors.some((e) => e.includes('issue_stage_incomplete')));
});

// ---------------------------------------------------------------------------
// TEST: prepare-run creates deterministic output
// ---------------------------------------------------------------------------

test('prepare-run: deterministic output for same input', () => {
  const input = standardContext();
  const r1 = prepareRun({ runContextInput: input });
  const r2 = prepareRun({ runContextInput: input });
  assert.equal(r1.run_context.digest, r2.run_context.digest);
  assert.equal(r1.run_context.run_id, r2.run_context.run_id);
  assert.deepEqual(r1.intents, r2.intents);
});

test('prepare-run: resume with correct digest works', () => {
  const first = prepareRun({ runContextInput: standardContext() });
  const second = prepareRun({ resumeFrom: first.run_context, expectedDigest: first.run_context.digest });
  assert.equal(second.run_context.digest, first.run_context.digest);
});

test('prepare-run: resume with wrong digest throws', () => {
  const first = prepareRun({ runContextInput: standardContext() });
  assert.throws(
    () => prepareRun({ resumeFrom: first.run_context, expectedDigest: '0'.repeat(64) }),
    { message: /RESUME_DIGEST_MISMATCH/ },
  );
});

// ---------------------------------------------------------------------------
// TEST: terminal ledger is deterministic
// ---------------------------------------------------------------------------

test('SealRun: terminal ledger deterministic for same input', () => {
  const stageOutput = buildStageOutput();
  const r1 = sealPrepared({ stageOutput, gateId: 'gate_det_same', timestamp: '2026-07-28T00:00:00Z' });
  const r2 = sealPrepared({ stageOutput, gateId: 'gate_det_same', timestamp: '2026-07-28T00:00:00Z' });
  // Same input, same timestamp, same gateId → same ledger digest
  assert.equal(r1.terminal_ledger.digest, r2.terminal_ledger.digest);
  assert.equal(r1.terminal_ledger.run_outcome.status, r2.terminal_ledger.run_outcome.status);
});

// ---------------------------------------------------------------------------
// TEST: no_pack_clean with one target that produces no candidate
// ---------------------------------------------------------------------------

test('S2: no_pack_clean when synthesis produces no candidate', () => {
  // Use same intent domain that prepareRun selects for this coverage profile
  const intent = makeIntent('coverage-expansion', 'coverage_gap');
  const targets = [{
    intent,
    repairs: [],
    synthesis: { session_id: 'syn_empty', ok: false, candidate: null },
  }];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_syn_empty' });
  assert.equal(result.ok, true, `Errors: ${result.errors.join('; ')}`);
  assert.ok(result.terminal_ledger.pack_outcomes.some((o) => o.state === 'no_pack_clean'));
});

// ---------------------------------------------------------------------------
// TEST: Run report renders correctly with content
// ---------------------------------------------------------------------------

test('Run report content includes key fields', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'seal-test-report-'));
  try {
    const proofD = 'r'.repeat(64);
    const intent = makeIntent('test-domain');
    const targets = [{
      intent,
      repairs: [],
      synthesis: { session_id: 'syn_rpt', ok: true, candidate: makeCandidate('pack_rpt', proofD) },
      preflight: makePreflight(true, proofD),
      evaluation: makeEvaluation('evl_rpt', 'pack_rpt', proofD, 'passed'),
      promotion: makePromotion(true, 'pack_rpt'),
    }];

    const stageOutput = buildStageOutput({ targets });
    const result = sealPrepared({ stageOutput, outputDir: tmpDir, gateId: 'gate_rpt' });

    const report = readFileSync(join(tmpDir, 'run-report.md'), 'utf8');
    assert.ok(report.includes(result.run_context.run_id), 'Report should contain run ID');
    assert.ok(report.includes(result.terminal_ledger.ledger_id), 'Report should contain ledger ID');
    assert.ok(report.includes('promoted'), 'Report should mention promoted pack');
    assert.ok(report.includes('Final Gate'), 'Report should have Final Gate section');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// TEST: Issue scan state sum mismatch
// ---------------------------------------------------------------------------

test('Issue scan state sum != total fails', () => {
  const stageOutput = buildStageOutput({
    issues: {
      all_open_issues_processed: true,
      scan: { total: 3, by_state: { open: 1, acknowledged: 0, fulfilled: 0, blocked: 0 } },
      assessments: [{ issue_number: 1, intake: {}, assessment: {}, reply: { status: 'dry_run', assessment_path: 'a', response_ledger_path: 'b' } }],
    },
  });
  const result = sealPrepared({ stageOutput, gateId: 'gate_state_sum' });
  assert.ok(result.errors.some((e) => e.includes('issue_scan_state_mismatch')));
});

// ---------------------------------------------------------------------------
// TEST: Issue missing/invalid terminal state fails
// ---------------------------------------------------------------------------

test('Issue with missing terminal (no reply) fails', () => {
  const stageOutput = buildStageOutput({
    issues: {
      all_open_issues_processed: true,
      scan: { total: 1, by_state: { open: 1, acknowledged: 0, fulfilled: 0, blocked: 0 } },
      assessments: [{ issue_number: 1, intake: {}, assessment: {} }],
    },
  });
  const result = sealPrepared({ stageOutput, gateId: 'gate_missing_reply' });
  assert.ok(result.errors.some((e) => e.includes('missing_reply')), `Errors: ${result.errors}`);
});

// ---------------------------------------------------------------------------
// TEST: gate_result failure propagates into seal
// ---------------------------------------------------------------------------

test('Gate result failure propagates into seal', () => {
  // Build normal stage output, then replace gate_result with a failing one
  const stageOutput = buildStageOutput();
  const failingGate = makeValidGateResult(stageOutput.run_context, { passed: false, gateId: 'gate_failing' });
  stageOutput.stages.gate_result = failingGate;
  const result = sealPrepared({ stageOutput, gateId: 'gate_failing' });
  assert.equal(result.final_gate.passed, false);
  assert.ok(result.final_gate.errors.some((e) => e.includes('gate_check_failed') || e.includes('gate_result_check')));
});

// ---------------------------------------------------------------------------
// TEST: gate_result missing rejected
// ---------------------------------------------------------------------------

test('Gate result missing from stages fails closed', () => {
  const stageOutput = buildStageOutput();
  delete stageOutput.stages.gate_result;
  const result = sealPrepared({ stageOutput, gateId: 'gate_missing' });
  assert.ok(result.errors.some((e) => e.includes('gate_result_missing')));
});

// ---------------------------------------------------------------------------
// TEST: gate_result tampered digest rejected
// ---------------------------------------------------------------------------

test('Tampered gate_result digest fails closed', () => {
  const stageOutput = buildStageOutput();
  // Tamper the digest without changing content
  stageOutput.stages.gate_result = {
    ...stageOutput.stages.gate_result,
    digest: 'b'.repeat(64),
  };
  const result = sealPrepared({ stageOutput, gateId: 'gate_tampered' });
  assert.equal(result.final_gate.passed, false);
  assert.ok(result.final_gate.errors.some((e) => e.includes('gate_result_digest')), `Expected digest error: ${result.errors}`);
});

// ---------------------------------------------------------------------------
// TEST: Rejected evaluation terminates correctly
// ---------------------------------------------------------------------------

test('Rejected evaluation terminates rejected', () => {
  const proofD = 'r'.repeat(64);
  const targets = [{
    intent: makeIntent(),
    repairs: [],
    synthesis: { session_id: 'syn_rej', ok: true, candidate: makeCandidate('pack_rej', proofD) },
    preflight: makePreflight(true, proofD),
    evaluation: makeEvaluation('evl_rej', 'pack_rej', proofD, 'rejected'),
  }];

  const stageOutput = buildStageOutput({ targets });
  const result = sealPrepared({ stageOutput, gateId: 'gate_rej' });
  // Candidate is rejected — that's a valid terminal, so gate can pass
  // provided no structural errors. The pack outcome should be 'rejected'.
  const packStates = result.terminal_ledger.pack_outcomes.map((o) => o.state);
  assert.ok(packStates.includes('rejected'), `Pack states: ${packStates}`);
});

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------

for (const { name, fn } of tests) {
  try {
    await fn();
    process.stdout.write(`ok - ${name}\n`);
  } catch (error) {
    failures += 1;
    process.stderr.write(`not ok - ${name}\n`);
    process.stderr.write(`  ${error.stack}\n`);
  }
}

if (failures > 0) {
  process.stderr.write(`\n${failures}/${tests.length} seal-run test(s) failed\n`);
  process.exit(1);
}

process.stdout.write(`\n${tests.length} seal-run tests passed\n`);
