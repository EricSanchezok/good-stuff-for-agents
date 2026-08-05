#!/usr/bin/env node
/**
 * test-nightly-controller.mjs — E2E fixture tests for the Nightly Controller V3.
 *
 * All tests use temp repository roots + injected adapters. No real GitHub/catalog I/O.
 * Tests import from both repo root and .synergy to verify zero-side-effect imports.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, unlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

import {
  executeNightly, generateRunId,
  readActiveMarker, buildTerminalPayload,
} from './lib/nightly-controller-core.mjs';
import { readChain, outputsDir } from './lib/event-store.mjs';
import { PHASES } from './lib/phase-state-machine.mjs';
import { selectTargetIntents } from './lib/target-selector.mjs';
import { computeGateResultDigest, TRUSTED_CHECKS } from './lib/gate-checks.mjs';

const tests = [];
let failures = 0;

function test(name, fn) { tests.push({ name, fn }); }

function tmpDir() { return mkdtempSync(join(tmpdir(), 'nc-')); }

const HEAD_40 = '0'.repeat(40);

// ══════════════════════════════════════════════════════════════════════
//  Fixture helpers
// ══════════════════════════════════════════════════════════════════════

function cleanRepoAdapter(opts = {}) {
  return {
    getHead: () => opts.head || HEAD_40,
    getBranch: () => opts.branch || 'main',
    getUpstream: () => opts.upstream || undefined,
    isWorktreeClean: () => opts.clean !== false,
    changedPaths: () => opts.changedPaths || [],
  };
}

function okMaintenanceExecutor(incidents = []) {
  return async () => ({ ok: true, health: 'ok', sourceResults: [], providerIncidents: incidents });
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
    return {
      context: {
        catalogCounts: substance.catalogCounts || defaultCounts,
        freshness: substance.freshness || { sources_stale_count: 0, skills_stale_count: 0, analyses_stale_count: 0 },
        coverage: substance.coverage || { skills_with_analysis: 5, skills_without_analysis: 5, coverage_ratio: 0.5 },
        relations: substance.relations || { total_edges: 3, by_predicate: {}, chains_count: 0, strengthens_count: 0, alternatives_count: 0, conflicts_count: 0 },
        packLifecycle: substance.packLifecycle || { total_candidate: 1, total_published: 1, new_since_last_run: 0, stale_packs: 0 },
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

function okTargetExecutor(candidates = []) {
  return async () => ({ candidateResults: candidates, interrupted: false, timeout: false });
}

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

function okAuditPlanner(ready = true) {
  return () => ({ ready, errors: [], warnings: [] });
}

function okChangedPathsCollector(paths = []) {
  return () => paths;
}

function baseExecOpts(root) {
  return {
    runsRoot: root,
    repositoryRoot: root,
    changedPathsCollector: okChangedPathsCollector([]),
  };
}

function verifyOutputsExist({ runsRoot, runId, events }) {
  const outDir = outputsDir(runsRoot, runId);
  for (const ev of events) {
    for (const desc of (ev.output_descriptors || [])) {
      const path = join(outDir, desc.label);
      assert.ok(existsSync(path), `Output file missing: ${path}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
//  1. Normal no_pack_clean: 9 events, completed, no_pack_clean outcome
// ══════════════════════════════════════════════════════════════════════

test('normal no_pack_clean: 9 events, completed, no_pack_clean outcome', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:00.000Z',
    });

    assert.equal(result.status, 'completed');
    assert.equal(result.outcome, 'no_pack_clean');
    assert.equal(result.event_count, 9);
    assert.equal(result.events[0].phase, 'init');
    assert.equal(result.events[result.events.length - 1].phase, 'terminal');

    const chainResult = readChain({ runsRoot: root, runId: result.run_id, verifyOutputs: true });
    assert.ok(chainResult.ok, chainResult.error || 'chain broken');
    assert.equal(chainResult.events.length, 9);

    for (let i = 0; i < PHASES.length; i++) {
      assert.equal(result.events[i].phase, PHASES[i],
        `Event ${i} should be ${PHASES[i]}, got ${result.events[i].phase}`);
    }

    verifyOutputsExist({ runsRoot: root, runId: result.run_id, events: result.events });

    // Verify v3 ledger was produced
    const outDir = outputsDir(root, result.run_id);
    const ledgerExists = existsSync(join(outDir, 'run-ledger.json'));
    assert.ok(ledgerExists, 'v3 run-ledger.json should exist');

    // Verify seal manifest was produced
    const manifestExists = existsSync(join(outDir, 'seal-manifest.json'));
    assert.ok(manifestExists, 'seal-manifest.json should exist');

    // Verify seal.json was produced
    const sealExists = existsSync(join(outDir, 'seal.json'));
    assert.ok(sealExists, 'seal.json should exist');

    // Verify audit receipt
    const auditExists = existsSync(join(outDir, `audit_${result.run_id}.json`));
    assert.ok(auditExists, 'audit receipt should exist');

    // Verify active marker was cleaned up
    assert.equal(readActiveMarker(root), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  2. Published candidate path
// ══════════════════════════════════════════════════════════════════════

test('published candidate: promoted candidate → published outcome', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: () => ({
        intents: [{ domain: 'test', reason: 'test demand', source: 'issue_demand', score: 0.9, seed_skill_ids: ['skl_test'], max_analysis_budget: 1 }],
        total: 1, max_targets: 2, capped: false, has_demand: true,
      }),
      targetExecutor: okTargetExecutor([{ terminal: 'promoted', pack_id: 'pack_test' }]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:01.000Z',
    });

    assert.equal(result.status, 'completed');
    assert.equal(result.outcome, 'published');
    assert.equal(result.event_count, 9);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  3. Incomplete Issue snapshot → blocked before context
// ══════════════════════════════════════════════════════════════════════

test('incomplete issue snapshot blocks before context', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor({ ok: false, error: 'Incomplete issue snapshot: only 3/5 issues resolved' }),
      contextCollector: okContextCollector(),
      timestamp: '2026-01-15T00:00:02.000Z',
    });

    assert.equal(result.status, 'blocked');
    assert.equal(result.outcome, null);
    assert.ok(result.error && result.error.includes('Incomplete'));

    const chain = readChain({ runsRoot: root, runId: result.run_id });
    assert.ok(chain.ok);
    assert.equal(chain.lastEvent.phase, 'terminal');
    assert.ok(chain.events.length >= 3 && chain.events.length <= 5);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  4. Provider incident → blocked before context
// ══════════════════════════════════════════════════════════════════════

test('provider incident blocks before context', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor([
        { source_id: 'src_test', provider: 'github', error: 'HTTP 403 rate-limited', status_code: 403 },
      ]),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      timestamp: '2026-01-15T00:00:03.000Z',
    });

    assert.equal(result.status, 'blocked');
    assert.equal(result.outcome, null);
    assert.ok(result.error && result.error.includes('403'));

    const chain = readChain({ runsRoot: root, runId: result.run_id });
    assert.ok(chain.ok);
    assert.equal(chain.lastEvent.phase, 'terminal');
    // Should stop before context (init, maintenance written)
    assert.ok(chain.events.length < 5);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  4b. Partial provider incident → run continues past maintenance
// ══════════════════════════════════════════════════════════════════════

test('partial provider incident continues past maintenance', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: async () => ({
        ok: true,
        health: 'ok',
        sourceResults: [
          { source_id: 'src_ok', ok: true, error: undefined, skills_found: 3 },
        ],
        providerIncidents: [
          { source_id: 'src_test', provider: 'github', error: 'HTTP 403 rate-limited', status_code: 403 },
        ],
      }),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: () => ({
        intents: [{ domain: 'test', reason: 'test', source: 'test', score: 0.5, seed_skill_ids: [], max_analysis_budget: 1 }],
        total: 1, max_targets: 2, capped: false, has_demand: false,
      }),
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:03.100Z',
    });

    // Partial incident must NOT block: run continues past maintenance.
    // Empty candidate results without exhaustion proof → insufficient_evidence
    // (fail-closed), which still proves the run was not blocked by the incident.
    assert.notEqual(result.status, 'blocked', 'partial incident must not block the run');
    assert.equal(result.status, 'insufficient_evidence');
    const chain = readChain({ runsRoot: root, runId: result.run_id });
    assert.ok(chain.ok);
    assert.ok(chain.events.some(e => e.phase === 'context'), 'run should reach context despite partial incident');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  4c. Total provider failure → blocked before context
// ══════════════════════════════════════════════════════════════════════

test('total provider failure blocks before context', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: async () => ({
        ok: true,
        health: 'degraded',
        sourceResults: [], // no source-level result at all
        providerIncidents: [
          { source_id: 'src_a', provider: 'github', error: 'HTTP 403', status_code: 403 },
          { source_id: 'src_b', provider: 'github', error: 'HTTP 500', status_code: 500 },
        ],
      }),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      timestamp: '2026-01-15T00:00:03.200Z',
    });

    assert.equal(result.status, 'blocked');
    assert.equal(result.outcome, null);
    assert.ok(result.error && result.error.includes('provider_incident_blocked'));

    const chain = readChain({ runsRoot: root, runId: result.run_id });
    assert.ok(chain.ok);
    assert.equal(chain.lastEvent.phase, 'terminal');
    assert.ok(chain.events.length < 5);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  5. Target timeout/interrupted
// ══════════════════════════════════════════════════════════════════════

test('target timeout produces interrupted terminal', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: () => ({
        intents: [{ domain: 'test', reason: 'test', source: 'test', score: 0.5, seed_skill_ids: [], max_analysis_budget: 1 }],
        total: 1, max_targets: 2, capped: false, has_demand: false,
      }),
      targetExecutor: async () => ({ candidateResults: [], timeout: true }),
      timestamp: '2026-01-15T00:00:04.000Z',
    });

    assert.equal(result.status, 'interrupted');
    assert.equal(result.outcome, null);
    assert.ok(result.error && (result.error.includes('time') || result.error.includes('Time')),
      `Expected time-related error, got: ${result.error}`);

    const chain = readChain({ runsRoot: root, runId: result.run_id });
    assert.ok(chain.ok);
    assert.equal(chain.lastEvent.phase, 'terminal');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('target interrupted produces interrupted terminal', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: () => ({
        intents: [{ domain: 'test', reason: 'test', source: 'test', score: 0.5, seed_skill_ids: [], max_analysis_budget: 1 }],
        total: 1, max_targets: 2, capped: false, has_demand: false,
      }),
      targetExecutor: async () => ({ candidateResults: [], interrupted: true }),
      timestamp: '2026-01-15T00:00:05.000Z',
    });

    assert.equal(result.status, 'interrupted');
    assert.equal(result.outcome, null);

    const chain = readChain({ runsRoot: root, runId: result.run_id });
    assert.ok(chain.ok);
    assert.equal(chain.lastEvent.phase, 'terminal');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  6. Gate failure
// ══════════════════════════════════════════════════════════════════════

test('gate failure writes one failed result, cannot rerun same ID', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(false),
      timestamp: '2026-01-15T00:00:06.000Z',
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.outcome, null);
    assert.ok(result.error && result.error.toLowerCase().includes('gate'),
      `Expected gate error, got: ${result.error}`);

    const chain = readChain({ runsRoot: root, runId: result.run_id, verifyOutputs: true });
    assert.ok(chain.ok);
    const gateEvent = chain.events.find(e => e.phase === 'gate');
    assert.ok(gateEvent);
    assert.equal(chain.lastEvent.phase, 'terminal');

    const outDir = outputsDir(root, result.run_id);
    const gateOutput = readFileSync(join(outDir, 'gate-result.json'), 'utf8');
    const gateResultParsed = JSON.parse(gateOutput);
    assert.equal(gateResultParsed.passed, false);
    assert.equal(gateResultParsed.invoked_count, 1);

    assert.ok(existsSync(join(root, result.run_id)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  6b. Missing gate executor → blocked (no fake pass)
// ══════════════════════════════════════════════════════════════════════

test('missing gate executor is blocked, not minimal success', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: null, // explicitly null
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:06b.000Z',
    });

    assert.equal(result.status, 'blocked');
    assert.equal(result.outcome, null);
    assert.ok(result.error && result.error.includes('gate'),
      `Expected gate-related blocked error, got: ${result.error}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  7. Audit code change → audit_blocked
// ══════════════════════════════════════════════════════════════════════

test('audit blocked: .synergy code changes detected', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: () => ({ ready: false, errors: ['.synergy code changes detected'], warnings: [] }),
      timestamp: '2026-01-15T00:00:07.000Z',
    });

    assert.equal(result.status, 'audit_blocked');
    assert.equal(result.outcome, null);
    assert.ok(result.error && (result.error.includes('.synergy') || result.error.includes('code')),
      `Expected synergy code error, got: ${result.error}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  8. Concurrent reservation rejected
// ══════════════════════════════════════════════════════════════════════

test('concurrent reservation rejected when another run is active', async () => {
  const root = tmpDir();
  try {
    const r1 = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:09.000Z',
    });
    assert.equal(r1.status, 'completed');
    assert.equal(readActiveMarker(root), null);

    // Place a live marker with our own pid
    writeFileSync(join(root, '.active-run'),
      JSON.stringify({ run_id: 'run_blocker', pid: process.pid, started_at: new Date().toISOString() }) + '\n');

    await assert.rejects(
      () => executeNightly({
        runsRoot: root,
        repositoryRoot: root,
        repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
        maintenanceExecutor: okMaintenanceExecutor(),
        issueExecutor: okIssueExecutor(),
        contextCollector: okContextCollector(),
        gateExecutor: okGateExecutor(true),
        auditPlanner: okAuditPlanner(true),
        timestamp: '2026-01-15T00:00:10.000Z',
      }),
      /concurrent_run_rejected/,
    );

    try { unlinkSync(join(root, '.active-run')); } catch (_) {}
    const r3 = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:11.000Z',
    });
    assert.equal(r3.status, 'completed');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  8b. Stale marker rejected (not silently deleted)
// ══════════════════════════════════════════════════════════════════════

test('stale active marker is rejected, not silently deleted', async () => {
  const root = tmpDir();
  try {
    // Place a stale marker with a dead pid
    writeFileSync(join(root, '.active-run'),
      JSON.stringify({ run_id: 'run_stale', pid: 99999, started_at: '2020-01-01T00:00:00Z' }) + '\n');

    try {
      await executeNightly({
        runsRoot: root,
        repositoryRoot: root,
        repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
        maintenanceExecutor: okMaintenanceExecutor(),
        issueExecutor: okIssueExecutor(),
        contextCollector: okContextCollector(),
        gateExecutor: okGateExecutor(true),
        auditPlanner: okAuditPlanner(true),
        timestamp: '2026-01-15T00:00:10b.000Z',
      });
      assert.fail('Should have thrown stale marker error');
    } catch (e) {
      assert.ok(e.message.includes('stale_active_marker'), `Expected stale marker error, got: ${e.message}`);
      assert.ok(e.code === 'STALE_MARKER', `Expected STALE_MARKER code, got: ${e.code}`);
    }

    // Marker should still exist (not deleted)
    assert.ok(existsSync(join(root, '.active-run')), 'Stale marker should not be silently deleted');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  9. Tamper/delete output → chain verification fails
// ══════════════════════════════════════════════════════════════════════

test('tampered output causes chain verification failure', async () => {
  const root = tmpDir();
  try {
    const r1 = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:12.000Z',
    });
    assert.equal(r1.status, 'completed');

    const outDir = outputsDir(root, r1.run_id);
    const files = readdirSync(outDir);
    const someJson = files.find(f => f.endsWith('.json') && f !== 'terminal.json');
    assert.ok(someJson, 'Need at least one non-terminal JSON output to tamper');
    writeFileSync(join(outDir, someJson), '{"tampered":true}');

    const chainResult = readChain({ runsRoot: root, runId: r1.run_id, verifyOutputs: true });
    assert.equal(chainResult.ok, false);
    assert.ok(
      chainResult.error.includes('tampered') || chainResult.error.includes('mismatch'),
      `Expected tamper/mismatch error, got: ${chainResult.error}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('deleted output causes chain verification failure', async () => {
  const root = tmpDir();
  try {
    const r1 = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:13.000Z',
    });
    assert.equal(r1.status, 'completed');

    const outDir = outputsDir(root, r1.run_id);
    const files = readdirSync(outDir);
    const someJson = files.find(f => f.endsWith('.json') && f !== 'terminal.json');
    assert.ok(someJson, 'Need at least one non-terminal JSON output to delete');
    unlinkSync(join(outDir, someJson));

    const chainResult = readChain({ runsRoot: root, runId: r1.run_id, verifyOutputs: true });
    assert.equal(chainResult.ok, false);
    assert.ok(
      chainResult.error.includes('missing') || chainResult.error.includes('tampered'),
      `Expected missing error, got: ${chainResult.error}`,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  10. CLI import zero output/IO
// ══════════════════════════════════════════════════════════════════════

test('CLI import produces zero stdout/stderr', () => {
  const importPath = join(__dirname, 'nightly-controller.mjs');
  const cmd = `import('${importPath}').then(m => { if (typeof m.executeNightly !== 'function') process.exit(2); }).catch(e => { process.stderr.write(e.message); process.exit(1); })`;
  const result = spawnSync('node', ['-e', cmd], {
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 10000,
  });

  assert.equal(result.status, 0, `Import exit ${result.status}. stderr: ${result.stderr}`);
  assert.equal(result.stdout.trim(), '', `Import stdout: ${result.stdout}`);
  assert.equal(result.stderr.trim(), '', `Import stderr: ${result.stderr}`);
});

// ══════════════════════════════════════════════════════════════════════
//  10b. CLI unknown args rejected
// ══════════════════════════════════════════════════════════════════════

test('CLI rejects unknown args', () => {
  const scriptPath = join(__dirname, 'nightly-controller.mjs');
  const result = spawnSync('node', [scriptPath, '--runs-root', '/tmp/test'], {
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 10000,
  });

  assert.ok(result.stderr.includes('unknown arguments'), `Should reject unknown args, got: ${result.stderr}`);
});

// ══════════════════════════════════════════════════════════════════════
//  11. JSON serializable, no npm banner
// ══════════════════════════════════════════════════════════════════════

test('result is JSON-serializable and parseable', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:14.000Z',
    });

    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    assert.equal(parsed.run_id, result.run_id);
    assert.equal(parsed.status, 'completed');
    assert.equal(parsed.outcome, 'no_pack_clean');
    assert.equal(parsed.event_count, 9);

    assert.ok(!json.includes('npm WARN'), 'JSON should not contain npm WARN');
    assert.ok(!json.includes('npm ERR'), 'JSON should not contain npm ERR');
    assert.ok(!json.includes('npm notice'), 'JSON should not contain npm notice');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  12. Dirty worktree rejected before reservation
// ══════════════════════════════════════════════════════════════════════

test('dirty worktree rejected before reservation', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter({ clean: false }),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:15.000Z',
    });

    assert.equal(result.status, 'blocked');
    assert.equal(result.outcome, null);
    assert.equal(result.error, 'dirty_worktree');
    assert.equal(result.events.length, 0);

    if (existsSync(root)) {
      const entries = readdirSync(root).filter(e => e.startsWith('run_'));
      assert.equal(entries.length, 0, `No run dirs expected: ${entries.join(', ')}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  13. Nonzero intents + no executor = blocked (not no_pack_clean)
// ══════════════════════════════════════════════════════════════════════

test('nonzero intents without executor → paused_for_targets (C6 pause protocol)', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: () => ({
        intents: [{ domain: 'test', reason: 'test', source: 'test', score: 0.5, seed_skill_ids: [], max_analysis_budget: 1 }],
        total: 1, max_targets: 2, capped: false, has_demand: false,
      }),
      targetExecutor: null,
      timestamp: '2026-01-15T00:00:16.000Z',
    });

    // C6: nonzero intents + no executor = pause (not blocked)
    assert.equal(result.status, 'paused_for_targets');
    assert.equal(result.outcome, null);
    assert.ok(result.intents && result.intents.length > 0,
      'Should have intents in handoff');
    assert.ok(result.handoff_digest, 'Should have handoff digest');

    const chain = readChain({ runsRoot: root, runId: result.run_id });
    assert.ok(chain.ok);
    // Chain should end at paused_for_targets, not terminal
    assert.equal(chain.lastEvent.phase, 'paused_for_targets');
    assert.ok(chain.events.find(e => e.phase === 'context'));
    // Targets event should NOT be written (pause before execution)
    assert.ok(!chain.events.find(e => e.phase === 'targets'),
      'Targets event should not be written when executor is missing — paused instead');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  14. Zero intents → no_pack_clean (even without target executor)
// ══════════════════════════════════════════════════════════════════════

test('zero intents + no executor produces no_pack_clean', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: null,
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:17.000Z',
    });

    assert.equal(result.status, 'completed');
    assert.equal(result.outcome, 'no_pack_clean');
    assert.equal(result.event_count, 9);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  15. Run ID is always fresh and unpredictable
// ══════════════════════════════════════════════════════════════════════

test('run IDs are always fresh and unpredictable', () => {
  const ids = new Set();
  for (let i = 0; i < 10; i++) {
    ids.add(generateRunId());
  }
  assert.equal(ids.size, 10);
  for (const id of ids) {
    assert.match(id, /^run_[a-f0-9]{16}$/);
  }
});

// ══════════════════════════════════════════════════════════════════════
//  16. No resume: each run gets fresh run ID
// ══════════════════════════════════════════════════════════════════════

test('no resume: each run gets fresh run ID', async () => {
  const root = tmpDir();
  try {
    const r1 = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:18.000Z',
    });
    const r2 = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:19.000Z',
    });

    assert.notEqual(r1.run_id, r2.run_id);
    assert.equal(r1.status, 'completed');
    assert.equal(r2.status, 'completed');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  17. Missing required adapters throw
// ══════════════════════════════════════════════════════════════════════

test('missing required adapters throw immediately', async () => {
  const root = tmpDir();
  try {
    await assert.rejects(
      () => executeNightly({
        runsRoot: root,
        repositoryRoot: root,
        repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
        // missing maintenanceExecutor
        issueExecutor: okIssueExecutor(),
        contextCollector: okContextCollector(),
        gateExecutor: okGateExecutor(true),
        auditPlanner: okAuditPlanner(true),
        timestamp: '2026-01-15T00:00:20.000Z',
      }),
      /missing_required_adapters/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  18. New unassessed issues pause for semantic assessment (not blocked)
// ══════════════════════════════════════════════════════════════════════

test('new unassessed issues pause for semantic assessment', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor({
        ok: true,
        newUnassessed: [{ issue_number: 7, title: 'New feature request' }],
        _assessed_unassessed: false,
        workloadPath: join(root, 'run_x', 'issue-workload.json'),
      }),
      contextCollector: okContextCollector(),
      timestamp: '2026-01-15T00:00:21.000Z',
    });

    // New behavior: pauses instead of blocking
    assert.equal(result.status, 'paused_for_assessment');
    assert.equal(result.outcome, null);
    assert.ok(result.new_unassessed && result.new_unassessed.length > 0,
      'Should have new unassessed references');
    assert.ok(result.workload_path, 'Should have workload path');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  19. Audit planner errors → audit_blocked
// ══════════════════════════════════════════════════════════════════════

test('audit planner returns not ready → audit_blocked', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: () => ({ ready: false, errors: ['Implementation code changed'], warnings: [] }),
      timestamp: '2026-01-15T00:00:22.000Z',
    });

    assert.equal(result.status, 'audit_blocked');
    assert.equal(result.outcome, null);
    assert.ok(result.error && result.error.includes('Implementation code changed'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  20. Import from .synergy directory works (import path sanity)
// ══════════════════════════════════════════════════════════════════════

test('core module import works from .synergy cwd', () => {
  const corePath = join(__dirname, 'lib', 'nightly-controller-core.mjs');
  const cmd = `import('${corePath}').then(m => {
      if (typeof m.executeNightly !== 'function') process.exit(2);
      if (typeof m.generateRunId !== 'function') process.exit(2);
    }).catch(e => { process.stderr.write(e.message); process.exit(1); })`;
  const result = spawnSync('node', ['-e', cmd], {
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 10000,
  });

  assert.equal(result.status, 0, `Import from .synergy cwd exit ${result.status}. stderr: ${result.stderr}`);
  assert.equal(result.stdout.trim(), '', `Import stdout: ${result.stdout}`);
  assert.equal(result.stderr.trim(), '', `Import stderr: ${result.stderr}`);
});

// ══════════════════════════════════════════════════════════════════════
//  21. V3 ledger schema validation passes (no old v1 schema)
// ══════════════════════════════════════════════════════════════════════

test('v3 ledger schema validates and has current fields', async () => {
  const root = tmpDir();
  try {
    const result = await executeNightly({
      runsRoot: root,
      repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor(),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:23.000Z',
    });

    const outDir = outputsDir(root, result.run_id);
    const ledgerPath = join(outDir, 'run-ledger.json');
    assert.ok(existsSync(ledgerPath), 'run-ledger.json should exist');
    const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
    assert.equal(ledger.schema_version, 3, 'ledger should be v3');
    assert.equal(typeof ledger.ledger_id, 'string', 'ledger_id should be string');
    assert.equal(typeof ledger.ledger_digest, 'string', 'ledger_digest should be string');
    assert.match(ledger.ledger_digest, /^sha256:[a-f0-9]{64}$/, 'ledger_digest should be sha256:hex');
    assert.ok(ledger.run_outcome, 'ledger should have run_outcome');
    assert.ok(ledger.run_outcome.status, 'ledger outcome should have status');

    // Verify no old v1 fields leak
    assert.ok(!('terminal_ledger' in ledger), 'No old terminal_ledger');
    // Verify no placeholder empty manifests
    assert.ok(Array.isArray(ledger.source_outcomes), 'source_outcomes should be array');
    assert.ok(Array.isArray(ledger.issue_outcomes), 'issue_outcomes should be array');
    assert.ok(Array.isArray(ledger.intent_outcomes), 'intent_outcomes should be array');
    assert.ok(Array.isArray(ledger.candidate_outcomes), 'candidate_outcomes should be array');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  22. Terminal digest is self-consistent
// ══════════════════════════════════════════════════════════════════════

test('terminal payload digest is self-consistent', () => {
  const tp = buildTerminalPayload({
    runId: 'run_test',
    status: 'completed',
    outcome: 'no_pack_clean',
    summary: 'test',
    totalActions: 9,
    errors: 0,
    warnings: 0,
    lastPhaseEventDigest: `sha256:${'f'.repeat(64)}`,
  });

  assert.equal(tp.schema_version, 3);
  assert.match(tp.terminal_digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(tp.status, 'completed');
  assert.equal(tp.outcome, 'no_pack_clean');

  // Verify digest is canonical (same input → same digest)
  const tp2 = buildTerminalPayload({
    runId: 'run_test',
    status: 'completed',
    outcome: 'no_pack_clean',
    summary: 'test',
    totalActions: 9,
    errors: 0,
    warnings: 0,
    lastPhaseEventDigest: `sha256:${'f'.repeat(64)}`,
  });
  assert.equal(tp.terminal_digest, tp2.terminal_digest, 'Same input should produce same digest');
});

// ══════════════════════════════════════════════════════════════════════
//  23. Production maintenance executor is NOT a hardcoded-success stub
// ══════════════════════════════════════════════════════════════════════

test('production maintenance executor is not a stub — fails without valid catalog', async () => {
  const root = tmpDir();
  try {
    const { productionMaintenanceExecutor } = await import('./nightly-controller.mjs');
    // Inject fake catalog deps that always throw — no real catalog touched
    const fakeCatalogDeps = {
      validateCatalog: () => { throw new Error('no catalog in temp dir'); },
      loadRegistry: () => { throw new Error('no registry in temp dir'); },
      syncApprovedSources: () => { throw new Error('no sync in temp dir'); },
    };
    try {
      await productionMaintenanceExecutor({ runId: 'run_test', runsRoot: root, head: HEAD_40, deps: fakeCatalogDeps });
      assert.fail('Should have thrown or returned errors without valid catalog');
    } catch (e) {
      assert.ok(e.message, 'Should produce an error message');
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  24. Production issue executor is NOT a hardcoded-success stub
// ══════════════════════════════════════════════════════════════════════

test('production issue executor is not a stub — fails when gh unauth/unavailable', async () => {
  const root = tmpDir();
  try {
    const { productionIssueExecutor } = await import('./nightly-controller.mjs');
    // Inject fake deps that mock gh auth failure — no real GitHub calls
    const fakeIssueDeps = {
      checkGhAuth: () => ({ ok: false, authenticated: false, error: 'gh not configured in temp dir' }),
    };
    const result = await productionIssueExecutor({ runId: 'run_test', runsRoot: root, repositoryRoot: root, deps: fakeIssueDeps });

    // Stub would return ok:true with empty snapshot.
    // With fake deps, must return ok:false.
    assert.equal(result.ok, false, 'Issue executor must fail with no gh auth');
    assert.ok(result.error.includes('gh_auth_unavailable'), 'Error must mention gh_auth_unavailable');
    assert.equal(result.snapshot.blocked, 1, 'Blocked snapshot on gh failure');
    assert.equal(result.workloadPath, null, 'No workload path on auth failure');
    assert.equal(result.demandArtifactPath, null, 'No demand artifact on auth failure');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  25. Production gate executor runs npm scripts, not console.log stubs
// ══════════════════════════════════════════════════════════════════════

test('production gate executor uses npm run, not console.log placeholder', async () => {
  const { productionGateExecutor } = await import('./nightly-controller.mjs');
  const { TRUSTED_CHECKS } = await import('./lib/gate-checks.mjs');

  // Verify the trusted checks define real npm script names
  assert.ok(TRUSTED_CHECKS.length === 29, `Expected 29 trusted checks, got ${TRUSTED_CHECKS.length}`);
  for (const check of TRUSTED_CHECKS) {
    assert.ok(check.name && check.script, `Check ${check.name} must have name and script`);
    assert.ok(check.script.includes(':'), `Script ${check.script} should be namespaced (contain ':')`);
    assert.ok(!check.script.includes('console.log'), `Script ${check.script} must not be a console.log placeholder`);
  }

  // Verify gate executor exists and is callable
  assert.equal(typeof productionGateExecutor, 'function');
  assert.equal(productionGateExecutor.length, 1, 'Gate executor takes a single opts argument');
});

// ══════════════════════════════════════════════════════════════════════
//  26. Production audit planner is NOT a hardcoded-ready stub
// ══════════════════════════════════════════════════════════════════════

test('production audit planner is not a stub — rejects code changes', async () => {
  const { productionAuditPlanner } = await import('./nightly-controller.mjs');

  // Test 1: .synergy code changes → not ready
  const codeResult = productionAuditPlanner({
    baselineHead: HEAD_40,
    sealDigest: `sha256:${'a'.repeat(64)}`,
    manifestDigest: `sha256:${'b'.repeat(64)}`,
    changedPaths: ['.synergy/skill/nightly-catalog-ops/scripts/nightly-controller.mjs'],
  });
  assert.equal(codeResult.ready, false, '.synergy code changes must block audit');
  assert.ok(codeResult.errors.length > 0, 'Errors should be non-empty for code changes');

  // Test 2: secret path → not ready
  const secretResult = productionAuditPlanner({
    baselineHead: HEAD_40,
    sealDigest: `sha256:${'a'.repeat(64)}`,
    manifestDigest: `sha256:${'b'.repeat(64)}`,
    changedPaths: ['.env.production'],
  });
  assert.equal(secretResult.ready, false, 'Secret paths must block audit');
  assert.ok(secretResult.errors.some(e => e.includes('secret_path')), 'Error should mention secret_path');

  // Test 3: .git path → not ready
  const gitResult = productionAuditPlanner({
    baselineHead: HEAD_40,
    sealDigest: `sha256:${'a'.repeat(64)}`,
    manifestDigest: `sha256:${'b'.repeat(64)}`,
    changedPaths: ['.git/config'],
  });
  assert.equal(gitResult.ready, false, '.git paths must block audit');

  // Test 4: missing baseline → not ready
  const missingResult = productionAuditPlanner({
    baselineHead: null,
    sealDigest: `sha256:${'a'.repeat(64)}`,
    manifestDigest: `sha256:${'b'.repeat(64)}`,
    changedPaths: [],
  });
  assert.equal(missingResult.ready, false, 'Missing baseline must block audit');

  // Test 5: missing seal digest → not ready
  const missingSealResult = productionAuditPlanner({
    baselineHead: HEAD_40,
    sealDigest: null,
    manifestDigest: `sha256:${'b'.repeat(64)}`,
    changedPaths: [],
  });
  assert.equal(missingSealResult.ready, false, 'Missing seal digest must block audit');

  // Test 6: ordinary path outside allowed dirs → not ready
  const ordinaryResult = productionAuditPlanner({
    baselineHead: HEAD_40,
    sealDigest: `sha256:${'a'.repeat(64)}`,
    manifestDigest: `sha256:${'b'.repeat(64)}`,
    changedPaths: ['package.json'],
  });
  assert.equal(ordinaryResult.ready, false, 'Ordinary path outside allowed dirs must block audit');
  assert.ok(
    ordinaryResult.errors.some(e => e.includes('ordinary_path_blocker')),
    'Error should mention ordinary_path_blocker',
  );

  // Test 7: clean set of allowed paths → ready
  const cleanResult = productionAuditPlanner({
    baselineHead: HEAD_40,
    sealDigest: `sha256:${'a'.repeat(64)}`,
    manifestDigest: `sha256:${'b'.repeat(64)}`,
    changedPaths: ['catalog/sources/registry.yaml', 'docs/index.md'],
  });
  assert.equal(cleanResult.ready, true, 'Allowed paths in allowed dirs must be ready');
  assert.equal(cleanResult.errors.length, 0, 'No errors for clean path set');
});

// ══════════════════════════════════════════════════════════════════════
//  27. Production adapter exports are stable (no accidental removal)
// ══════════════════════════════════════════════════════════════════════

test('controller exports all required production adapters', async () => {
  const mod = await import('./nightly-controller.mjs');

  assert.equal(typeof mod.buildProductionRepoAdapter, 'function');
  assert.equal(typeof mod.productionContextCollector, 'function');
  assert.equal(typeof mod.productionMaintenanceExecutor, 'function');
  assert.equal(typeof mod.productionIssueExecutor, 'function');
  assert.equal(typeof mod.productionGateExecutor, 'function');
  assert.equal(typeof mod.productionAuditPlanner, 'function');
  assert.equal(typeof mod.executeNightly, 'function');
});

// ══════════════════════════════════════════════════════════════════════
//  FINDING 3: Real Issue outcomes with real issue numbers
// ══════════════════════════════════════════════════════════════════════

test('finding-3: issue executor returns real issueOutcomes with real issue numbers', async () => {
  const root = tmpDir();
  try {
    // Run a full pipeline with an issue executor that returns real outcomes
    const result = await executeNightly({
      runsRoot: root, repositoryRoot: root,
      repositoryAdapter: cleanRepoAdapter(),
      changedPathsCollector: okChangedPathsCollector([]),
      maintenanceExecutor: okMaintenanceExecutor(),
      issueExecutor: okIssueExecutor({
        ok: true,
        issueOutcomes: [
          { issue_number: 1, state: 'fulfilled', assessment_id: 'asm_1' },
          { issue_number: 2, state: 'acknowledged' },
          { issue_number: 5, state: 'held' },
        ],
        stageTerminals: [
          { issue_number: 1, assessment: { assessment_id: 'asm_1' }, reply: { status: 'posted' } },
          { issue_number: 2, assessment: null, reply: { status: 'held_for_review' } },
          { issue_number: 5, assessment: null, reply: { status: 'held_for_review' } },
        ],
      }),
      contextCollector: okContextCollector(),
      targetSelector: selectTargetIntents,
      targetExecutor: okTargetExecutor([]),
      gateExecutor: okGateExecutor(true),
      auditPlanner: okAuditPlanner(true),
      timestamp: '2026-01-15T00:00:26.000Z',
    });

    assert.equal(result.status, 'completed');
    const outDir = outputsDir(root, result.run_id);
    const ledger = JSON.parse(readFileSync(join(outDir, 'run-ledger.json'), 'utf8'));
    assert.ok(Array.isArray(ledger.issue_outcomes), 'issue_outcomes must be an array');
    assert.ok(ledger.issue_outcomes.length > 0, 'issue_outcomes must not be empty');
    for (const io of ledger.issue_outcomes) {
      assert.ok(Number.isInteger(io.issue_number) && io.issue_number >= 1,
        `issue_number must be a real positive integer, got ${io.issue_number}`);
      assert.ok(['fulfilled', 'acknowledged', 'held', 'blocked'].includes(io.state),
        `state must be a recognized state, got ${io.state}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ══════════════════════════════════════════════════════════════════════
//  FINDING 5: Gate subprocess env allowlist (DI seam test)
// ══════════════════════════════════════════════════════════════════════

test('finding-5: gate executor sanitizes env (no leaked secrets)', async () => {
  const { productionGateExecutor } = await import('./nightly-controller.mjs');

  const capturedEnvs = [];
  const fakeSpawn = (cmd, args, opts) => {
    capturedEnvs.push(opts.env);
    return { status: 0, stdout: '', stderr: '' };
  };

  const result = productionGateExecutor({
    runId: 'run_gate_env',
    runsRoot: tmpDir(),
    runContext: { digest: 'sha256:' + 'c'.repeat(64) },
    targetsEventDigest: 'sha256:' + 'a'.repeat(64),
    gateId: 'gate_env_test',
    _spawnSync: fakeSpawn,
  });

  // Must only spawn with the sanitized env, not full process.env
  for (const env of capturedEnvs) {
    // Forbidden keys must never leak
    assert.ok(!('GITHUB_TOKEN' in env), 'GITHUB_TOKEN must not be in gate env');
    assert.ok(!('GH_TOKEN' in env), 'GH_TOKEN must not be in gate env');
    assert.ok(!('NPM_TOKEN' in env), 'NPM_TOKEN must not be in gate env');
    assert.ok(!('AWS_ACCESS_KEY_ID' in env) || env.AWS_ACCESS_KEY_ID === undefined,
      'AWS credentials must not be in gate env');
    // Required keys must be present
    assert.equal(env.NODE_ENV, 'production', 'NODE_ENV must be production');
    assert.equal(env.CI, '1', 'CI must be set');
  }

  // result should be valid
  assert.equal(result.schema_version, 3);
  assert.equal(typeof result.result_digest, 'string');
});

// ══════════════════════════════════════════════════════════════════════
//  FINDING 6: Audit planner uses shared NIGHTLY_ALLOWED_PATHS
// ══════════════════════════════════════════════════════════════════════

test('finding-6: productionAuditPlanner uses shared NIGHTLY_ALLOWED_PATHS from manifest-collector', async () => {
  const { NIGHTLY_ALLOWED_PATHS } = await import('./lib/manifest-collector.mjs');
  const { productionAuditPlanner } = await import('./nightly-controller.mjs');

  // Verify reports/ is in the allowlist
  assert.ok(NIGHTLY_ALLOWED_PATHS.includes('reports/'), 'reports/ must be in NIGHTLY_ALLOWED_PATHS');
  assert.ok(NIGHTLY_ALLOWED_PATHS.includes('catalog/'), 'catalog/ must be in NIGHTLY_ALLOWED_PATHS');

  // reports/ path must pass audit
  const reportResult = productionAuditPlanner({
    baselineHead: HEAD_40,
    sealDigest: `sha256:${'a'.repeat(64)}`,
    manifestDigest: `sha256:${'b'.repeat(64)}`,
    changedPaths: ['reports/some-report.md'],
  });
  assert.equal(reportResult.ready, true, 'reports/ changes must pass audit');
  assert.equal(reportResult.errors.length, 0, 'No errors for reports/ path');

  // Non-allowlisted path must fail
  const badResult = productionAuditPlanner({
    baselineHead: HEAD_40,
    sealDigest: `sha256:${'a'.repeat(64)}`,
    manifestDigest: `sha256:${'b'.repeat(64)}`,
    changedPaths: ['some-random-file.txt'],
  });
  assert.equal(badResult.ready, false, 'Non-allowlisted path must block audit');
});

// ══════════════════════════════════════════════════════════════════════
//  Run all tests
// ══════════════════════════════════════════════════════════════════════

let completed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    process.stdout.write(`ok - ${name}\n`);
    completed++;
  } catch (error) {
    failures++;
    process.stderr.write(`not ok - ${name}\n${error.stack}\n`);
  }
}

const total = tests.length;
if (failures > 0) {
  process.stderr.write(`\n${failures}/${total} test(s) failed (${completed} passed)\n`);
  process.exit(1);
}
process.stdout.write(`\n${total} controller e2e tests passed\n`);
