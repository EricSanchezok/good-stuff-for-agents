/**
 * Nightly Controller Core — V3 Production Semantics
 *
 * executeNightly is the single execution entry point. It does NOT:
 *  - succeed with defaults when executors are missing
 *  - construct fake passing gate results when gateExecutor is absent
 *  - fall back to minimal zero catalog contexts
 *  - use old v1 terminal ledger schemas
 *  - silently delete stale active markers without diagnostic
 *
 * Adapter validation is per-phase:
 *  - maintenanceExecutor, issueExecutor, contextCollector are required to pass baseline
 *  - gateExecutor is required when the gate phase is entered
 *  - auditPlanner is required when the audit phase is entered
 *  - targetExecutor is required when there are nonzero intents
 */

import { randomUUID, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, linkSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  PHASES,
  computeGateId,
  canonicalStringify,
  computeContentDigest,
} from './phase-state-machine.mjs';
import {
  publishOutput,
  appendPhaseEvent,
  appendTerminalEvent,
  readChain,
  outputsDir,
} from './event-store.mjs';
import { reserveRun } from './run-reservation.mjs';
import { buildRunLedgerV3 } from './run-ledger.mjs';
import {
  collectChangedPaths,
  buildManifestV3,
  checkAuditPaths,
} from './manifest-collector.mjs';
import {
  validateAgainstSchema,
  runLedgerSchemaV3,
  runContextSchemaV3,
  gateResultSchemaV3,
  sealSchemaV3,
  sealManifestSchemaV3,
  auditReceiptSchemaV3,
  terminalSchemaV3,
  runSummarySchemaV3,
} from '../../../catalog-data/scripts/lib/schema-validators.mjs';
import { computeGateResultDigest, validateGateResultAgainstTrusted } from './gate-checks.mjs';

// ══════════════════════════════════════════════════════════════════════
//  Run ID generation
// ══════════════════════════════════════════════════════════════════════

export function generateRunId() {
  return `run_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

// ══════════════════════════════════════════════════════════════════════
//  Local crash-safe atomic write (works outside repo root)
// ══════════════════════════════════════════════════════════════════════

function localAtomicWrite(targetPath, content) {
  const dir = join(targetPath, '..');
  mkdirSync(dir, { recursive: true });
  const tmpName = `.tmp-${randomUUID()}`;
  const tmpPath = join(dir, tmpName);
  writeFileSync(tmpPath, content, { flag: 'wx' });
  try {
    linkSync(tmpPath, targetPath);
  } catch (e) {
    try { unlinkSync(tmpPath); } catch (_) {}
    if (e.code === 'EEXIST') {
      throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
    }
    throw e;
  }
  try { unlinkSync(tmpPath); } catch (_) {}
}

// ══════════════════════════════════════════════════════════════════════
//  Active marker — crash-safe reservation with stale-marker handling
// ══════════════════════════════════════════════════════════════════════

function activeMarkerPath(runsRoot) {
  return join(runsRoot, '.active-run');
}

export function readActiveMarker(runsRoot) {
  const p = activeMarkerPath(runsRoot);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeActiveMarkerAtomic(runsRoot, runId) {
  const p = activeMarkerPath(runsRoot);
  const marker = { run_id: runId, pid: process.pid, started_at: new Date().toISOString() };
  try {
    localAtomicWrite(p, JSON.stringify(marker) + '\n');
  } catch (e) {
    if (e && e.code === 'EEXIST') {
      throw Object.assign(
        new Error('concurrent_run_rejected: active marker already exists'),
        { code: 'CONCURRENT_RUN' },
      );
    }
    throw e;
  }
}

function removeActiveMarker(runsRoot) {
  const p = activeMarkerPath(runsRoot);
  try { unlinkSync(p); } catch {}
}

export function checkPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireGlobalReservation({ runsRoot, runId, onProgress }) {
  const existing = readActiveMarker(runsRoot);
  if (existing) {
    if (checkPidAlive(existing.pid)) {
      const err = Object.assign(
        new Error(`concurrent_run_rejected: run ${existing.run_id} (pid ${existing.pid}) is still active`),
        { code: 'CONCURRENT_RUN' },
      );
      throw err;
    }
    if (onProgress) {
      onProgress(`stale_active_marker_detected: previous run ${existing.run_id} (pid ${existing.pid}) appears dead`);
    }
    const err = Object.assign(
      new Error(`stale_active_marker: previous run ${existing.run_id} (pid ${existing.pid}) is dead but no terminal was written. Manual intervention required.`),
      { code: 'STALE_MARKER' },
    );
    throw err;
  }
  writeActiveMarkerAtomic(runsRoot, runId);
  return true;
}

// ══════════════════════════════════════════════════════════════════════
//  Terminal construction
// ══════════════════════════════════════════════════════════════════════

export function buildTerminalPayload({ runId, status, outcome, summary, totalActions, errors, warnings, lastPhaseEventDigest }) {
  const payload = {
    schema_version: 3,
    run_id: runId,
    status,
    outcome: outcome || null,
    summary: summary || '',
    total_actions: totalActions || 0,
    errors: errors || 0,
    warnings: warnings || 0,
    last_phase_event_digest: lastPhaseEventDigest || '',
  };
  const { terminal_digest, ...rest } = payload;
  payload.terminal_digest = `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;
  return payload;
}

function finalizeTerminal({ runsRoot, runId, repositoryRoot, terminalPayload }) {
  const chain = readChain({ runsRoot, runId });
  if (!chain.ok) throw new Error(`chain_corrupted_on_terminal: ${chain.error}`);

  const prevEvent = chain.lastEvent;
  if (prevEvent.phase === 'terminal') {
    return chain.lastEvent;
  }

  const boundPayload = { ...terminalPayload };
  boundPayload.last_phase_event_digest = prevEvent.event_digest;
  const { terminal_digest, ...payloadRest } = boundPayload;
  boundPayload.terminal_digest = `sha256:${createHash('sha256').update(canonicalStringify(payloadRest)).digest('hex')}`;

  // Schema-validate terminal BEFORE publish (prevent invalid write-once artifact)
  const termSchemaCheck = validateAgainstSchema(boundPayload, terminalSchemaV3);
  if (!termSchemaCheck.ok) {
    throw new Error(`terminal_schema_invalid: ${termSchemaCheck.errors.join('; ')}`);
  }

  const termOut = publishOutput({
    runsRoot, runId, repositoryRoot,
    name: 'terminal.json',
    content: JSON.stringify(boundPayload),
  });

  const event = appendTerminalEvent({
    runsRoot, runId,
    outputDescriptors: [{
      label: termOut.label,
      digest: termOut.digest,
      byte_length: termOut.byte_length,
      repo_relative_path: termOut.repo_relative_path,
    }],
  });

  return event;
}

// ══════════════════════════════════════════════════════════════════════
//  executeNightly — single production entry point
// ══════════════════════════════════════════════════════════════════════

export async function executeNightly({
  runsRoot,
  repositoryRoot,
  repositoryAdapter,
  maintenanceExecutor,
  issueExecutor,
  contextCollector,
  gateExecutor,
  auditPlanner,
  targetSelector,
  targetExecutor,
  changedPathsCollector,
  timestamp: fixedTimestamp,
  onProgress,
} = {}) {
  if (typeof onProgress !== 'function') {
    onProgress = () => {};
  }

  const ts = () => fixedTimestamp || new Date().toISOString();

  // Validate baseline adapters
  if (!repositoryAdapter) throw new Error('missing_required_adapters: repositoryAdapter');
  if (!maintenanceExecutor) throw new Error('missing_required_adapters: maintenanceExecutor');
  if (!issueExecutor) throw new Error('missing_required_adapters: issueExecutor');
  if (!contextCollector) throw new Error('missing_required_adapters: contextCollector');

  let runId;
  let activeReservation = false;

  try {
    // ── Pre-flight: baseline check ──────────────────────────────────
    onProgress('Phase: pre-flight baseline');
    const head = repositoryAdapter.getHead();
    const branch = repositoryAdapter.getBranch();
    const upstream = repositoryAdapter.getUpstream();
    const clean = repositoryAdapter.isWorktreeClean();

    if (!/^[a-f0-9]{40}$/.test(head)) {
      throw new Error(`invalid_head: expected 40-char hex, got ${head}`);
    }
    if (!clean) {
      return {
        run_id: null, status: 'blocked', outcome: null,
        error: 'dirty_worktree',
        events: [],
      };
    }

    // ── 1. Generate run ID and acquire reservation ───────────────────
    runId = generateRunId();
    acquireGlobalReservation({ runsRoot, runId, onProgress });
    activeReservation = true;

    // ── 2. Reserve run directory ────────────────────────────────────
    onProgress('Phase: init');
    reserveRun({
      runsRoot, runId,
      baseline: { head_sha: head, branch, upstream, worktree_clean: clean },
      timestamp: ts(),
    });

    // ── 3. Maintenance phase ────────────────────────────────────────
    onProgress('Phase: maintenance');
    const maintResult = await maintenanceExecutor({ runId, runsRoot, head });
    _assertMaintResult(maintResult);

    const maintOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: 'maintenance.json',
      content: JSON.stringify({
        ok: true,
        source_results: maintResult.sourceResults || [],
        health: maintResult.health,
        provider_incidents: maintResult.providerIncidents || [],
      }),
    });
    appendPhaseEvent({
      runsRoot, runId, phase: 'maintenance', timestamp: ts(),
      outputDescriptors: [{
        label: maintOut.label, digest: maintOut.digest,
        byte_length: maintOut.byte_length, repo_relative_path: maintOut.repo_relative_path,
      }],
    });

    if (maintResult.providerIncidents && maintResult.providerIncidents.length > 0) {
      const incidentDescs = maintResult.providerIncidents.map(i =>
        `${i.source_id}: ${i.error}${i.status_code ? ` (${i.status_code})` : ''}`,
      ).join('; ');
      return _blockedTerminal({
        runsRoot, runId, repositoryRoot,
        errorMsg: `provider_incident_blocked: ${incidentDescs}`,
        errors: maintResult.providerIncidents.length,
        onProgress,
        releaseMarker: () => { removeActiveMarker(runsRoot); activeReservation = false; },
      });
    }

    // ── 4. Issues phase ─────────────────────────────────────────────
    onProgress('Phase: issues');
    const issueResult = await issueExecutor({ runId, runsRoot, repositoryRoot });
    _assertIssueResult(issueResult);

    const issueSnapshot = issueResult.snapshot || { open: 0, acknowledged: 0, fulfilled: 0, blocked: 0 };
    const issuesOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: 'issues.json',
      content: JSON.stringify({
        ok: issueResult.ok,
        snapshot: issueSnapshot,
        workload_path: issueResult.workloadPath || null,
        demand_artifact_path: issueResult.demandArtifactPath || null,
        errors: issueResult.errors || [],
        new_unassessed: issueResult.newUnassessed || [],
      }),
    });
    appendPhaseEvent({
      runsRoot, runId, phase: 'issues', timestamp: ts(),
      outputDescriptors: [{
        label: issuesOut.label, digest: issuesOut.digest,
        byte_length: issuesOut.byte_length, repo_relative_path: issuesOut.repo_relative_path,
      }],
    });

    const issuesEventDigest = (readChain({ runsRoot, runId })).lastEvent.event_digest;

    if (!issueResult.ok) {
      const errMsg = issueResult.error || 'Issue stage incomplete';
      return _blockedTerminal({
        runsRoot, runId, repositoryRoot,
        errorMsg: errMsg, errors: 1, onProgress,
        releaseMarker: () => { removeActiveMarker(runsRoot); activeReservation = false; },
      });
    }

    if (issueResult.newUnassessed && issueResult.newUnassessed.length > 0) {
      if (!issueResult._assessed_unassessed) {
        const errMsg = `blocked: ${issueResult.newUnassessed.length} new unassessed issue(s) require isolated semantic assessment, no trusted executor available`;
        return _blockedTerminal({
          runsRoot, runId, repositoryRoot,
          errorMsg: errMsg, errors: 1, onProgress,
          releaseMarker: () => { removeActiveMarker(runsRoot); activeReservation = false; },
        });
      }
    }

    // ── 5. Context phase ────────────────────────────────────────────
    onProgress('Phase: context');

    const collected = contextCollector({
      catalogRoot: join(repositoryRoot, 'catalog'),
      issueWorkloadPath: issueResult.workloadPath || null,
      demandArtifactPath: issueResult.demandArtifactPath || null,
    });

    if (!collected || !collected.context) {
      throw new Error('context_collector_failed: no context returned');
    }

    const workloadDigest = issueResult.workloadPath && existsSync(issueResult.workloadPath)
      ? computeContentDigest(readFileSync(issueResult.workloadPath, 'utf8'))
      : `sha256:${createHash('sha256').update('empty').digest('hex')}`;

    const demandDigest = issueResult.demandArtifactPath && existsSync(issueResult.demandArtifactPath)
      ? computeContentDigest(readFileSync(issueResult.demandArtifactPath, 'utf8'))
      : `sha256:${createHash('sha256').update('empty').digest('hex')}`;

    const runContext = {
      schema_version: 3,
      run_id: runId,
      snapshot_id: `snap_${runId}`,
      timestamp: ts(),
      catalog_counts: collected.context.catalogCounts || {},
      freshness: collected.context.freshness || {},
      coverage: collected.context.coverage || {},
      relations: collected.context.relations || {},
      pack_lifecycle: collected.context.packLifecycle || {},
      issue_digest: collected.context.issueDigest || { open: 0, acknowledged: 0, fulfilled: 0, blocked: 0 },
      demand_metadata: collected.demandMetadata || { demand_skill_ids: [], domain_slugs: [] },
      prior_fingerprint: collected.context.priorFingerprint || '',
      snapshot_digest: collected.snapshotDigest || `sha256:${createHash('sha256').update('empty').digest('hex')}`,
      evidence_manifest_digest: collected.evidenceManifestDigest || `sha256:${createHash('sha256').update('empty').digest('hex')}`,
      issues_event_digest: issuesEventDigest,
      workload_digest: workloadDigest,
      demand_digest: demandDigest,
      notes: collected.context.notes || '',
      digest: '',
    };
    runContext.digest = _computeContextDigest(runContext);

    // Validate context schema
    const contextValidation = validateAgainstSchema(runContext, runContextSchemaV3);
    if (!contextValidation.ok) {
      throw new Error(`run_context_schema_invalid: ${contextValidation.errors.join('; ')}`);
    }

    // Fixture/test bypass: allow zero-catalog for test contexts
    // Production must reject zero contexts (handled by contextCollector)

    const contextOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: 'run-context.json',
      content: JSON.stringify(runContext),
    });
    appendPhaseEvent({
      runsRoot, runId, phase: 'context', timestamp: ts(),
      outputDescriptors: [{
        label: contextOut.label, digest: contextOut.digest,
        byte_length: contextOut.byte_length, repo_relative_path: contextOut.repo_relative_path,
      }],
    });

    // ── 6. Target intents ───────────────────────────────────────────
    let intents;
    if (targetSelector) {
      intents = targetSelector({
        coverage: runContext.coverage,
        relations: runContext.relations,
        packLifecycle: runContext.pack_lifecycle,
        catalogCounts: runContext.catalog_counts,
        issueDemandMetadata: runContext.demand_metadata,
        maxTargets: 2,
      });
    } else {
      intents = { intents: [], total: 0, max_targets: 2, capped: false, has_demand: false };
    }

    // ── 7. Targets phase ────────────────────────────────────────────
    onProgress('Phase: targets');
    let candidateResults = [];
    let targetsInterrupted = false;
    let targetsTimeout = false;

    if (intents.intents.length > 0) {
      if (!targetExecutor) {
        const errMsg = `blocked: ${intents.intents.length} intents require a target executor, but none is available`;
        return _blockedTerminal({
          runsRoot, runId, repositoryRoot,
          errorMsg: errMsg, errors: 1, onProgress,
          releaseMarker: () => { removeActiveMarker(runsRoot); activeReservation = false; },
        });
      }

      try {
        const targetResult = await targetExecutor({ runContext, intents, runId });
        candidateResults = targetResult.candidateResults || [];
        targetsInterrupted = targetResult.interrupted === true;
        targetsTimeout = targetResult.timeout === true;
      } catch (e) {
        if (e.message && (e.message.includes('timeout') || e.message.includes('interrupt'))) {
          targetsInterrupted = true;
        } else {
          throw e;
        }
      }
    }

    const targetsOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: 'targets.json',
      content: JSON.stringify({
        intents: intents.intents,
        candidate_results: candidateResults,
        interrupted: targetsInterrupted,
        timeout: targetsTimeout,
      }),
    });
    appendPhaseEvent({
      runsRoot, runId, phase: 'targets', timestamp: ts(),
      outputDescriptors: [{
        label: targetsOut.label, digest: targetsOut.digest,
        byte_length: targetsOut.byte_length, repo_relative_path: targetsOut.repo_relative_path,
      }],
    });

    if (targetsTimeout || targetsInterrupted) {
      const reason = targetsTimeout ? 'Target execution timed out' : 'Target execution interrupted';
      const terminalPayload = buildTerminalPayload({
        runId, status: 'interrupted', outcome: null,
        summary: reason, errors: 1,
      });
      finalizeTerminal({ runsRoot, runId, repositoryRoot, terminalPayload });
      removeActiveMarker(runsRoot);
      activeReservation = false;
      return {
        run_id: runId, status: 'interrupted', outcome: null,
        error: reason,
        events: (readChain({ runsRoot, runId })).events || [],
      };
    }

    // ── 8. Gate phase — exactly once ────────────────────────────────
    onProgress('Phase: gate');

    if (!gateExecutor) {
      const errMsg = 'blocked: gate executor is required in production';
      return _blockedTerminal({
        runsRoot, runId, repositoryRoot,
        errorMsg: errMsg, errors: 1, onProgress,
        releaseMarker: () => { removeActiveMarker(runsRoot); activeReservation = false; },
      });
    }

    const chainAfterTargets = readChain({ runsRoot, runId });
    const targetsEvent = chainAfterTargets.ok
      ? (chainAfterTargets.events.findLast(e => e.phase === 'targets') || chainAfterTargets.lastEvent)
      : { event_digest: '' };
    const targetsEventDigest = targetsEvent.event_digest;
    const gateId = computeGateId(runId, runContext.digest, targetsEventDigest);

    let gateResult;
    let gatePassed = true;

    try {
      gateResult = await gateExecutor({
        runId, runsRoot, runContext, targetsEventDigest, gateId,
      });
      gatePassed = gateResult.passed !== false;
    } catch (e) {
      onProgress(`Gate execution error: ${e.message}`);
      gatePassed = false;
      gateResult = {
        schema_version: 3, gate_id: gateId, run_id: runId,
        pre_gate_event_digest: targetsEventDigest,
        passed: false, invoked_count: 1,
        started_at: ts(), finished_at: ts(),
        checks: [], evidence_logs: [],
        errors: [e.message], decision: 'fail',
      };
    }

    if (!gateResult.result_digest) {
      gateResult.result_digest = `sha256:${computeGateResultDigest(gateResult)}`;
    }
    if (!gateResult.decision) {
      gateResult.decision = gatePassed ? 'pass' : 'fail';
    }

    // Schema-validate gate result BEFORE publish
    const gateSchemaValidation = validateAgainstSchema(gateResult, gateResultSchemaV3);
    if (!gateSchemaValidation.ok) {
      throw new Error(`gate_result_schema_invalid: ${gateSchemaValidation.errors.join('; ')}`);
    }

    // Trusted validation — call before publish, fail-closed on mismatch
    const trustedCheck = validateGateResultAgainstTrusted(gateResult);
    if (!trustedCheck.ok) {
      gatePassed = false;
      gateResult.passed = false;
      gateResult.decision = 'fail';
      gateResult.errors = [...(gateResult.errors || []), ...trustedCheck.errors];
      gateResult.result_digest = `sha256:${computeGateResultDigest(gateResult)}`;
    }

    // Publish gate result and evidence files as output descriptors
    const gateOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: 'gate-result.json',
      content: JSON.stringify(gateResult),
    });

    // Publish evidence log files and build descriptors
    const gateOutputDescriptors = [{
      label: gateOut.label, digest: gateOut.digest,
      byte_length: gateOut.byte_length, repo_relative_path: gateOut.repo_relative_path,
    }];
    const evidenceDir = join(runsRoot, runId, 'gate-evidence');
    for (const evLog of (gateResult.evidence_logs || [])) {
      const safeName = evLog.check_name.replace(/[^a-zA-Z0-9_-]/g, '_');
      for (const stream of ['stdout', 'stderr']) {
        const srcPath = join(evidenceDir, `${safeName}.${stream}.log`);
        const content = existsSync(srcPath) ? readFileSync(srcPath, 'utf8') : '';
        if (content.length === 0) continue;
        const evOut = publishOutput({
          runsRoot, runId, repositoryRoot,
          name: `gate-evidence-${safeName}.${stream}.log`,
          content,
        });
        gateOutputDescriptors.push({
          label: evOut.label, digest: evOut.digest,
          byte_length: evOut.byte_length, repo_relative_path: evOut.repo_relative_path,
        });
      }
    }

    appendPhaseEvent({
      runsRoot, runId, phase: 'gate', timestamp: ts(),
      outputDescriptors: gateOutputDescriptors,
    });

    if (!gatePassed) {
      const errSummary = (gateResult.errors && gateResult.errors.length > 0)
        ? `Gate failed: ${gateResult.errors.join('; ')}`
        : 'Gate failed';
      const terminalPayload = buildTerminalPayload({
        runId, status: 'failed', outcome: null,
        summary: errSummary, errors: gateResult.errors?.length || 1,
      });
      finalizeTerminal({ runsRoot, runId, repositoryRoot, terminalPayload });
      removeActiveMarker(runsRoot);
      activeReservation = false;
      return {
        run_id: runId, status: 'failed', outcome: null,
        error: errSummary,
        events: (readChain({ runsRoot, runId })).events || [],
      };
    }

    // ── 9. Seal phase — v3 ledger, summary, manifest, seal ──────────
    onProgress('Phase: seal');

    const chainAfterGate = readChain({ runsRoot, runId });
    const gateEvent = chainAfterGate.ok
      ? (chainAfterGate.events.find(e => e.phase === 'gate') || chainAfterGate.lastEvent)
      : { event_digest: '' };

    const maintenanceOutcomes = _deriveMaintOutcomes(maintResult);
    const issueOutcomes = _deriveIssueOutcomes(issueResult);
    const intentOutcomes = _deriveIntentOutcomes(intents, targetsInterrupted, targetsTimeout, !targetExecutor && intents.intents.length > 0, candidateResults);
    const candidateOutcomes = candidateResults
      .filter(c => c.terminal)
      .map(c => ({ pack_id: c.pack_id || 'unknown', terminal: c.terminal }));

    const ledger = buildRunLedgerV3({
      runId,
      timestamp: ts(),
      maintenanceOutcomes,
      issueOutcomes,
      intentOutcomes,
      candidateOutcomes,
    });

    const ledgerValidation = validateAgainstSchema(ledger, runLedgerSchemaV3);
    if (!ledgerValidation.ok) {
      throw new Error(`ledger_schema_invalid: ${ledgerValidation.errors.join('; ')}`);
    }

    const ledgerOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: 'run-ledger.json',
      content: JSON.stringify(ledger),
    });

    let report = '# Nightly Run Report\n\n';
    report += `**Run ID**: ${runId}\n`;
    report += `**Timestamp**: ${ledger.timestamp}\n`;
    report += `**Status**: ${ledger.run_outcome.status}\n`;
    report += `**Summary**: ${ledger.run_outcome.summary}\n`;
    report += `\n## Context Digest\n${runContext.digest}\n`;
    report += `\n## Gate\nGate ID: ${gateId}\n`;
    report += `Passed: ${gatePassed}\n`;
    report += '\n## Intents\n';
    if (intents.intents.length > 0) {
      for (const intent of intents.intents) {
        report += `- ${intent.domain}: ${intent.reason}\n`;
      }
    } else {
      report += '_No intents_\n';
    }

    const reportOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: 'report.md',
      content: report,
    });

    const summary = {
      schema_version: 3,
      run_id: runId,
      ledger_id: ledger.ledger_id,
      context_digest: runContext.digest,
      ledger_digest: ledger.ledger_digest,
      timestamp: ledger.timestamp,
      run_outcome: ledger.run_outcome,
      gate: {
        gate_id: gateId,
        decision: gatePassed ? 'pass' : 'fail',
        passed: gatePassed,
        errors: gateResult.errors || [],
        warnings: gateResult.warnings || [],
      },
      intents: (intents.intents || []).map(i => ({
        domain: i.domain,
        source: i.source,
        reason: i.reason,
        score: i.score,
        seed_skill_ids: i.seed_skill_ids || [],
        max_analysis_budget: i.max_analysis_budget,
      })),
      outcome_counts: {
        sources: maintenanceOutcomes.length,
        skills: 0,
        relations: 0,
        packs: candidateOutcomes.length,
        issues: issueOutcomes.length,
      },
    };

    // Validate summary schema BEFORE publish (avoid invalid write-once artifact)
    const summaryValidation = validateAgainstSchema(summary, runSummarySchemaV3);
    if (!summaryValidation.ok) {
      throw new Error(`run_summary_schema_invalid: ${summaryValidation.errors.join('; ')}`);
    }

    const summaryOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: 'run-summary.json',
      content: JSON.stringify(summary),
    });

    let changedPaths;
    let changedPathsCollectionError = null;
    try {
      changedPaths = changedPathsCollector
        ? changedPathsCollector({ repositoryRoot })
        : collectChangedPaths({ repositoryRoot });
    } catch (e) {
      changedPathsCollectionError = e.message;
      onProgress(`Warning: changed paths collection failed: ${e.message}`);
      changedPaths = [];
    }

    const outDir = outputsDir(runsRoot, runId);
    const futurePaths = [
      ledgerOut.repo_relative_path,
      reportOut.repo_relative_path,
      summaryOut.repo_relative_path,
      relative(repositoryRoot, join(outDir, 'seal-manifest.json')),
      relative(repositoryRoot, join(outDir, 'seal.json')),
      relative(repositoryRoot, join(outDir, `audit_${runId}.json`)),
      relative(repositoryRoot, join(outDir, 'terminal.json')),
    ];

    const sealRecord = {
      schema_version: 3,
      seal_id: `seal_${runId}`,
      run_id: runId,
      context_digest: runContext.digest,
      gate_event_digest: gateEvent.event_digest,
      gate_result_digest: gateResult.result_digest || '',
      ledger_digest: ledger.ledger_digest,
      manifest_digest: '',
      seal_digest: '',
    };

    // Build manifest first (no seal_digest — unidirectional binding)
    const finalManifest = buildManifestV3({
      baselineHead: head,
      changedPaths,
      futurePaths,
      ledgerDigest: ledger.ledger_digest,
      summaryDigest: summaryOut.digest,
    });

    const finalManifestOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: 'seal-manifest.json',
      content: JSON.stringify(finalManifest),
    });

    // Validate manifest schema
    const manifestValidation = validateAgainstSchema(finalManifest, sealManifestSchemaV3);
    if (!manifestValidation.ok) {
      throw new Error(`seal_manifest_schema_invalid: ${manifestValidation.errors.join('; ')}`);
    }

    // Bind manifest_digest into seal, then compute seal_digest
    sealRecord.manifest_digest = finalManifestOut.digest;
    const { seal_digest: _sd, ...sealRest } = sealRecord;
    sealRecord.seal_digest = `sha256:${createHash('sha256').update(canonicalStringify(sealRest)).digest('hex')}`;

    // Validate seal schema
    const sealValidation = validateAgainstSchema(sealRecord, sealSchemaV3);
    if (!sealValidation.ok) {
      throw new Error(`seal_schema_invalid: ${sealValidation.errors.join('; ')}`);
    }

    const sealOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: 'seal.json',
      content: JSON.stringify(sealRecord),
    });

    appendPhaseEvent({
      runsRoot, runId, phase: 'seal', timestamp: ts(),
      outputDescriptors: [
        { label: ledgerOut.label, digest: ledgerOut.digest, byte_length: ledgerOut.byte_length, repo_relative_path: ledgerOut.repo_relative_path },
        { label: reportOut.label, digest: reportOut.digest, byte_length: reportOut.byte_length, repo_relative_path: reportOut.repo_relative_path },
        { label: summaryOut.label, digest: summaryOut.digest, byte_length: summaryOut.byte_length, repo_relative_path: summaryOut.repo_relative_path },
        { label: finalManifestOut.label, digest: finalManifestOut.digest, byte_length: finalManifestOut.byte_length, repo_relative_path: finalManifestOut.repo_relative_path },
        { label: sealOut.label, digest: sealOut.digest, byte_length: sealOut.byte_length, repo_relative_path: sealOut.repo_relative_path },
      ],
    });

    // ── 10. Audit phase ─────────────────────────────────────────────
    onProgress('Phase: audit');

    if (!auditPlanner) throw new Error('missing_required_adapters: auditPlanner');

    // --- Cross-check manifest vs actual state ---
    let auditReady = true;
    let auditErrors = [];
    let auditWarnings = [];

    const manifestPaths = new Set(finalManifest.paths || []);
    const allDeclaredPaths = new Set([...changedPaths, ...futurePaths]);
    const missingFromManifest = [...allDeclaredPaths].filter(p => !manifestPaths.has(p));
    if (missingFromManifest.length > 0) {
      auditErrors.push(`manifest_coverage_gap: ${missingFromManifest.length} path(s) not in manifest: ${missingFromManifest.slice(0, 5).join(', ')}${missingFromManifest.length > 5 ? '...' : ''}`);
      auditReady = false;
    }
    if (finalManifest.baseline_head !== head) {
      auditErrors.push(`manifest_baseline_mismatch: manifest has ${finalManifest.baseline_head}, expected ${head}`);
      auditReady = false;
    }
    // Verify emitted manifest/seal files match digest
    const manifestOnDisk = readFileSync(join(outputsDir(runsRoot, runId), 'seal-manifest.json'), 'utf8');
    const manifestDiskDigest = computeContentDigest(manifestOnDisk);
    if (manifestDiskDigest !== finalManifestOut.digest) {
      auditErrors.push(`manifest_disk_digest_mismatch: on-disk ${manifestDiskDigest}, descriptor ${finalManifestOut.digest}`);
      auditReady = false;
    }
    const sealOnDisk = readFileSync(join(outputsDir(runsRoot, runId), 'seal.json'), 'utf8');
    const sealDiskDigest = computeContentDigest(sealOnDisk);
    if (sealDiskDigest !== sealOut.digest) {
      auditErrors.push(`seal_disk_digest_mismatch: on-disk ${sealDiskDigest}, descriptor ${sealOut.digest}`);
      auditReady = false;
    }

    const auditCheck = checkAuditPaths({ changedPaths });
    if (!auditCheck.ready) auditReady = false;
    auditErrors.push(...auditCheck.errors);
    auditWarnings.push(...auditCheck.warnings);

    if (changedPathsCollectionError) {
      auditErrors.push(`git_collection_failure: ${changedPathsCollectionError}`);
      auditReady = false;
    }

    try {
      const decision = auditPlanner({
        baselineHead: head,
        sealDigest: sealRecord.seal_digest,
        manifestDigest: finalManifestOut.digest,
        changedPaths,
      });
      if (!decision.ready) auditReady = false;
      if (decision.errors) auditErrors.push(...decision.errors);
      if (decision.warnings) auditWarnings.push(...decision.warnings);
    } catch (e) {
      auditErrors.push(`audit_planner_error: ${e.message}`);
      auditReady = false;
    }

    const sortedChangedPaths = [...new Set(changedPaths)].sort();
    const changedPathsDigest = `sha256:${createHash('sha256').update(JSON.stringify(sortedChangedPaths)).digest('hex')}`;

    const chainAfterSeal = readChain({ runsRoot, runId });
    const sealEventDigest = chainAfterSeal.ok
      ? (chainAfterSeal.events.find(e => e.phase === 'seal') || chainAfterSeal.lastEvent).event_digest
      : '';

    const receipt = {
      schema_version: 3,
      audit_id: `audit_${runId}`,
      run_id: runId,
      seal_event_digest: sealEventDigest,
      baseline_head: head,
      seal_digest: sealRecord.seal_digest,
      manifest_digest: finalManifestOut.digest,
      changed_paths: sortedChangedPaths,
      changed_paths_digest: changedPathsDigest,
      ready: auditReady,
      errors: auditErrors,
      warnings: auditWarnings,
      receipt_digest: '',
    };
    const { receipt_digest, ...receiptRest } = receipt;
    receipt.receipt_digest = `sha256:${createHash('sha256').update(canonicalStringify(receiptRest)).digest('hex')}`;

    // Schema-validate receipt BEFORE publish
    const receiptValidation = validateAgainstSchema(receipt, auditReceiptSchemaV3);
    if (!receiptValidation.ok) {
      throw new Error(`audit_receipt_schema_invalid: ${receiptValidation.errors.join('; ')}`);
    }

    const receiptOut = publishOutput({
      runsRoot, runId, repositoryRoot,
      name: `audit_${runId}.json`,
      content: JSON.stringify(receipt),
    });

    appendPhaseEvent({
      runsRoot, runId, phase: 'audit', timestamp: ts(),
      outputDescriptors: [{
        label: receiptOut.label, digest: receiptOut.digest,
        byte_length: receiptOut.byte_length, repo_relative_path: receiptOut.repo_relative_path,
      }],
    });

    if (!auditReady) {
      const errSummary = auditErrors.length > 0
        ? `Audit blocked: ${auditErrors.join('; ')}`
        : 'Audit not ready';
      const terminalPayload = buildTerminalPayload({
        runId, status: 'audit_blocked', outcome: null,
        summary: errSummary, errors: auditErrors.length || 1,
      });
      finalizeTerminal({ runsRoot, runId, repositoryRoot, terminalPayload });
      removeActiveMarker(runsRoot);
      activeReservation = false;
      return {
        run_id: runId, status: 'audit_blocked', outcome: null,
        error: errSummary,
        events: (readChain({ runsRoot, runId })).events || [],
      };
    }

    // ── 11. Pre-terminal path check (exclude terminal.json which is not yet written) ──
    const preTermPaths = futurePaths.filter(fp => !fp.endsWith('terminal.json'));
    for (const fp of preTermPaths) {
      const fullPath = join(repositoryRoot, fp);
      if (!existsSync(fullPath)) {
        throw new Error(`final_path_check_failed: declared future path missing on disk: ${fp}`);
      }
    }

    // ── 12. Terminal phase ──────────────────────────────────────────
    onProgress('Phase: terminal');
    const hasPublishedCandidate = candidateResults.some(c => c.terminal === 'promoted');
    const outcome = hasPublishedCandidate ? 'published' : 'no_pack_clean';
    const termSummary = hasPublishedCandidate
      ? 'Run completed successfully. Pack(s) published.'
      : 'Run completed with no packs to publish. Zero packs is a clean terminal state.';

    const prevForTerm = readChain({ runsRoot, runId }).lastEvent;
    const terminalPayload = buildTerminalPayload({
      runId,
      status: 'completed',
      outcome,
      summary: termSummary,
      totalActions: PHASES.length,
      errors: 0,
      warnings: 0,
      lastPhaseEventDigest: prevForTerm.event_digest,
    });

    finalizeTerminal({ runsRoot, runId, repositoryRoot, terminalPayload });
    removeActiveMarker(runsRoot);
    activeReservation = false;

    // Post-terminal: verify terminal.json now exists
    const termPath = futurePaths.find(fp => fp.endsWith('terminal.json'));
    if (termPath && !existsSync(join(repositoryRoot, termPath))) {
      throw new Error(`final_path_check_failed: terminal output missing after write: ${termPath}`);
    }

    const finalChain = readChain({ runsRoot, runId });

    return {
      run_id: runId,
      status: 'completed',
      outcome,
      summary: termSummary,
      events: finalChain.ok ? finalChain.events : [],
      event_count: finalChain.ok ? finalChain.events.length : 0,
    };
  } catch (e) {
    onProgress(`FATAL: ${e.message}`);
    if (runId && activeReservation) {
      try {
        const chain = readChain({ runsRoot, runId });
        if (chain.ok && chain.lastEvent.phase !== 'terminal') {
          const termPayload = buildTerminalPayload({
            runId, status: 'failed', outcome: null,
            summary: `Run failed: ${e.message}`, errors: 1,
          });
          finalizeTerminal({ runsRoot, runId, repositoryRoot, terminalPayload: termPayload });
        }
      } catch (tErr) {
        onProgress(`Failed to write terminal: ${tErr.message}`);
      }
    }
    if (activeReservation) {
      removeActiveMarker(runsRoot);
      activeReservation = false;
    }
    throw e;
  }
}

// ══════════════════════════════════════════════════════════════════════
//  Private helpers
// ══════════════════════════════════════════════════════════════════════

function _blockedTerminal({ runsRoot, runId, repositoryRoot, errorMsg, errors, onProgress, releaseMarker }) {
  onProgress(`ERROR: ${errorMsg}`);
  const terminalPayload = buildTerminalPayload({
    runId, status: 'blocked', outcome: null,
    summary: errorMsg, errors,
  });
  finalizeTerminal({ runsRoot, runId, repositoryRoot, terminalPayload });
  releaseMarker();
  return {
    run_id: runId, status: 'blocked', outcome: null,
    error: errorMsg,
    events: (readChain({ runsRoot, runId })).events || [],
  };
}

function _assertMaintResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('maintenance_executor_failed: must return a result object');
  }
  if (result.ok === false) {
    throw new Error('maintenance_executor_failed: result.ok === false, maintenance stage must not fail open');
  }
}

function _assertIssueResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('issue_executor_failed: must return a result object');
  }
}

function _computeContextDigest(ctx) {
  const { digest, ...rest } = ctx;
  return `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;
}

function _deriveMaintOutcomes(maintResult) {
  const results = [];
  for (const sr of (maintResult.sourceResults || [])) {
    results.push({
      source_id: sr.source_id || 'unknown',
      state: sr.ok === false ? 'error' : 'synced',
      ...(sr.error ? { error: sr.error } : {}),
    });
  }
  for (const incident of (maintResult.providerIncidents || [])) {
    results.push({
      source_id: incident.source_id || 'unknown',
      state: 'incident',
      error: incident.error,
    });
  }
  return results;
}

function _deriveIssueOutcomes(issueResult) {
  // Use real issue outcomes from the executor when available.
  if (Array.isArray(issueResult.issueOutcomes) && issueResult.issueOutcomes.length > 0) {
    return issueResult.issueOutcomes;
  }
  // Derive from stage terminals when issueOutcomes not provided.
  if (issueResult.stageTerminals && Array.isArray(issueResult.stageTerminals) && issueResult.stageTerminals.length > 0) {
    return issueResult.stageTerminals.map(t => ({
      issue_number: t.issue_number,
      state: t.reply?.status
        ? (t.reply.status === 'posted' ? 'fulfilled'
            : t.reply.status === 'held_for_review' ? 'held'
            : t.reply.status === 'reply_blocked' ? 'blocked'
            : 'acknowledged')
        : 'acknowledged',
      assessment_id: t.assessment?.assessment_id || undefined,
    }));
  }
  // Zero-issue runs: empty outcomes is a clean terminal state
  const snapshot = issueResult.snapshot || {};
  const hasIssues = (snapshot.open || 0) + (snapshot.acknowledged || 0) + (snapshot.fulfilled || 0) + (snapshot.blocked || 0) > 0;
  if (!hasIssues) return [];
  // Fail closed: snapshot says there are issues but no real outcomes available
  throw new Error('issue_executor_missing_outcomes: no issueOutcomes or stageTerminals; cannot synthesize from counts');
}

function _deriveIntentOutcomes(intents, interrupted, timeout, missingExecutor, candidateResults) {
  const outcomes = [];
  for (const intent of (intents.intents || [])) {
    if (missingExecutor) {
      outcomes.push({
        domain: intent.domain, source: intent.source,
        disposition: 'missing_executor',
        seed_skill_ids: intent.seed_skill_ids || [],
      });
    } else if (timeout) {
      outcomes.push({
        domain: intent.domain, source: intent.source,
        disposition: 'timeout',
        seed_skill_ids: intent.seed_skill_ids || [],
      });
    } else if (interrupted) {
      outcomes.push({
        domain: intent.domain, source: intent.source,
        disposition: 'interrupted',
        seed_skill_ids: intent.seed_skill_ids || [],
      });
    } else {
      // Use real target result terminals: if there are promoted candidates, mark 'executed'; otherwise 'no_pack_clean'
      const hasPromoted = Array.isArray(candidateResults) && candidateResults.some(c => c.terminal === 'promoted');
      outcomes.push({
        domain: intent.domain, source: intent.source,
        disposition: hasPromoted ? 'executed' : 'no_pack_clean',
        seed_skill_ids: intent.seed_skill_ids || [],
      });
    }
  }
  return outcomes;
}
