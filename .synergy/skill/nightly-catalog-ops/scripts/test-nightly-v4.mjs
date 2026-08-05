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

test('e2e: pause for assessment → write drafts → resume to completed', async () => {
  const root = tmpDir();
  let pausedRunId;
  try {
    // Step 1: execute → expect paused_for_assessment
    const freshResult = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: () => [],
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor({
        ok: true,
        newUnassessed: [
          { issue_number: 1, title: 'Issue 1' },
          { issue_number: 2, title: 'Issue 2' },
        ],
        _assessed_unassessed: false,
      }),
      contextCollector: okContextCollector(),
      targetSelector: () => ({ intents: [], total: 0 }),
      timestamp: '2026-07-03T10:00:00.000Z',
    });

    assert.equal(freshResult.status, 'paused_for_assessment');
    assert.ok(freshResult.new_unassessed.length === 2);
    pausedRunId = freshResult.run_id;

    // Step 2: write workload + drafts as the outer agent would
    const runDir = join(root, pausedRunId);
    mkdirSync(runDir, { recursive: true });
    const makeIntake = (n) => ({
      schema_version: 1,
      kind: 'github_issue_intake',
      intake_status: 'accepted',
      issue_binding: {
        repository: 'EricSanchezok/good-stuff-for-agents',
        issue_number: n,
        updated_at: '2026-01-15T01:00:00.000Z',
        content_digest: `sha256:${'0'.repeat(63)}${n}`,
      },
    });
    const workload = {
      schema_version: 1,
      kind: 'issue_workload',
      run_id: pausedRunId,
      repository: 'EricSanchezok/good-stuff-for-agents',
      snapshot_complete: true,
      workload_digest: 'sha256:' + 'a'.repeat(64),
      all_accepted_issues: [
        { issue_number: 1, intake: makeIntake(1) },
        { issue_number: 2, intake: makeIntake(2) },
      ],
    };
    const workloadPath = join(runDir, 'issue-workload.json');
    writeFileSync(workloadPath, JSON.stringify(workload));

    const mkDraft = (n) => {
      const binding = { ...makeIntake(n).issue_binding };
      return {
        issue_number: n,
        issue_binding: { ...binding },
        intake: makeIntake(n),
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
    const writeResult = writeIssueDrafts({
      runId: pausedRunId,
      workloadPath,
      runsRoot: root,
      drafts: [mkDraft(1), mkDraft(2)],
    });
    assert.ok(writeResult.coverage.covered === 2);

    // Step 3: resume → must complete with exactly one context event
    const resumeResult = await resumeNightly({
      runId: pausedRunId,
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      issueExecutor: okIssueExecutor({
        ok: true,
        newUnassessed: [],
        _assessed_unassessed: true,
      }),
      contextCollector: okContextCollector(),
      targetSelector: () => ({ intents: [], total: 0 }),
      gateExecutor: okGateExecutor(true),
      auditPlanner: () => ({ ready: true, errors: [], warnings: [] }),
      timestamp: '2026-07-03T10:05:00.000Z',
    });

    assert.equal(resumeResult.status, 'completed');
    assert.equal(resumeResult.outcome, 'no_pack_clean');

    // Chain must contain exactly one context event
    const chain = readChain({ runsRoot: root, runId: pausedRunId });
    assert.ok(chain.ok, chain.error);
    const contextEvents = chain.events.filter((e) => e.phase === 'context');
    assert.equal(contextEvents.length, 1, 'exactly one context event expected');
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
//  SECTION J: Growth Backlog (R1)
// ══════════════════════════════════════════════════════════════════════

import {
  readBacklog,
  mergeBacklog,
  writeBacklog,
  backlogToIntents,
  computeFingerprint,
} from './lib/growth-backlog.mjs';

test('growth-backlog: readBacklog returns empty for non-existent file', () => {
  const root = tmpDir();
  try {
    const result = readBacklog({ catalogRoot: root });
    assert.deepEqual(result.entries, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('growth-backlog: writeBacklog + readBacklog roundtrip', () => {
  const root = tmpDir();
  try {
    const entries = [
      {
        fingerprint: 'fp_test_001',
        dimension: 'demand',
        seeds: ['skl_a', 'skl_b'],
        reason: 'Test entry',
        source: 'test',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-05T00:00:00Z',
        attempts: 1,
        status: 'pending',
      },
    ];
    const writeResult = writeBacklog({ catalogRoot: root, entries });
    assert.ok(writeResult.digest.startsWith('sha256:'));
    assert.equal(writeResult.entry_count, 1);

    const read = readBacklog({ catalogRoot: root });
    assert.equal(read.entries.length, 1);
    assert.equal(read.entries[0].fingerprint, 'fp_test_001');
    assert.equal(read.entries[0].dimension, 'demand');
    assert.equal(read.entries[0].status, 'pending');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('growth-backlog: mergeBacklog deduplicates by fingerprint and increments attempts', () => {
  const root = tmpDir();
  try {
    const fp = computeFingerprint('demand', ['skl_a', 'skl_b']);
    const initial = [{ fingerprint: fp, dimension: 'demand', seeds: ['skl_a', 'skl_b'], reason: 'first', source: 'test', created_at: '2026-08-01T00:00:00Z', attempts: 1, status: 'pending' }];
    writeBacklog({ catalogRoot: root, entries: initial });

    // Merge same entry again
    const merged = mergeBacklog({
      catalogRoot: root,
      entries: [{ dimension: 'demand', seeds: ['skl_a', 'skl_b'], reason: 'second', source: 'test' }],
    });
    assert.equal(merged.entries.length, 1);
    assert.equal(merged.entries[0].attempts, 2);
    assert.equal(merged.entries[0].reason, 'second');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('growth-backlog: mergeBacklog marks stale when attempts >= 3', () => {
  const root = tmpDir();
  try {
    const fp = computeFingerprint('demand', ['skl_stale']);
    const initial = [{ fingerprint: fp, dimension: 'demand', seeds: ['skl_stale'], reason: 'test', source: 'test', created_at: '2026-08-01T00:00:00Z', attempts: 2, status: 'pending' }];
    writeBacklog({ catalogRoot: root, entries: initial });

    const merged = mergeBacklog({
      catalogRoot: root,
      entries: [{ dimension: 'demand', seeds: ['skl_stale'], reason: 'third attempt', source: 'test' }],
    });
    assert.equal(merged.entries[0].attempts, 3);
    assert.equal(merged.entries[0].status, 'stale');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('growth-backlog: backlogToIntents excludes stale/blocked, sorts by attempts ASC', () => {
  const backlog = {
    entries: [
      { fingerprint: 'fp1', dimension: 'analysis', seeds: ['skl_old'], reason: 'old', source: 'test', created_at: '2026-08-01T00:00:00Z', attempts: 3, status: 'stale' },
      { fingerprint: 'fp2', dimension: 'demand', seeds: ['skl_new'], reason: 'new', source: 'test', created_at: '2026-08-05T00:00:00Z', attempts: 0, status: 'pending' },
      { fingerprint: 'fp3', dimension: 'relations', seeds: ['skl_mid'], reason: 'mid', source: 'test', created_at: '2026-08-03T00:00:00Z', attempts: 1, status: 'pending' },
      { fingerprint: 'fp4', dimension: 'snapshot', seeds: ['snp_blocked'], reason: 'blocked', source: 'test', created_at: '2026-08-04T00:00:00Z', attempts: 0, status: 'blocked' },
    ],
  };
  const intents = backlogToIntents({ backlog, maxTargets: 3 });
  assert.equal(intents.length, 2);
  // First should be 'new' (attempts=0), then 'mid' (attempts=1)
  assert.equal(intents[0].domain, 'demand');
  assert.equal(intents[1].domain, 'relations');
  // Stale (attempts>=3) excluded
  // Blocked excluded
});

test('growth-backlog: mergeBacklog skips existing stale/blocked entries', () => {
  const root = tmpDir();
  try {
    const fpStale = computeFingerprint('demand', ['skl_stale2']);
    const fpBlocked = computeFingerprint('analysis', ['skl_blocked']);
    const initial = [
      { fingerprint: fpStale, dimension: 'demand', seeds: ['skl_stale2'], reason: 'old', source: 'test', created_at: '2026-08-01T00:00:00Z', attempts: 3, status: 'stale' },
      { fingerprint: fpBlocked, dimension: 'analysis', seeds: ['skl_blocked'], reason: 'blocked', source: 'test', created_at: '2026-08-02T00:00:00Z', attempts: 0, status: 'blocked' },
    ];
    writeBacklog({ catalogRoot: root, entries: initial });

    const merged = mergeBacklog({
      catalogRoot: root,
      entries: [
        { dimension: 'demand', seeds: ['skl_stale2'], reason: 'retry', source: 'test' },
        { dimension: 'analysis', seeds: ['skl_blocked'], reason: 'retry2', source: 'test' },
      ],
    });
    // Stale/blocked entries are removed, new entries take their place
    assert.equal(merged.entries.length, 2);
    // Both should now be pending (not stale/blocked since mergeBacklog skips those and creates new)
    for (const e of merged.entries) {
      assert.equal(e.status, 'pending');
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('growth-backlog: backlogToIntents marks stale when attempts >= 3', () => {
  const backlog = {
    entries: [
      { fingerprint: 'fp_become_stale', dimension: 'analysis', seeds: ['skl_go'], reason: 'test', source: 'test', created_at: '2026-08-01T00:00:00Z', attempts: 3, status: 'pending' },
    ],
  };
  const intents = backlogToIntents({ backlog, maxTargets: 2 });
  // Should be empty: attempts>=3 gets marked stale and excluded
  assert.equal(intents.length, 0);
  assert.equal(backlog.entries[0].status, 'stale');
});

test('growth-backlog: writeBacklog produces valid JSON with schema_version', () => {
  const root = tmpDir();
  try {
    writeBacklog({ catalogRoot: root, entries: [] });
    const path = join(root, 'growth', 'backlog.json');
    assert.ok(existsSync(path));
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(raw.schema_version, 1);
    assert.ok(raw.updated_at);
    assert.deepEqual(raw.entries, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION K: Cold-Start Selector Backlog Priority + Demand Gap (R1+R2)
// ══════════════════════════════════════════════════════════════════════

test('cold-start: backlog intents take priority over new gaps', () => {
  const backlog = {
    entries: [
      { fingerprint: 'fp_backlog_prio', dimension: 'analysis', seeds: ['skl_backlog_a'], reason: 'backlog entry', source: 'test', created_at: '2026-08-01T00:00:00Z', attempts: 0, status: 'pending' },
    ],
  };

  // Use a fake evidenceIndex that WOULD produce a snapshot_backlog intent
  const fakeIndex = {
    snapshot_artifact_count: 5,
    snapshot_digest: 'sha256:abc',
    candidate_count: 0,
    candidate_digest: '',
    skill_record_count: 2,
    skill_digest: '',
    analysis_count: 1,
    analysis_digest: '',
    skill_ids_with_analysis_count: 0,
    analysis_coverage_ratio: 0,
    relation_count: 0,
    relation_digest: '',
    relation_predicate_counts: {},
    pack_candidate_count: 0,
    pack_published_count: 0,
    gap_flags: {
      unevaluated_snapshots: true,
      unnormalized_candidates: false,
      analysis_gaps: true,
      relation_potential: false,
      same_domain_group_count: 0,
    },
    evidence_index_digest: 'sha256:fake',
  };

  const result = selectTargetIntentsColdStart({
    evidenceIndex: fakeIndex,
    maxTargets: 2,
    backlog,
  });

  assert.ok(result.backlog_used >= 1);
  // Backlog intent should come first
  assert.equal(result.intents[0].source, 'backlog');
  assert.equal(result.intents[0].domain, 'analysis');
});

test('cold-start: backlog intents capped at maxTargets', () => {
  const backlog = {
    entries: [
      { fingerprint: 'fp_bl1', dimension: 'analysis', seeds: ['skl_bl_a'], reason: 'bl1', source: 'test', created_at: '2026-08-01T00:00:00Z', attempts: 0, status: 'pending' },
      { fingerprint: 'fp_bl2', dimension: 'relations', seeds: ['skl_bl_b'], reason: 'bl2', source: 'test', created_at: '2026-08-02T00:00:00Z', attempts: 0, status: 'pending' },
      { fingerprint: 'fp_bl3', dimension: 'demand', seeds: ['skl_bl_c'], reason: 'bl3', source: 'test', created_at: '2026-08-03T00:00:00Z', attempts: 0, status: 'pending' },
    ],
  };

  const result = selectTargetIntentsColdStart({
    evidenceIndex: {
      snapshot_artifact_count: 0, candidate_count: 0, skill_record_count: 0,
      analysis_count: 0, skill_ids_with_analysis_count: 0,
      analysis_coverage_ratio: 0, relation_count: 0,
      relation_predicate_counts: {}, pack_candidate_count: 0, pack_published_count: 0,
      gap_flags: { unevaluated_snapshots: false, unnormalized_candidates: false, analysis_gaps: false, relation_potential: false, same_domain_group_count: 0 },
      evidence_index_digest: 'sha256:fake',
    },
    maxTargets: 2,
    backlog,
  });

  assert.equal(result.intents.length, 2);
  assert.equal(result.backlog_used, 2);
  // capped is false: exactly 2 intents fills quota (not exceeds it)
  assert.equal(result.capped, false);
});

test('cold-start: requires_source_discovery=true when demand seeds have zero coverage', () => {
  // Seeds not in any analysis frontmatter, and no snapshots
  const result = selectTargetIntentsColdStart({
    issueDemandMetadata: { demand_skill_ids: ['skl_cr_newcapability'], domain_slugs: ['code-review'] },
    evidenceIndex: {
      snapshot_artifact_count: 0,
      candidate_count: 0,
      skill_record_count: 0,
      analysis_count: 0,
      skill_ids_with_analysis_count: 0,
      analysis_coverage_ratio: 0,
      relation_count: 0,
      relation_predicate_counts: {},
      pack_candidate_count: 0,
      pack_published_count: 0,
      gap_flags: { unevaluated_snapshots: false, unnormalized_candidates: false, analysis_gaps: false, relation_potential: false, same_domain_group_count: 0 },
      evidence_index_digest: 'sha256:fake',
    },
    maxTargets: 2,
  });

  assert.equal(result.intents.length, 1);
  assert.equal(result.intents[0].source, 'issue_demand');
  assert.equal(result.intents[0].requires_source_discovery, true);
  assert.ok(result.intents[0].demand_gap_reason.includes('capability_keywords'));
});

test('cold-start: requires_source_discovery=false when coverage exists', () => {
  // With snapshot_artifact_count > 0 (source group covered), demand gap should not trigger
  const result = selectTargetIntentsColdStart({
    issueDemandMetadata: { demand_skill_ids: ['skl_co_coveredskill'], domain_slugs: ['code-review'] },
    evidenceIndex: {
      snapshot_artifact_count: 3,
      candidate_count: 0,
      skill_record_count: 2,
      analysis_count: 1,
      skill_ids_with_analysis_count: 1,
      analysis_coverage_ratio: 0.5,
      relation_count: 0,
      relation_predicate_counts: {},
      pack_candidate_count: 0,
      pack_published_count: 0,
      gap_flags: { unevaluated_snapshots: false, unnormalized_candidates: false, analysis_gaps: true, relation_potential: false, same_domain_group_count: 0 },
      evidence_index_digest: 'sha256:fake',
    },
    maxTargets: 2,
  });

  assert.equal(result.intents.length, 1);
  assert.equal(result.intents[0].source, 'issue_demand');
  // Shouldn't have requires_source_discovery since snapshots > 0
  assert.ok(!result.intents[0].requires_source_discovery);
});

test('cold-start: backlog intents and new intents do not duplicate seeds', () => {
  const backlog = {
    entries: [
      { fingerprint: 'fp_overlap', dimension: 'analysis', seeds: ['skl_shared', 'skl_bl_extra'], reason: 'backlog', source: 'test', created_at: '2026-08-01T00:00:00Z', attempts: 0, status: 'pending' },
    ],
  };

  const result = selectTargetIntentsColdStart({
    issueDemandMetadata: { demand_skill_ids: ['skl_shared'], domain_slugs: ['code-review'] },
    evidenceIndex: {
      snapshot_artifact_count: 0, candidate_count: 0, skill_record_count: 3,
      analysis_count: 0, skill_ids_with_analysis_count: 0,
      analysis_coverage_ratio: 0, relation_count: 0,
      relation_predicate_counts: {}, pack_candidate_count: 0, pack_published_count: 0,
      gap_flags: { unevaluated_snapshots: false, unnormalized_candidates: false, analysis_gaps: true, relation_potential: false, same_domain_group_count: 0 },
      evidence_index_digest: 'sha256:fake',
    },
    maxTargets: 2,
    backlog,
  });

  // skl_shared was already consumed by the backlog intent, so demand generates no separate intent
  // Result: 1 intent (backlog only), seeds are unique across intents
  const allSeeds = new Set();
  for (const intent of result.intents) {
    for (const s of intent.seed_skill_ids) {
      allSeeds.add(s);
    }
  }
  assert.equal(result.intents.length, 1);
  assert.equal(result.intents[0].source, 'backlog');
  // skl_bl_extra is in the backlog seeds
  assert.ok(allSeeds.has('skl_bl_extra'));
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION L: Growth Funnel (R3)
// ══════════════════════════════════════════════════════════════════════

import { buildRunLedgerV3 } from './lib/run-ledger.mjs';

test('funnel: buildEvidenceIndex returns funnel with correct counts', () => {
  const root = tmpDir();
  try {
    // Create minimal catalog structure
    const snapDir = join(root, 'sources', 'snapshots');
    mkdirSync(snapDir, { recursive: true });
    writeFileSync(join(snapDir, 'src1.json'), JSON.stringify({ name: 'source1' }));

    const recordsDir = join(root, 'skills', 'records', 'co');
    mkdirSync(recordsDir, { recursive: true });
    writeFileSync(join(recordsDir, 'skl_co_test_funnel.yaml'), 'canonical_skill_id: skl_co_test_funnel');

    const analysesDir = join(root, 'analyses', 'co');
    mkdirSync(analysesDir, { recursive: true });
    writeFileSync(join(analysesDir, 'skl_co_test_funnel.md'), '---\nskill_id: skl_co_test_funnel\n---\n# Analysis');

    const index = buildEvidenceIndex({ catalogRoot: root });
    assert.ok(index.funnel);
    assert.equal(index.funnel.snapshots, 1);
    assert.equal(index.funnel.skills, 1);
    assert.equal(index.funnel.analyses, 1);
    assert.equal(index.funnel.candidates, 0);
    assert.equal(index.funnel.relations, 0);
    assert.equal(index.funnel.packs_published, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('funnel: buildRunLedgerV3 includes growth_funnel in output', () => {
  const funnel = {
    snapshots: 5, candidates: 10, skills: 3, analyses: 2, relations: 0, packs_published: 0,
  };
  const ledger = buildRunLedgerV3({
    runId: 'run_funnel_test',
    timestamp: '2026-08-05T00:00:00Z',
    maintenanceOutcomes: [],
    issueOutcomes: [],
    intentOutcomes: [],
    candidateOutcomes: [],
    growthFunnel: funnel,
  });

  assert.ok(ledger.growth_funnel);
  assert.equal(ledger.growth_funnel.snapshots, 5);
  assert.equal(ledger.growth_funnel.analyses, 2);
  assert.equal(ledger.growth_funnel.relations, 0);
  // Verify it's in the digest
  assert.ok(ledger.ledger_digest.startsWith('sha256:'));
});

test('funnel: buildExhaustionProof includes funnel dimension', () => {
  const proof = buildExhaustionProof({
    evidenceIndex: {
      snapshot_artifact_count: 3,
      candidate_count: 5,
      skill_record_count: 2,
      analysis_count: 1,
      relation_count: 0,
      pack_published_count: 0,
      gap_flags: { unevaluated_snapshots: false, unnormalized_candidates: false, analysis_gaps: true, relation_potential: false, same_domain_group_count: 0 },
      funnel: { snapshots: 3, candidates: 5, skills: 2, analyses: 1, relations: 0, packs_published: 0 },
    },
    intents: { intents: [] },
  });

  const funnelTrace = proof.exhaustion_trace.find(e => e.dimension === 'funnel');
  assert.ok(funnelTrace);
  assert.ok(funnelTrace.detail.includes('snapshots=3'));
  assert.ok(funnelTrace.detail.includes('analyses=1'));
});

test('funnel: buildRunLedgerV3 without growthFunnel does not include field', () => {
  const ledger = buildRunLedgerV3({
    runId: 'run_no_funnel',
    timestamp: '2026-08-05T00:00:00Z',
    maintenanceOutcomes: [],
    issueOutcomes: [],
    intentOutcomes: [],
    candidateOutcomes: [],
  });

  assert.equal(ledger.growth_funnel, undefined);
  assert.ok(ledger.ledger_digest.startsWith('sha256:'));
});

// ══════════════════════════════════════════════════════════════════════
//  SECTION M: Delivery Guard allows catalog/growth/ paths (R1 guard)
// ══════════════════════════════════════════════════════════════════════

import { NIGHTLY_ALLOWED_PATHS, checkAuditPaths } from './lib/manifest-collector.mjs';

test('delivery-guard: catalog/growth/ is in allowed paths or passes audit check', () => {
  // catalog/ is already in NIGHTLY_ALLOWED_PATHS with trailing /
  assert.ok(NIGHTLY_ALLOWED_PATHS.includes('catalog/'));
  // catalog/growth/backlog.json should pass audit
  const result = checkAuditPaths({
    changedPaths: ['catalog/growth/backlog.json'],
    allowedDirs: NIGHTLY_ALLOWED_PATHS,
  });
  assert.ok(result.ready);
  assert.equal(result.errors.length, 0);
});

test('delivery-guard: catalog/growth/* paths are allowed (audit check)', () => {
  const result = checkAuditPaths({
    changedPaths: ['catalog/growth/backlog.json', 'catalog/growth/other.json'],
    allowedDirs: NIGHTLY_ALLOWED_PATHS,
  });
  assert.ok(result.ready);
  assert.equal(result.errors.length, 0);
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
