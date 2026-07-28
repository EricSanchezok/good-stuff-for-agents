#!/usr/bin/env node
/**
 * Nightly Controller — production CLI entry point.
 *
 * Import-safe: zero I/O on import. All behavior lives in main().
 *
 * Production CLI:
 *   node nightly-controller.mjs
 *
 * No flags accepted. Unknown args fail.
 * All progress/logs go to stderr. One JSON result goes to stdout.
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { executeNightly } from './lib/nightly-controller-core.mjs';
import { selectTargetIntents } from './lib/target-selector.mjs';
import { collectRunContextInput } from './lib/collector.mjs';
import { loadRegistry as _loadRegistry, validateCatalog as _validateCatalog, writeTextAtomic as _writeTextAtomic, ROOT, CATALOG } from '../../catalog-data/scripts/lib/catalog-lib.mjs';
import { catalogData as _catalogData } from '../../catalog-data/scripts/lib/pipeline-cli.mjs';
import { syncApprovedSources as _syncApprovedSources } from '../../source-sync/scripts/sync-sources-lib.mjs';
import { prepareIssueStage as _prepareIssueStage, finalizeIssueStage as _finalizeIssueStage, checkGhAuth as _checkGhAuth } from '../../catalog-growth-ops/scripts/issue-stage-orchestrator.mjs';

const RUNS_ROOT = join(CATALOG, 'runs');

// ══════════════════════════════════════════════════════════════════════
//  Production repository adapter
// ══════════════════════════════════════════════════════════════════════

function buildProductionRepoAdapter() {
  function git(cmd, extraOpts = {}) {
    const result = spawnSync('git', cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: extraOpts.timeout || 10000,
    });
    return result.status === 0 ? result.stdout.trim() : null;
  }

  return {
    getHead() {
      const head = git(['rev-parse', 'HEAD']);
      if (!head || head.length !== 40) throw new Error('Cannot resolve HEAD to 40-char hex SHA');
      return head;
    },
    getBranch() {
      return git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'HEAD';
    },
    getUpstream() {
      return git(['rev-parse', '--abbrev-ref', '@{upstream}']) || undefined;
    },
    isWorktreeClean() {
      const statusResult = spawnSync('git', ['status', '--porcelain'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 10000,
      });
      if (statusResult.status !== 0) throw new Error('git status failed');
      return statusResult.stdout.trim().length === 0;
    },
    changedPaths(baseHead) {
      const result = spawnSync('git', ['diff', '--name-only', baseHead], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 10000,
      });
      if (result.status !== 0) return [];
      return result.stdout.trim().split('\n').filter(Boolean);
    },
  };
}

// ══════════════════════════════════════════════════════════════════════
//  Production context collector (thin wrapper)
// ══════════════════════════════════════════════════════════════════════

function productionContextCollector(opts) {
  return collectRunContextInput({
    catalogRoot: opts.catalogRoot || CATALOG,
    issueWorkloadPath: opts.issueWorkloadPath,
    demandArtifactPath: opts.demandArtifactPath,
  });
}

// ══════════════════════════════════════════════════════════════════════
//  Production gate executor — runs trusted checks in order
// ══════════════════════════════════════════════════════════════════════

import { TRUSTED_CHECKS, computeGateResultDigest } from './lib/gate-checks.mjs';
import { NIGHTLY_ALLOWED_PATHS } from './lib/manifest-collector.mjs';

const SYNERGY_NPM = join(ROOT, '.synergy');

// Minimal allowlist env for gate subprocess — no secrets, tokens, or arbitrary parent vars
function buildGateEnv() {
  const allowed = new Set(['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'LC_CTYPE']);
  const env = { NODE_ENV: 'production', CI: '1' };
  for (const key of Object.keys(process.env)) {
    if (key !== undefined && allowed.has(key) && process.env[key] !== undefined) {
      env[key] = process.env[key];
    }
  }
  return env;
}

function productionGateExecutor({
  runId, runsRoot, runContext, targetsEventDigest, gateId,
  _spawnSync = null,
}) {
  const effectiveSpawn = _spawnSync || spawnSync;
  const gateEnv = buildGateEnv();
  const startedAt = new Date().toISOString();
  const checks = [];
  const evidenceLogs = [];
  const evidenceDir = join(runsRoot, runId, 'gate-evidence');
  mkdirSync(evidenceDir, { recursive: true });

  for (const check of TRUSTED_CHECKS) {
    const checkStart = Date.now();
    let passed = false;
    let exitCode = -1;
    let stdoutContent = '';
    let stderrContent = '';

    try {
      const result = effectiveSpawn('npm', ['run', check.script, '--silent'], {
        cwd: SYNERGY_NPM,
        encoding: 'utf8',
        timeout: 120000,
        env: gateEnv,
      });
      exitCode = result.status != null ? result.status : 1;
      stdoutContent = result.stdout || '';
      stderrContent = result.stderr || '';
      passed = exitCode === 0;
    } catch (e) {
      stderrContent = e.message;
      exitCode = 1;
      passed = false;
    }

    const durationMs = Date.now() - checkStart;

    checks.push({
      name: check.name,
      script: check.script,
      passed,
      exit_code: exitCode,
      duration_ms: durationMs,
    });

    // Write evidence files write-once (fail-closed: no silent skip on collision)
    const safeName = check.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const stdoutPath = join(evidenceDir, `${safeName}.stdout.log`);
    const stderrPath = join(evidenceDir, `${safeName}.stderr.log`);

    writeFileSync(stdoutPath, stdoutContent, { flag: 'wx' });
    writeFileSync(stderrPath, stderrContent, { flag: 'wx' });

    evidenceLogs.push({
      check_name: check.name,
      stdout_digest: `sha256:${createHash('sha256').update(stdoutContent).digest('hex')}`,
      stderr_digest: `sha256:${createHash('sha256').update(stderrContent).digest('hex')}`,
      stdout_path: `${safeName}.stdout.log`,
      stderr_path: `${safeName}.stderr.log`,
    });
  }

  const finishedAt = new Date().toISOString();
  const allPassed = checks.every(c => c.passed);

  const gateResult = {
    schema_version: 3,
    gate_id: gateId,
    run_id: runId,
    pre_gate_event_digest: targetsEventDigest,
    passed: allPassed,
    invoked_count: 1,
    started_at: startedAt,
    finished_at: finishedAt,
    checks,
    evidence_logs: evidenceLogs,
    decision: allPassed ? 'pass' : 'fail',
    errors: allPassed ? [] : checks.filter(c => !c.passed).map(c => `${c.name}: exit ${c.exit_code}`),
  };

  gateResult.result_digest = `sha256:${computeGateResultDigest(gateResult)}`;
  return gateResult;
}

// ══════════════════════════════════════════════════════════════════════
//  Production maintenance executor — accepts optional DI deps for testing
// ══════════════════════════════════════════════════════════════════════

async function productionMaintenanceExecutor({ runId, runsRoot, head, deps } = {}) {
  const validateCatalog = deps?.validateCatalog || _validateCatalog;
  const loadRegistry = deps?.loadRegistry || _loadRegistry;
  const syncApprovedSources = deps?.syncApprovedSources || _syncApprovedSources;
  const catalogData = deps?.catalogData || _catalogData;
  const writeTextAtomic = deps?.writeTextAtomic || _writeTextAtomic;

  const validation = validateCatalog({ strict: true });
  if (!validation.ok) {
    throw new Error(`maintenance_validation_failed: ${validation.errors.join('; ')}`);
  }

  const registry = loadRegistry();
  const syncSummary = await syncApprovedSources({
    sources: registry.sources,
    writeSourceRecord: (record) => {
      catalogData('write-source-record.mjs', record);
    },
    writeSnapshot: (path, content) => {
      writeTextAtomic(path, content);
    },
  });

  const sourceResults = [];
  for (const se of syncSummary.source_errors) {
    sourceResults.push({
      source_id: se.source_id,
      ok: se.category === 'success',
      error: se.category !== 'success' ? (se.reason || se.category) : undefined,
      skills_found: se.skills_found ?? 0,
    });
  }

  const providerIncidents = (syncSummary.provider_incidents || []).map(pi => ({
    source_id: pi.affected_source_ids[0] || 'unknown',
    provider: pi.provider || 'github',
    error: `${pi.status ?? 'transport'}: ${pi.reason}`,
    status_code: pi.status,
  }));

  return {
    ok: true,
    health: validation.errors.length === 0 ? 'ok' : 'degraded',
    sourceResults,
    providerIncidents,
  };
}

// ══════════════════════════════════════════════════════════════════════
//  Production issue executor — accepts optional DI deps for testing
// ══════════════════════════════════════════════════════════════════════

async function productionIssueExecutor({ runId, runsRoot, repositoryRoot, deps } = {}) {
  const checkGhAuth = deps?.checkGhAuth || _checkGhAuth;
  const prepareIssueStage = deps?.prepareIssueStage || _prepareIssueStage;
  const finalizeIssueStage = deps?.finalizeIssueStage || _finalizeIssueStage;
  const _readFile = deps?.readFile || readFileSync;
  const _exists = deps?.fsExists || existsSync;
  const _mkdir = deps?.fsMkdir || (p => mkdirSync(p, { recursive: true }));
  const _writeFile = deps?.fsWriteFile || writeFileSync;

  const ghAuth = checkGhAuth()
  if (!ghAuth.ok || !ghAuth.authenticated) {
    return {
      ok: false,
      error: `gh_auth_unavailable: ${ghAuth.error || 'not authenticated'}`,
      snapshot: { open: 0, acknowledged: 0, fulfilled: 0, blocked: 1 },
      workloadPath: null,
      demandArtifactPath: null,
      errors: [ghAuth.error || 'gh not available'],
      newUnassessed: [],
      issueOutcomes: [],
      stageTerminals: [],
    }
  }

  const workloadPath = join(runsRoot, runId, 'issue-workload.json')
  const prepareResult = prepareIssueStage({ runId, workloadPath })

  if (!prepareResult.ok) {
    return {
      ok: false,
      error: `issue_prepare_failed: ${prepareResult.errors.join('; ')}`,
      snapshot: { open: 0, acknowledged: 0, fulfilled: 0, blocked: 1 },
      workloadPath: null,
      demandArtifactPath: null,
      errors: prepareResult.errors,
      newUnassessed: [],
      issueOutcomes: [],
      stageTerminals: [],
    }
  }

  if (!prepareResult.snapshot_complete) {
    return {
      ok: false,
      error: `issue_snapshot_incomplete: ${prepareResult.snapshot_diagnostics || 'unknown'}`,
      snapshot: { open: (prepareResult.workload_summary?.total_fetched || 0), acknowledged: 0, fulfilled: 0, blocked: 1 },
      workloadPath: workloadPath,
      demandArtifactPath: null,
      errors: prepareResult.errors,
      newUnassessed: [],
      issueOutcomes: [],
      stageTerminals: [],
    }
  }

  const acceptedCount = prepareResult.workload_summary?.accepted || 0
  const rejectedCount = prepareResult.workload_summary?.rejected || 0

  // Fail-closed: if semantic drafts are absent, all accepted issues are newUnassessed.
  const draftsPath = join(runsRoot, runId, 'issue-drafts.json')
  const hasDrafts = _exists(draftsPath)

  if (!hasDrafts) {
    let newUnassessed = []
    try {
      const wl = JSON.parse(_readFile(workloadPath, 'utf8'))
      if (wl.all_accepted_issues) {
        newUnassessed = wl.all_accepted_issues.map((iss) => ({
          issue_number: iss.issue_number,
          title: iss.intake?.issue_binding?.title || `Issue #${iss.issue_number}`,
        }))
      }
    } catch (_) {
      newUnassessed = []
    }

    return {
      ok: acceptedCount === 0,
      error: acceptedCount > 0
        ? `blocked: ${acceptedCount} accepted issue(s) require semantic assessment drafts (no drafts found at ${draftsPath})`
        : undefined,
      snapshot: {
        open: acceptedCount,
        acknowledged: 0,
        fulfilled: 0,
        blocked: rejectedCount,
      },
      workloadPath: workloadPath,
      demandArtifactPath: null,
      errors: acceptedCount > 0
        ? [`semantic_drafts_missing: ${acceptedCount} accepted issues require drafts`]
        : [],
      newUnassessed,
      issueOutcomes: [],
      stageTerminals: [],
    }
  }

  // Drafts present → finalize
  const outputPath = join(runsRoot, runId, 'stages-issues.json')
  const finalizeResult = await finalizeIssueStage({
    runId, workloadPath, draftsPath, outputPath,
    apply: false,
  })

  if (!finalizeResult.ok) {
    let newUnassessed = []
    try {
      const wl = JSON.parse(_readFile(workloadPath, 'utf8'))
      if (wl.all_accepted_issues) {
        newUnassessed = wl.all_accepted_issues.map((iss) => ({
          issue_number: iss.issue_number,
          title: iss.intake?.issue_binding?.title || `Issue #${iss.issue_number}`,
        }))
      }
    } catch (_) {}

    return {
      ok: false,
      error: `issue_finalize_failed: ${finalizeResult.errors.join('; ')}`,
      snapshot: { open: acceptedCount, acknowledged: 0, fulfilled: 0, blocked: acceptedCount },
      workloadPath,
      demandArtifactPath: null,
      errors: finalizeResult.errors,
      newUnassessed,
      issueOutcomes: [],
      stageTerminals: [],
    }
  }

  const stages = finalizeResult.stages_issues
  const allProcessed = stages?.all_open_issues_processed === true
  if (!allProcessed) {
    let newUnassessed = []
    try {
      const wl = JSON.parse(_readFile(workloadPath, 'utf8'))
      if (wl.all_accepted_issues) {
        newUnassessed = wl.all_accepted_issues.map((iss) => ({
          issue_number: iss.issue_number,
          title: iss.intake?.issue_binding?.title || `Issue #${iss.issue_number}`,
        }))
      }
    } catch (_) {}

    return {
      ok: false,
      error: 'issue_stage_not_all_open_issues_processed',
      snapshot: { open: acceptedCount, acknowledged: 0, fulfilled: 0, blocked: acceptedCount },
      workloadPath,
      demandArtifactPath: null,
      errors: ['all_open_issues_processed is not true'],
      newUnassessed,
      issueOutcomes: [],
      stageTerminals: [],
    }
  }

  // Build demand metadata and write demand artifact
  const demandArtifactPath = join(runsRoot, runId, 'demand.json')
  const demandMetadata = buildDemandMetadata(stages, runId, workloadPath, { readFile: _readFile })
  _mkdir(join(runsRoot, runId))
  _writeFile(demandArtifactPath, JSON.stringify(demandMetadata, null, 2), { flag: 'wx' })

  const fulfilled = stages.scan?.by_state?.fulfilled || 0
  const blocked = (stages.scan?.by_state?.blocked || 0) + rejectedCount

  // Build real issue outcomes and stage terminals from assessments
  const issueOutcomes = []
  const stageTerminals = []
  for (const a of (stages.assessments || [])) {
    if (a.issue_number != null) {
      stageTerminals.push({
        issue_number: a.issue_number,
        assessment: a.assessment,
        reply: a.reply,
      })
      const state = a.reply?.status === 'posted' ? 'fulfilled'
        : a.reply?.status === 'held_for_review' ? 'held'
        : a.reply?.status === 'reply_blocked' ? 'blocked'
        : 'acknowledged'
      issueOutcomes.push({
        issue_number: a.issue_number,
        state,
        assessment_id: a.assessment?.assessment_id || undefined,
      })
    }
  }

  return {
    ok: true,
    snapshot: {
      open: 0,
      acknowledged: 0,
      fulfilled,
      blocked,
    },
    workloadPath,
    demandArtifactPath,
    errors: finalizeResult.diagnostics || [],
    newUnassessed: [],
    _assessed_unassessed: true,
    demandMetadata,
    issueOutcomes,
    stageTerminals,
  }
}

function buildDemandMetadata(stagesIssues, runId, workloadPath, _deps = {}) {
  const _readFile = _deps.readFile || readFileSync;
  const demandSkillIds = []
  const domainSlugs = []

  for (const a of (stagesIssues.assessments || [])) {
    if (a.assessment?.public_evidence?.related_entities) {
      for (const entity of a.assessment.public_evidence.related_entities) {
        if (entity.entity_type === 'skill' && entity.entity_id) {
          demandSkillIds.push(entity.entity_id)
        }
      }
    }
  }

  let workloadDigest = ''
  try {
    const wl = JSON.parse(_readFile(workloadPath, 'utf8'))
    workloadDigest = wl.workload_digest || ''
  } catch (_) {}

  const uniqueSkills = [...new Set(demandSkillIds)].sort()
  const uniqueDomains = [...new Set(domainSlugs)].sort()

  const demand = {
    schema_version: 1,
    kind: 'issue_demand_binding',
    run_id: runId,
    workload_digest: workloadDigest,
    demand_skill_ids: uniqueSkills,
    domain_slugs: uniqueDomains,
    created_at: new Date().toISOString(),
  }

  const { digest: _d, ...rest } = demand
  demand.digest = `sha256:${createHash('sha256').update(JSON.stringify(rest, Object.keys(rest).sort())).digest('hex')}`

  return demand
}

// ══════════════════════════════════════════════════════════════════════
//  Production audit planner
// ══════════════════════════════════════════════════════════════════════

function productionAuditPlanner({ baselineHead, sealDigest, manifestDigest, changedPaths }) {
  if (!baselineHead || !/^[a-f0-9]{40}$/.test(baselineHead)) {
    return { ready: false, errors: ['missing_baseline_head'], warnings: [] };
  }
  if (!sealDigest || !/^sha256:[a-f0-9]{64}$/.test(sealDigest)) {
    return { ready: false, errors: ['missing_seal_digest'], warnings: [] };
  }

  const snoopErrors = [];

  // Snoop: detect .synergy code changes
  for (const p of changedPaths) {
    if (p.startsWith('.synergy/')) {
      snoopErrors.push(`code_path_blocker: ${p}`);
    }
    if (p.includes('.env') || p.includes('credentials') || p.includes('secret') || p.includes('.pem')) {
      snoopErrors.push(`secret_path: ${p}`);
    }
    if (p.startsWith('.git/') || p === '.git') {
      snoopErrors.push(`git_internal_path: ${p}`);
    }
  }

  // Snoop: detect manifest leak — paths in changedPaths not declared in allowed dirs
  for (const p of changedPaths) {
    if (p.startsWith('.synergy/') || p.startsWith('.git/')) continue;
    const allowed = NIGHTLY_ALLOWED_PATHS.some(d => {
      if (d.endsWith('/')) return p.startsWith(d);
      return p === d;
    });
    if (!allowed) {
      snoopErrors.push(`ordinary_path_blocker: ${p} is not in allowed directories`);
    }
  }

  const errors = [...snoopErrors];
  return {
    ready: errors.length === 0,
    errors,
    warnings: [],
  };
}

// ══════════════════════════════════════════════════════════════════════
//  main() — production CLI entry
// ══════════════════════════════════════════════════════════════════════

async function main() {
  // Reject all arguments — production CLI takes none
  const args = process.argv.slice(2);
  if (args.length > 0) {
    process.stderr.write(`[nightly] ERROR: unknown arguments: ${args.join(' ')}\n`);
    process.stderr.write('[nightly] Usage: node nightly-controller.mjs  (no arguments accepted)\n');
    process.exitCode = 1;
    return;
  }

  const repoAdapter = buildProductionRepoAdapter();

  const onProgress = (msg) => {
    process.stderr.write(`[nightly] ${msg}\n`);
  };

  let result;
  try {
    result = await executeNightly({
      runsRoot: RUNS_ROOT,
      repositoryRoot: ROOT,
      repositoryAdapter: repoAdapter,
      maintenanceExecutor: productionMaintenanceExecutor,
      issueExecutor: productionIssueExecutor,
      contextCollector: productionContextCollector,
      gateExecutor: productionGateExecutor,
      auditPlanner: productionAuditPlanner,
      targetSelector: selectTargetIntents,
      targetExecutor: null,
      onProgress,
    });
  } catch (e) {
    process.stderr.write(`[nightly] FATAL: ${e.message}\n`);
    process.exitCode = 1;
    return;
  }

  // Write structured JSON to stdout
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');

  // Exit code from result
  if (result.status !== 'completed') {
    process.exitCode = 1;
  }
}

// ══════════════════════════════════════════════════════════════════════
//  Import safety: isMain guard
// ══════════════════════════════════════════════════════════════════════

function isMain(metaUrl) {
  return process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
}

export {
  executeNightly,
  buildProductionRepoAdapter,
  productionContextCollector,
  productionMaintenanceExecutor,
  productionIssueExecutor,
  productionGateExecutor,
  productionAuditPlanner,
};

// ── Run if invoked directly ────────────────────────────────────────────
if (isMain(import.meta.url)) {
  main().catch((err) => {
    process.stderr.write(`[nightly] FATAL: ${err.message}\n`);
    process.exitCode = 1;
  });
}
