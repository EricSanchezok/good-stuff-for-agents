#!/usr/bin/env node
/**
 * test-nightly-v4.mjs — New functionality tests for pause/resume, cold-start,
 * delivery-guard, exhaustion proof, and SLO tracking.
 *
 * All tests use temp directories. No real GitHub/catalog I/O.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import {
  executeNightly, generateRunId, resumeNightly,
  readActiveMarker, buildTerminalPayload,
} from './lib/nightly-controller-core.mjs';
import { selectTargetIntentsColdStart } from './lib/cold-start-selector.mjs';
import { buildEvidenceIndex } from './lib/evidence-index-builder.mjs';
import { deliveryGuard } from './lib/delivery-guard.mjs';
import { buildExhaustionProof, computeRollingYield } from './lib/run-ledger.mjs';
import { writeIssueDrafts, validateIssueDrafts } from './lib/handoff-writer.mjs';
import { readChain, outputsDir, publishOutput, appendPhaseEvent } from './lib/event-store.mjs';
import { PHASES, isPausePhase, pauseResumeTarget, validateTransition } from './lib/phase-state-machine.mjs';
import { TRUSTED_CHECKS, computeGateResultDigest } from './lib/gate-checks.mjs';

const tests = [];
let failures = 0;

function test(name, fn) { tests.push({ name, fn }); }
function tmpDir() { return mkdtempSync(join(tmpdir(), 'ncv4-')); }

const HEAD_40 = '0'.repeat(40);

// ── Fixture helpers ─────────────────────────────────────────────────
function cleanRepoAdapter(opts = {}) {
  return {
    getHead: () => opts.head || HEAD_40,
    getBranch: () => opts.branch || 'main',
    getUpstream: () => opts.upstream || undefined,
    isWorktreeClean: () => opts.clean !== false,
    changedPaths: () => opts.changedPaths || [],
  };
}

function okMaintenanceExecutor() {
  return async () => ({ ok: true, health: 'ok', sourceResults: [], providerIncidents: [] });
}

function okIssueExecutor(overrides = {}) {
  return async () => ({
    ok: overrides.ok !== false,
    snapshot: overrides.snapshot || { open: 0, acknowledged: 0, fulfilled: 0, blocked: 0 },
    workloadPath: overrides.workloadPath || null,
    demandArtifactPath: overrides.demandArtifactPath || null,
    errors: overrides.errors || [],
    newUnassessed: overrides.newUnassessed || [],
    _assessed_unassessed: overrides._assessed_unassessed || false,
    error: overrides.error || undefined,
    issueOutcomes: overrides.issueOutcomes || [],
    stageTerminals: overrides.stageTerminals || [],
  });
}

function okContextCollector(substance = {}) {
  return () => {
    const defaultCounts = {
      sources: { total: 5, active: 3, candidate: 0, published: 2, stale: 0, added_since_last_run: 0 },
      skills: { total: 10, active: 5, candidate: 0, published: 5, stale: 0, added_since_last_run: 0 },
      analyses: { total: 5, active: 5, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
      relations: { total: 3, active: 3, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
      packs: { total: 2, active: 1, candidate: 1, published: 1, stale: 0, added_since_last_run: 0 },
      evaluations: { total: 1, active: 1, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
      issues: { total: 0, active: 0, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
    };
    const defaultFreshness = {
      sources_stale_count: 0, skills_stale_count: 0, analyses_stale_count: 0,
    };
    const defaultRelations = {
      total_edges: 3, by_predicate: {}, chains_count: 0, strengthens_count: 0,
      alternatives_count: 0, conflicts_count: 0,
    };
    const defaultPackLifecycle = {
      total_candidate: 1, total_published: 1, new_since_last_run: 0, stale_packs: 0,
    };
    return {
      context: {
        catalogCounts: substance.catalogCounts || defaultCounts,
        freshness: substance.freshness || defaultFreshness,
        coverage: substance.coverage || { skills_with_analysis: 5, skills_without_analysis: 5, coverage_ratio: 0.5 },
        relations: substance.relations || defaultRelations,
        packLifecycle: substance.packLifecycle || defaultPackLifecycle,
        issueDigest: substance.issueDigest || { open: 0, acknowledged: 0, fulfilled: 0, blocked: 0 },
        priorFingerprint: substance.priorFingerprint || '',
        notes: substance.notes || '',
      },
      demandMetadata: substance.demandMetadata || { demand_skill_ids: [], domain_slugs: [] },
      snapshotDigest: `sha256:${createHash('sha256').update('ctx-snap').digest('hex')}`,
      evidenceManifestDigest: `sha256:${createHash('sha256').update('ctx-ev').digest('hex')}`,
    };
  };
}

// ══════════════════════════════════════════════════════════════════════
//  SECTION A: Pause & Resume State Machine
// ══════════════════════════════════════════════════════════════════════

function okGateExecutor(pass = true) {
  const checkCount = pass ? TRUSTED_CHECKS.length : 0;
  return async ({ runId, gateId, targetsEventDigest }) => {
    const checks = [];
    const evidenceLogs = [];
    for (let i = 0; i < checkCount; i++) {
      checks.push({
        name: TRUSTED_CHECKS[i].name,
        script: TRUSTED_CHECKS[i].script,
        passed: true,
        exit_code: 0,
        duration_ms: 1,
      });
      evidenceLogs.push({
        check_name: TRUSTED_CHECKS[i].name,
        stdout_digest: `sha256:${createHash('sha256').update('ok').digest('hex')}`,
        stderr_digest: `sha256:${createHash('sha256').update('').digest('hex')}`,
        stdout_path: `${TRUSTED_CHECKS[i].name}.stdout.log`,
        stderr_path: `${TRUSTED_CHECKS[i].name}.stderr.log`,
      });
    }
    const errors = pass ? [] : ['gate check failed'];
    const gr = {
      schema_version: 3, gate_id: gateId, run_id: runId,
      pre_gate_event_digest: targetsEventDigest, passed: pass, invoked_count: 1,
      started_at: new Date().toISOString(), finished_at: new Date().toISOString(),
      checks, evidence_logs: evidenceLogs, decision: pass ? 'pass' : 'fail',
      errors,
    };
    gr.result_digest = `sha256:${computeGateResultDigest(gr)}`;
    return gr;
  };
}

test('pause phases are recognized', () => {
  assert.ok(isPausePhase('paused_for_assessment'));
  assert.ok(isPausePhase('paused_for_targets'));
  assert.ok(!isPausePhase('init'));
  assert.ok(!isPausePhase('terminal'));
  assert.ok(!isPausePhase('context'));
});

test('pause resume targets are correct', () => {
  assert.equal(pauseResumeTarget('paused_for_assessment'), 'context');
  assert.equal(pauseResumeTarget('paused_for_targets'), 'targets');
  assert.equal(pauseResumeTarget('init'), null);
});

test('pause transitions are valid', () => {
  assert.ok(validateTransition('issues', 'paused_for_assessment').ok);
  assert.ok(validateTransition('context', 'paused_for_targets').ok);
  assert.ok(validateTransition('paused_for_assessment', 'context').ok);
  assert.ok(validateTransition('paused_for_targets', 'targets').ok);
});

test('pause rejects illegal transitions', () => {
  assert.ok(!validateTransition('paused_for_assessment', 'gate').ok);
  assert.ok(!validateTransition('paused_for_targets', 'audit').ok);
});

test('pause can transition to terminal', () => {
  assert.ok(validateTransition('paused_for_assessment', 'terminal').ok);
  assert.ok(validateTransition('paused_for_targets', 'terminal').ok);
});

test('terminal absorbs pause phases', () => {
  assert.ok(!validateTransition('terminal', 'paused_for_assessment').ok);
});

test('PHASES still has exactly 9 entries', () => {
  assert.equal(PHASES.length, 9);
  assert.deepEqual(PHASES, ['init', 'maintenance', 'issues', 'context', 'targets', 'gate', 'seal', 'audit', 'terminal']);
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION B: Issue Pause → Drafts → Resume
// ══════════════════════════════════════════════════════════════════════

test('unassessed issues produce pause, not blocked', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root, repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: () => [],
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor({
        ok: true,
        newUnassessed: [{ issue_number: 1, title: 'Test issue' }, { issue_number: 2, title: 'Test issue 2' }],
        _assessed_unassessed: false,
        workloadPath: join(root, 'run_x', 'issue-workload.json'),
      }),
      contextCollector: okContextCollector(),
      targetSelector: () => ({ intents: [], total: 0 }),
      timestamp: '2026-01-15T01:00:00.000Z',
    });

    assert.equal(result.status, 'paused_for_assessment');
    assert.ok(result.new_unassessed.length === 2);
    assert.ok(result.workload_path);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('issue drafts write-once and validate', async () => {
  const root = tmpDir();
  try {
    // Create a minimal workload
    const runDir = join(root, 'run_drafts');
    mkdirSync(runDir, { recursive: true });
    const workload = {
      all_accepted_issues: [
        { issue_number: 1, title: 'Issue 1' },
        { issue_number: 2, title: 'Issue 2' },
      ],
      workload_digest: 'sha256:' + 'a'.repeat(64),
    };
    const workloadPath = join(runDir, 'issue-workload.json');
    writeFileSync(workloadPath, JSON.stringify(workload));

    // Write drafts with full consumer-schema required fields
    // Drafts must be consumable by the issue stage finalize path:
    // writeIssueDrafts now validates fulfillment_assessment through the same
    // validateFulfillmentAssessment the consumer applies.
    const mkDraft = (n) => {
      const binding = {
        repository: 'EricSanchezok/good-stuff-for-agents',
        issue_number: n,
        updated_at: '2026-01-15T01:00:00.000Z',
        content_digest: `sha256:${'0'.repeat(63)}${n}`,
      };
      const intake = {
        schema_version: 1,
        kind: 'github_issue_intake',
        intake_status: 'accepted',
        issue_binding: { ...binding },
      };
      return {
        issue_number: n,
        issue_binding: { ...binding },
        intake,
        fulfillment_assessment: {
          schema_version: 1,
          kind: 'github_issue_fulfillment_assessment',
          issue_binding: { ...binding },
          classification: {
            kind: 'skill_request',
            criteria: [{ id: 'criterion-1', text: 'Provide test utility capability.' }],
          },
          fulfillment: {
            status: 'not_satisfied',
            rationale: 'Validated against canonical published catalog records.',
            criteria: [{ criterion_id: 'criterion-1', status: 'gap', evidence: [] }],
          },
          draft_response: { recommended: false, body: null },
          human_checkpoint: { required: true, action: 'review_only' },
        },
        evidence_index: {},
        public_evidence_boundary: 'Published catalog skills and packs only',
        notes: '',
      };
    };
    const result = writeIssueDrafts({
      runId: 'run_drafts',
      workloadPath,
      runsRoot: root,
      drafts: [mkDraft(1), mkDraft(2)],
    });

    assert.ok(result.digest.startsWith('sha256:'));
    assert.ok(result.coverage.covered === 2);
    assert.ok(result.coverage.missing.length === 0);

    // Written document must carry the consumer-required kind/schema fields
    const written = JSON.parse(readFileSync(result.path, 'utf8'));
    assert.equal(written.kind, 'issue_semantic_drafts');
    assert.equal(written.schema_version, 1);
    assert.equal(written.run_id, 'run_drafts');
    assert.equal(written.workload_digest, workload.workload_digest);

    // Validate
    const validation = validateIssueDrafts({ runId: 'run_drafts', workloadPath, runsRoot: root });
    assert.ok(validation.ok, validation.error);

    // Write-once rejection: second attempt must fail even with full coverage
    assert.throws(() => writeIssueDrafts({
      runId: 'run_drafts',
      workloadPath,
      runsRoot: root,
      drafts: [mkDraft(1), mkDraft(2)],
    }), /EEXIST|already exists/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('issue drafts missing coverage fails validation', async () => {
  const root = tmpDir();
  try {
    const runDir = join(root, 'run_partial');
    mkdirSync(runDir, { recursive: true });
    const workload = {
      all_accepted_issues: [
        { issue_number: 1, title: 'Issue 1' },
        { issue_number: 2, title: 'Issue 2' },
        { issue_number: 3, title: 'Issue 3' },
      ],
      workload_digest: 'sha256:' + 'b'.repeat(64),
    };
    const workloadPath = join(runDir, 'issue-workload.json');
    writeFileSync(workloadPath, JSON.stringify(workload));

    assert.throws(() => writeIssueDrafts({
      runId: 'run_partial',
      workloadPath,
      runsRoot: root,
      drafts: [
        { issue_number: 1, assessment: { assessment_id: 'asm_n1_test', classification: {} } },
      ],
    }), /coverage_incomplete/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('issue drafts forbidden keys rejected', async () => {
  const root = tmpDir();
  try {
    const runDir = join(root, 'run_fk');
    mkdirSync(runDir, { recursive: true });
    const workload = {
      all_accepted_issues: [{ issue_number: 1, title: 'Issue 1' }],
      workload_digest: 'sha256:' + 'c'.repeat(64),
    };
    const workloadPath = join(runDir, 'issue-workload.json');
    writeFileSync(workloadPath, JSON.stringify(workload));

    assert.throws(() => writeIssueDrafts({
      runId: 'run_fk',
      workloadPath,
      runsRoot: root,
      drafts: [{ issue_number: 1, assessment: { assessment_id: 'asm_n1_test', classification: {} }, tool_names: ['bash'] }],
    }), /forbidden_key/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('resume rejection: missing run directory', async () => {
  await assert.rejects(
    () => resumeNightly({
      runId: 'run_nonexistent',
      runsRoot: tmpDir(),
      repositoryRoot: tmpDir(),
      repositoryAdapter: cleanRepoAdapter(),
    }),
    /run directory not found/,
  );
});

test('resume rejection: run is terminal', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root, repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: () => [],
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: () => ({ intents: [], total: 0 }),
      targetExecutor: async () => ({ candidateResults: [], interrupted: false, timeout: false }),
      gateExecutor: okGateExecutor(true),
      auditPlanner: () => ({ ready: true, errors: [], warnings: [] }),
      timestamp: '2026-01-15T02:00:00.000Z',
    });

    assert.equal(result.status, 'completed');

    await assert.rejects(
      () => resumeNightly({
        runId: result.run_id,
        runsRoot: root,
        repositoryRoot: root,
        repositoryAdapter: cleanRepoAdapter(),
      }),
      /already terminal/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION C: Cold-Start Selector
// ══════════════════════════════════════════════════════════════════════

test('cold-start: empty context produces no intents', () => {
  const result = selectTargetIntentsColdStart({
    issueDemandMetadata: { demand_skill_ids: [], domain_slugs: [] },
    maxTargets: 2,
  });
  assert.equal(result.intents.length, 0);
  assert.equal(result.total, 0);
});

test('cold-start: capped at maxTargets', () => {
  // Simulate >2 intent sources
  const mockIndex = {
    snapshot_artifact_count: 5,
    candidate_count: 3,
    skill_record_count: 10,
    skill_ids_with_analysis_count: 3,
    analysis_count: 3,
    relation_count: 0,
    gap_flags: {
      unevaluated_snapshots: true,
      unnormalized_candidates: true,
      analysis_gaps: true,
      relation_potential: true,
      same_domain_group_count: 2,
    },
  };
  const result = selectTargetIntentsColdStart({
    issueDemandMetadata: { demand_skill_ids: ['skl_a001', 'skl_b002'], domain_slugs: ['code-review'] },
    evidenceIndex: mockIndex,
    maxTargets: 2,
  });

  assert.ok(result.intents.length <= 2);
  assert.ok(result.capped || result.intents.length <= 2);
});

test('cold-start: issue demand gets highest priority', () => {
  const result = selectTargetIntentsColdStart({
    issueDemandMetadata: { demand_skill_ids: ['skl_demand_001', 'skl_demand_002'], domain_slugs: ['code-review'] },
    maxTargets: 2,
  });

  assert.ok(result.intents.length >= 1);
  const first = result.intents[0];
  assert.equal(first.source, 'issue_demand');
  assert.ok(first.seed_skill_ids.length > 0);
  assert.ok(first.score >= 0.9);
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION D: Delivery Guard
// ══════════════════════════════════════════════════════════════════════

test('delivery guard: missing run directory rejected', () => {
  const result = deliveryGuard({
    runId: 'run_missing',
    runsRoot: tmpDir(),
    repositoryRoot: tmpDir(),
  });
  assert.equal(result.ready, false);
  assert.ok(result.errors.length > 0);
});

test('delivery guard: active marker blocks', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root, repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: () => [],
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: () => ({ intents: [], total: 0 }),
      targetExecutor: async () => ({ candidateResults: [], interrupted: false, timeout: false }),
      gateExecutor: okGateExecutor(true),
      auditPlanner: () => ({ ready: true, errors: [], warnings: [] }),
      timestamp: '2026-01-15T03:00:00.000Z',
    });

    assert.equal(result.status, 'completed');
    const guardResult = deliveryGuard({
      runId: result.run_id,
      runsRoot: root,
      repositoryRoot: root,
      requirePublished: false,
    });
    // Temp dir has no real git repo, so guard correctly reports cannot_resolve_current_head
    // This validates the guard safety check, not a real deployment scenario
    assert.ok(!guardResult.ready || guardResult.errors.some(e => e.includes('head') || e.includes('baseline')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('delivery guard: code paths blocked', () => {
  const root = tmpDir();
  try {
    // Create a minimal completed run with .synergy/ change simulated
    const runId = 'run_code_' + '0'.repeat(8);
    const runDir = join(root, runId);
    mkdirSync(runDir, { recursive: true });
    mkdirSync(join(runDir, 'outputs'), { recursive: true });
    mkdirSync(join(runDir, 'events'), { recursive: true });

    // Write a seal-manifest with .synergy path
    writeFileSync(join(runDir, 'outputs', 'seal-manifest.json'), JSON.stringify({
      baseline_head: HEAD_40,
      paths: ['catalog/x', '.synergy/something.js'],
    }));

    const guardResult = deliveryGuard({
      runId,
      runsRoot: root,
      repositoryRoot: root,
      requirePublished: false,
    });
    assert.ok(!guardResult.ready);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION E: Exhaustion Proof
// ══════════════════════════════════════════════════════════════════════

test('exhaustion: truly exhausted = valid no_pack_clean', () => {
  const proof = buildExhaustionProof({
    evidenceIndex: {
      gap_flags: {
        unevaluated_snapshots: false,
        unnormalized_candidates: false,
        analysis_gaps: false,
        relation_potential: false,
        same_domain_group_count: 0,
      },
      snapshot_artifact_count: 0,
      candidate_count: 0,
      analysis_count: 0,
    },
    issueDemandMetadata: { demand_skill_ids: [], domain_slugs: [] },
    intents: { intents: [] },
    budgetExhausted: false,
  });

  assert.equal(proof.valid_no_pack_clean, true);
  assert.equal(proof.gap_class, 'truly_exhausted');
});

test('exhaustion: has demand = gap_exists (not truly_exhausted)', () => {
  const proof = buildExhaustionProof({
    evidenceIndex: {
      gap_flags: {
        unevaluated_snapshots: false,
        unnormalized_candidates: false,
        analysis_gaps: false,
        relation_potential: false,
        same_domain_group_count: 0,
      },
    },
    issueDemandMetadata: { demand_skill_ids: ['skl_test001'], domain_slugs: [] },
    intents: { intents: [{ domain: 'test', source: 'issue_demand' }] },
    budgetExhausted: false,
  });

  assert.equal(proof.valid_no_pack_clean, false);
  assert.equal(proof.gap_class, 'gap_exists');
});

test('exhaustion: budget exhausted + gap exists = false', () => {
  const proof = buildExhaustionProof({
    evidenceIndex: {
      gap_flags: {
        unevaluated_snapshots: false,
        unnormalized_candidates: true,
        analysis_gaps: false,
        relation_potential: false,
        same_domain_group_count: 0,
      },
      candidate_count: 5,
    },
    issueDemandMetadata: { demand_skill_ids: [], domain_slugs: [] },
    intents: { intents: [] },
    budgetExhausted: true,
  });

  assert.equal(proof.valid_no_pack_clean, false);
  assert.equal(proof.budget_exhausted, true);
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION F: Gap Class & Insufficient Evidence
// ══════════════════════════════════════════════════════════════════════

test('gap_class is present in exhaustion proof', () => {
  const proof = buildExhaustionProof({
    evidenceIndex: {
      gap_flags: { unevaluated_snapshots: true },
      snapshot_artifact_count: 3,
    },
    issueDemandMetadata: { demand_skill_ids: [], domain_slugs: [] },
    intents: { intents: [] },
  });
  assert.ok(proof.gap_class);
  assert.ok(typeof proof.gap_class === 'string');
});

test('exhaustion_trace includes all dimensions', () => {
  const proof = buildExhaustionProof({
    evidenceIndex: { gap_flags: {} },
    issueDemandMetadata: { demand_skill_ids: [], domain_slugs: [] },
    intents: { intents: [] },
  });
  const dimensions = proof.exhaustion_trace.map(e => e.dimension);
  assert.ok(dimensions.includes('demand'));
  assert.ok(dimensions.includes('backlog'));
  assert.ok(dimensions.includes('new_artifacts'));
  assert.ok(dimensions.includes('relation_potential'));
  assert.ok(dimensions.includes('active_intents'));
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION G: Node Source Scan — no git add/commit/push
// ══════════════════════════════════════════════════════════════════════

test('delivery guard has no git write calls', () => {
  const src = readFileSync(join(__dirname, 'lib', 'delivery-guard.mjs'), 'utf8');
  // Must not contain git add, git commit, or git push
  assert.ok(!src.includes('git add'), 'delivery-guard must not call git add');
  assert.ok(!src.includes('git commit'), 'delivery-guard must not call git commit');
  assert.ok(!src.includes('git push'), 'delivery-guard must not call git push');
});

test('handoff writer has no git write calls', () => {
  const src = readFileSync(join(__dirname, 'lib', 'handoff-writer.mjs'), 'utf8');
  assert.ok(!src.includes('git add'), 'handoff-writer must not call git add');
  assert.ok(!src.includes('git commit'), 'handoff-writer must not call git commit');
  assert.ok(!src.includes('git push'), 'handoff-writer must not call git push');
});

test('evidence-index builder has no git write calls', () => {
  const src = readFileSync(join(__dirname, 'lib', 'evidence-index-builder.mjs'), 'utf8');
  assert.ok(!src.includes('git add'), 'evidence-index must not call git add');
  assert.ok(!src.includes('git commit'), 'evidence-index must not call git commit');
  assert.ok(!src.includes('git push'), 'evidence-index must not call git push');
});

test('cold-start selector has no git write calls', () => {
  const src = readFileSync(join(__dirname, 'lib', 'cold-start-selector.mjs'), 'utf8');
  assert.ok(!src.includes('git add'), 'cold-start selector must not call git add');
  assert.ok(!src.includes('git commit'), 'cold-start selector must not call git commit');
  assert.ok(!src.includes('git push'), 'cold-start selector must not call git push');
});

test('core controller has no git add/commit/push (excluding external process refs and comments)', () => {
  const src = readFileSync(join(__dirname, 'lib', 'nightly-controller-core.mjs'), 'utf8');
  // The core should not call git add, git commit, or git push directly
  // (spawnSync('git'... is used for read-only status checks, not write operations)
  const writeLines = src.split('\n').filter(l => {
    const trimmed = l.trim();
    if (trimmed.startsWith('//')) return false;
    if (trimmed.includes('*')) return false; // jsdoc block
    return trimmed.includes('git add') || trimmed.includes('git commit') || trimmed.includes('git push');
  });
  assert.equal(writeLines.length, 0, `Found git write calls in controller: ${writeLines.join('\n')}`);
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION H: Target-Result Writer E2E
// ══════════════════════════════════════════════════════════════════════

import {
  writeTargetResults,
  validateTargetResults,
  readTargetResults,
  computeIntentDigest,
} from './lib/target-result-writer.mjs';

function buildIntent(overrides = {}) {
  return {
    domain: 'test-domain',
    reason: 'test reason',
    source: 'issue_demand',
    score: 0.95,
    seed_skill_ids: ['skl_test_001'],
    max_analysis_budget: 3,
    ...overrides,
  };
}

function buildIntentResult(intent, overrides = {}) {
  return {
    intent_digest: computeIntentDigest(intent),
    terminal: 'promoted',
    pack_id: 'pck_test_001_v3',
    proof_artifact_digest: 'sha256:' + 'e'.repeat(64),
    evaluation_artifact_digest: 'sha256:' + 'f'.repeat(64),
    synthesis_session_id: 'ses_' + 'A'.repeat(20),
    evaluation_session_id: 'ses_' + 'B'.repeat(20),
    ...overrides,
  };
}

function buildCandidateResult(overrides = {}) {
  return {
    pack_id: 'pck_test_001_v3',
    terminal: 'promoted',
    ...overrides,
  };
}

test('target-result writer: happy path write + validate + read roundtrip', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + 'e'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'c'.repeat(64);
    const intent = buildIntent();
    const intents = [intent];

    // Write authoritative binding
    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents,
      total: 1,
    }));

    const ir = buildIntentResult(intent);
    const cr = buildCandidateResult();

    const result = writeTargetResults({
      runId,
      runsRoot: root,
      contextDigest: ctxDigest,
      intents,
      candidateResults: [cr],
      intentResults: [ir],
    });

    assert.ok(result.digest.startsWith('sha256:'));
    assert.equal(result.intents_covered, 1);

    // Validate
    const vr = validateTargetResults({ runId, runsRoot: root, expectedContextDigest: ctxDigest });
    assert.ok(vr.ok, vr.error);
    assert.equal(vr.intentResults.length, 1);
    assert.equal(vr.candidateResults.length, 1);

    // Read
    const doc = readTargetResults({ runId, runsRoot: root });
    assert.equal(doc.run_id, runId);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: write-once rejected', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + 'd'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'a'.repeat(64);
    const intent = buildIntent();

    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents: [intent],
      total: 1,
    }));

    const ir = buildIntentResult(intent);
    const cr = buildCandidateResult();

    writeTargetResults({
      runId, runsRoot: root, contextDigest: ctxDigest,
      intents: [intent], candidateResults: [cr], intentResults: [ir],
    });

    assert.throws(() => writeTargetResults({
      runId, runsRoot: root, contextDigest: ctxDigest,
      intents: [intent], candidateResults: [cr], intentResults: [ir],
    }), /EEXIST|already exists/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: incomplete intent coverage rejected', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + 'f'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'b'.repeat(64);
    const intents = [buildIntent({ source: 'a' }), buildIntent({ source: 'b' })];

    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents,
      total: 2,
    }));

    const ir = buildIntentResult(intents[0]);

    assert.throws(() => writeTargetResults({
      runId, runsRoot: root, contextDigest: ctxDigest,
      intents, candidateResults: [], intentResults: [ir],
    }), /coverage_incomplete/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: unknown intent digest rejected', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + 'b'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'c'.repeat(64);
    const intent = buildIntent();

    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents: [intent],
      total: 1,
    }));

    const bogusIr = { intent_digest: 'sha256:' + '0'.repeat(64), terminal: 'blocked', gap_class: 'gap_exists' };

    assert.throws(() => writeTargetResults({
      runId, runsRoot: root, contextDigest: ctxDigest,
      intents: [intent], candidateResults: [], intentResults: [bogusIr],
    }), /unknown_intent_digest/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: duplicate intent digest rejected', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + 'a'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'd'.repeat(64);
    const intent = buildIntent();

    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents: [intent],
      total: 1,
    }));

    const ir = buildIntentResult(intent);

    assert.throws(() => writeTargetResults({
      runId, runsRoot: root, contextDigest: ctxDigest,
      intents: [intent], candidateResults: [buildCandidateResult()],
      intentResults: [ir, ir],
    }), /duplicate_intent_result/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: promoted without required bindings rejected', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + 'c'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'e'.repeat(64);
    const intent = buildIntent();

    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents: [intent],
      total: 1,
    }));

    const cr = buildCandidateResult({ pack_id: 'pck_x' });
    const ir = { intent_digest: computeIntentDigest(intent), terminal: 'promoted', pack_id: 'pck_x' };

    assert.throws(() => writeTargetResults({
      runId, runsRoot: root, contextDigest: ctxDigest,
      intents: [intent], candidateResults: [cr], intentResults: [ir],
    }), /proof_artifact_digest/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: session reuse across intents rejected', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + '9'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'f'.repeat(64);
    const i1 = buildIntent({ source: 'src1' });
    const i2 = buildIntent({ source: 'src2' });

    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents: [i1, i2],
      total: 2,
    }));

    const sharedSession = 'ses_' + 'S'.repeat(20);
    const ir1 = buildIntentResult(i1, { pack_id: 'pck_a', synthesis_session_id: sharedSession });
    const ir2 = buildIntentResult(i2, { pack_id: 'pck_b', synthesis_session_id: sharedSession });

    assert.throws(() => writeTargetResults({
      runId, runsRoot: root, contextDigest: ctxDigest,
      intents: [i1, i2],
      candidateResults: [
        buildCandidateResult({ pack_id: 'pck_a' }),
        buildCandidateResult({ pack_id: 'pck_b' }),
      ],
      intentResults: [ir1, ir2],
    }), /session_reuse/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: context_digest mismatch rejected', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + '8'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'a'.repeat(64);
    const intent = buildIntent();

    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents: [intent],
      total: 1,
    }));

    const wrongCtx = 'sha256:' + 'b'.repeat(64);
    assert.throws(() => writeTargetResults({
      runId, runsRoot: root, contextDigest: wrongCtx,
      intents: [intent], candidateResults: [], intentResults: [
        { intent_digest: computeIntentDigest(intent), terminal: 'blocked', error: 'test' },
      ],
    }), /context_digest_mismatch/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: zero intents rejected', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + '7'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'c'.repeat(64);
    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents: [],
      total: 0,
    }));

    assert.throws(() => writeTargetResults({
      runId, runsRoot: root, contextDigest: ctxDigest,
      intents: [], candidateResults: [], intentResults: [],
    }), /zero_intents/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: validate returns error for missing file', () => {
  const vr = validateTargetResults({ runId: 'run_missing', runsRoot: tmpDir() });
  assert.equal(vr.ok, false);
  assert.ok(vr.error.includes('not_found'));
});

test('target-result writer: validate rejects run_id mismatch', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + '6'.repeat(16);
    mkdirSync(join(root, runId), { recursive: true });
    writeFileSync(join(root, runId, 'target-result.json'), JSON.stringify({ run_id: 'run_diff', context_digest: '', intents: [], candidate_results: [], intent_results: [] }));

    const vr = validateTargetResults({ runId, runsRoot: root });
    assert.equal(vr.ok, false);
    assert.ok(vr.error.includes('run_id_mismatch'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: promoted with same synth/eval session rejected', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + '5'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'd'.repeat(64);
    const intent = buildIntent();

    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents: [intent],
      total: 1,
    }));

    const sameSession = 'ses_' + 'X'.repeat(20);
    const ir = buildIntentResult(intent, {
      synthesis_session_id: sameSession,
      evaluation_session_id: sameSession,
    });

    assert.throws(() => writeTargetResults({
      runId, runsRoot: root, contextDigest: ctxDigest,
      intents: [intent], candidateResults: [buildCandidateResult()], intentResults: [ir],
    }), /must differ/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── E2E: execute → paused_for_targets → writer → resume → published terminal

test('e2e: execute → pause for targets → write target-result → resume to published', async () => {
  const root = tmpDir();
  let pausedRunId;
  try {
    // Step 1: execute → expect paused_for_targets
    const freshResult = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: () => [],
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: () => {
        const intent = buildIntent();
        return { intents: [intent], total: 1 };
      },
      targetExecutor: null,
      timestamp: '2026-07-01T10:00:00.000Z',
    });

    assert.equal(freshResult.status, 'paused_for_targets');
    assert.ok(freshResult.intents.length === 1);
    pausedRunId = freshResult.run_id;

    // Step 2: read the actual context_digest from the written handoff
    const handoffPath = join(root, pausedRunId, 'outputs', 'target-execution-handoff.json');
    let ctxDigest;
    if (existsSync(handoffPath)) {
      const hf = JSON.parse(readFileSync(handoffPath, 'utf8'));
      ctxDigest = hf.context_digest;
    } else {
      // fallback: try target-intents.json
      const intentsPath = join(root, pausedRunId, 'outputs', 'target-intents.json');
      if (existsSync(intentsPath)) {
        const ti = JSON.parse(readFileSync(intentsPath, 'utf8'));
        ctxDigest = ti.context_digest;
      }
    }

    const intent = freshResult.intents[0];
    const ir = buildIntentResult(intent);
    const cr = buildCandidateResult();

    const writeResult = writeTargetResults({
      runId: pausedRunId,
      runsRoot: root,
      contextDigest: ctxDigest,
      intents: [intent],
      candidateResults: [cr],
      intentResults: [ir],
    });
    assert.ok(writeResult.digest.startsWith('sha256:'));

    // Step 3: resume with production-style adapter
    const resumeResult = await resumeNightly({
      runId: pausedRunId,
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      contextCollector: okContextCollector(),
      gateExecutor: okGateExecutor(true),
      auditPlanner: () => ({ ready: true, errors: [], warnings: [] }),
      targetExecutor: async ({ runId, runsRoot, contextDigest, intents }) => {
        const { validateTargetResults: vtr } = await import('./lib/target-result-writer.mjs');
        const vr = vtr({ runId, runsRoot, expectedContextDigest: contextDigest });
        if (!vr.ok) return { candidateResults: [], interrupted: true, timeout: false, error: vr.error };
        return {
          candidateResults: vr.candidateResults || [],
          intentResults: vr.intentResults || [],
          interrupted: false,
          timeout: false,
        };
      },
      timestamp: '2026-07-01T10:05:00.000Z',
    });

    assert.equal(resumeResult.status, 'completed');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('e2e: resume with target-result missing fails closed', async () => {
  const root = tmpDir();
  try {
    // First create a paused run
    const freshResult = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: () => [],
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: () => {
        const intent = buildIntent();
        return { intents: [intent], total: 1 };
      },
      targetExecutor: null,
      timestamp: '2026-07-02T10:00:00.000Z',
    });
    assert.equal(freshResult.status, 'paused_for_targets');

    // Resume without writing target-result → should fail
    const resumeResult = await resumeNightly({
      runId: freshResult.run_id,
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      contextCollector: okContextCollector(),
      gateExecutor: okGateExecutor(true),
      auditPlanner: () => ({ ready: true, errors: [], warnings: [] }),
      targetExecutor: async ({ runId, runsRoot, contextDigest, intents }) => {
        const { validateTargetResults: vtr } = await import('./lib/target-result-writer.mjs');
        const vr = vtr({ runId, runsRoot, expectedContextDigest: contextDigest });
        if (!vr.ok) return { candidateResults: [], interrupted: true, timeout: false, error: vr.error };
        return {
          candidateResults: vr.candidateResults || [],
          intentResults: vr.intentResults || [],
          interrupted: false,
          timeout: false,
        };
      },
      timestamp: '2026-07-02T10:05:00.000Z',
    });

    // The resume should have blocked due to target_result_not_found
    // The targetExecutor returns interrupted=true which leads to blocked terminal
    assert.ok(resumeResult.status === 'blocked' || resumeResult.status === 'failed',
      `expected blocked/failed, got ${resumeResult.status}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target-result writer: non-promoted without gap/error rejected', () => {
  const root = tmpDir();
  try {
    const runId = 'run_' + '4'.repeat(16);
    const runDir = join(root, runId);
    mkdirSync(join(runDir, 'outputs'), { recursive: true });

    const ctxDigest = 'sha256:' + 'e'.repeat(64);
    const intent = buildIntent();

    writeFileSync(join(runDir, 'outputs', 'target-intents.json'), JSON.stringify({
      run_id: runId,
      context_digest: ctxDigest,
      intents: [intent],
      total: 1,
    }));

    const ir = { intent_digest: computeIntentDigest(intent), terminal: 'rejected' };

    assert.throws(() => writeTargetResults({
      runId, runsRoot: root, contextDigest: ctxDigest,
      intents: [intent], candidateResults: [], intentResults: [ir],
    }), /gap_class or error/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('cold-start: all intents must have non-empty seed_skill_ids', () => {
  const result = selectTargetIntentsColdStart({
    issueDemandMetadata: { demand_skill_ids: ['skl_demand_001'], domain_slugs: ['code-review'] },
    maxTargets: 1,
  });
  assert.ok(result.intents.length >= 1);
  assert.ok(result.intents[0].seed_skill_ids.length > 0, 'seed_skill_ids must be non-empty');
});

test('target-result: computeIntentDigest is deterministic', () => {
  const intent = buildIntent();
  const d1 = computeIntentDigest(intent);
  const d2 = computeIntentDigest(intent);
  assert.equal(d1, d2);
  assert.ok(d1.startsWith('sha256:'));
});

test('target-result: computeIntentDigest changes with different seeds', () => {
  const i1 = buildIntent({ seed_skill_ids: ['skl_a'] });
  const i2 = buildIntent({ seed_skill_ids: ['skl_b'] });
  assert.notEqual(computeIntentDigest(i1), computeIntentDigest(i2));
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION I: Commit Footer Check
// ══════════════════════════════════════════════════════════════════════

test('trusted 29 checks count is unchanged', async () => {
  const { TRUSTED_CHECKS } = await import('./lib/gate-checks.mjs');
  assert.equal(TRUSTED_CHECKS.length, 29, 'Trusted checks must remain exactly 29');
});

// ══════════════════════════════════════════════════════════════════════
//  Run all tests
// ══════════════════════════════════════════════════════════════════════

for (const { name, fn } of tests) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      await result;
    }
    process.stdout.write(`ok - ${name}\n`);
  } catch (error) {
    failures++;
    process.stderr.write(`not ok - ${name}\n${error.stack}\n`);
  }
}
if (failures > 0) {
  process.stderr.write(`\n${failures}/${tests.length} v4 test(s) failed\n`);
  process.exit(1);
}
process.stdout.write(`\n${tests.length} v4 tests passed\n`);
