#!/usr/bin/env node
/**
 * Deterministic run sealing CLI and importable function.
 *
 * Input:  Stage output JSON (per stage-output-contract.md) via stdin or --input.
 * Output: Files written to --output-dir + JSON result to stdout.
 *
 * No semantic work. No executor calls. No issue replies, promotion, catalog
 * validation, or publishing. Consumes only owner outputs.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { ROOT, writeTextAtomic } from '../../catalog-data/scripts/lib/catalog-lib.mjs';
import { resumeRunContext, serializeRunContext } from './lib/run-context.mjs';
import { selectTargetIntents } from './lib/target-selector.mjs';
import { createTerminalLedger } from './lib/terminal-ledger.mjs';
import { verifyFinalGateResult } from './lib/final-gate.mjs';
import { renderRunReport, renderRunSummaryJson } from './lib/report-renderer.mjs';
import { validateRepositoryPath } from './lib/git-finalization-plan.mjs';
import { validateRunSummary } from './lib/run-summary-validator.mjs';

// ---------------------------------------------------------------------------
// Main entry — CLI
// ---------------------------------------------------------------------------

function main(args = process.argv.slice(2)) {
  const opts = parseArgs(args);
  let data;

  if (opts.input) {
    data = parseJsonFile(opts.input);
  } else {
    data = JSON.parse(readFileSync('/dev/stdin', 'utf8'));
  }

  const result = sealRun({ stageOutput: data, ...opts });

  if (result.output_paths) {
    process.stderr.write(`seal-run: wrote ${Object.keys(result.output_paths).length} artifact(s) to ${opts.outputDir}\n`);
  }
  process.stdout.write(JSON.stringify({
    ok: result.ok,
    run_id: result.summary?.run_id ?? null,
    gate_decision: result.final_gate?.decision ?? null,
    errors: result.errors,
  }, null, 2) + '\n');

  if (!result.ok) process.exit(1);
}

// ---------------------------------------------------------------------------
// Importable function
// ---------------------------------------------------------------------------

/**
 * @param {object} opts
 * @param {object} opts.stageOutput     — Full stage-output JSON per contract.
 * @param {string} opts.expectedContextDigest — Trusted digest captured from prepare-run.
 * @param {string} [opts.outputDir]     — Directory for artifact files.
 * @param {string} [opts.baseHead]      — Full HEAD OID for manifest.
 * @param {string} [opts.manifestMode]  — 'ordinary' | 'implementation'.
 * @param {string} [opts.timestamp]     — Override timestamp (testing).
 * @param {string} [opts.gateId]        — Override gate ID (testing).
 * @returns {{ ok, errors, run_context, terminal_ledger, final_gate, summary, report_length, manifest, output_paths }}
 */
export function sealRun({
  stageOutput,
  expectedContextDigest = null,
  outputDir = null,
  baseHead = null,
  manifestMode = 'ordinary',
  timestamp = null,
  gateId = null,
} = {}) {
  const errors = [];
  const warnings = [];

  if (!stageOutput || typeof stageOutput !== 'object') {
    return failClosed(['stage_output_missing: stageOutput must be a non-null object']);
  }

  const { run_context: inputCtx, intents, stages } = stageOutput;

  // --- 1. Validate run context binding ---
  const ctxCheck = validateContext(inputCtx, expectedContextDigest, errors);
  if (!ctxCheck) return failClosed(errors);
  const runContext = ctxCheck;

  // --- 2. Validate intents against the trusted run context ---
  const intentsCheck = validateIntents(intents, runContext, errors);
  if (!intentsCheck) return failClosed(errors);

  // --- 3. Validate stages ---
  if (!stages || typeof stages !== 'object') {
    errors.push('stages_missing: stages object is required');
    return failClosed(errors);
  }

  const issueResult = validateIssueStage(stages.issues, errors);
  const candidateResults = validateTargets(stages.targets || [], intentsCheck.preparedIntents, errors, warnings);

  // --- gate_result is the canonical executor evidence (no boolean proxies) ---
  const gateResult = stages.gate_result ?? null;
  if (!gateResult || typeof gateResult !== 'object') {
    errors.push('gate_result_missing: stages.gate_result must be the canonical output from run-final-gate');
  }

  // --- 4. Build the outcome ledger presented to the single final gate ---
  const ledgerOptions = {
    ledgerId: gateId ? `ldg_${gateId}` : undefined,
    runId: runContext.run_id,
    timestamp: timestamp || runContext.timestamp,
    issueResult,
    candidateResults,
  };
  const gateInputLedger = buildLedger({
    ...ledgerOptions,
    errors: errors.length,
    warnings: warnings.length,
  });

  // --- 5. Run final gate (exactly once) — validates canonical gate result ---
  const finalGate = verifyFinalGateResult({
    runContext,
    terminalLedger: gateInputLedger,
    candidateResults,
    issueResult,
    gateResult,
    gateId: gateId,
  });

  for (const ge of finalGate.errors) {
    if (!errors.some((e) => e.includes(ge))) errors.push(ge);
  }
  for (const gw of finalGate.warnings) {
    if (!warnings.includes(gw)) warnings.push(gw);
  }

  const ledger = buildLedger({
    ...ledgerOptions,
    errors: errors.length,
    warnings: warnings.length,
  });

  // --- 6. Render report + v3 summary from the final sealed ledger ---
  const intentsForRender = { ...intentsCheck.preparedIntents, intents: intentsCheck.preparedIntents.intents };
  const report = renderRunReport({ runContext, terminalLedger: ledger, finalGate, intents: intentsForRender });
  const summaryJson = renderRunSummaryJson({ runContext, terminalLedger: ledger, finalGate, intents: intentsForRender });

  const summaryParsed = JSON.parse(summaryJson);
  const summaryErrors = validateRunSummary(summaryParsed);
  if (summaryErrors.length > 0) {
    for (const se of summaryErrors) errors.push(`run_summary_invalid: ${se}`);
  }

  // --- 7. Write artifacts ---
  let outputPaths;
  if (outputDir) {
    try {
      outputPaths = writeArtifacts({
        directory: outputDir,
        runContext,
        terminalLedger: ledger,
        report,
        summaryJson,
        baseHead,
        manifestMode,
      });
    } catch (error) {
      errors.push(`artifact_write_failed: ${error.message}`);
    }
  }

  const ok = errors.length === 0;

  return {
    ok,
    errors,
    warnings,
    run_context: runContext,
    terminal_ledger: ledger,
    final_gate: finalGate,
    summary: summaryParsed,
    report_length: report.length,
    manifest: outputPaths?.manifest ?? null,
    output_paths: outputPaths ?? null,
  };
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function validateContext(inputCtx, expectedDigest, errors) {
  if (!inputCtx || typeof inputCtx !== 'object') {
    errors.push('run_context_missing: stage output must include run_context');
    return null;
  }
  if (!inputCtx.run_id || !inputCtx.digest) {
    errors.push('run_context_incomplete: run_id and digest are required');
    return null;
  }
  if (!/^[a-f0-9]{64}$/u.test(expectedDigest || '')) {
    errors.push('expected_context_digest_missing_or_invalid: pass the trusted digest returned by prepare-run');
    return null;
  }
  if (inputCtx.digest !== expectedDigest) {
    errors.push(`run_context_digest_mismatch: stage=${inputCtx.digest} expected=${expectedDigest}`);
    return null;
  }

  // Validate snapshot_digest and evidence_manifest_digest presence
  if (!inputCtx.snapshot_digest || !/^[a-f0-9]{64}$/u.test(inputCtx.snapshot_digest || '')) {
    errors.push('run_context_incomplete: snapshot_digest must be a valid SHA-256 hex digest');
    return null;
  }
  if (!inputCtx.evidence_manifest_digest || !/^[a-f0-9]{64}$/u.test(inputCtx.evidence_manifest_digest || '')) {
    errors.push('run_context_incomplete: evidence_manifest_digest must be a valid SHA-256 hex digest');
    return null;
  }

  const resumed = resumeRunContext(inputCtx, expectedDigest);
  if (!resumed) {
    errors.push('run_context_invalid: context fields do not match the trusted prepare-run digest or schema');
    return null;
  }
  return resumed;
}

function validateIntents(intents, runContext, errors) {
  if (!intents || !Array.isArray(intents.intents)) {
    errors.push('intents_missing_or_invalid: intents object must have an intents array');
    return null;
  }
  if (intents.intents.length > 2) {
    errors.push(`intents_too_many: max 2 intents allowed, got ${intents.intents.length}`);
    return null;
  }
  if (intents.total !== intents.intents.length) {
    errors.push('intents_total_mismatch: total must equal intents array length');
    return null;
  }
  for (const [i, intent] of intents.intents.entries()) {
    if (!intent.domain || !intent.source) {
      errors.push(`intent[${i}]_missing_fields: domain and source required`);
    }
  }

  const preparedIntents = selectTargetIntents({
    coverage: runContext.coverage,
    relations: runContext.relations,
    packLifecycle: runContext.pack_lifecycle,
    catalogCounts: runContext.catalog_counts,
    issueDemandMetadata: runContext.demand_metadata,
  });
  if (!isDeepStrictEqual(intents, preparedIntents)) {
    errors.push('intents_context_mismatch: intents must exactly match prepare-run derivation from the trusted run context');
    return null;
  }
  return { preparedIntents, valid: true };
}

function validateIssueStage(issues, errors) {
  const fallback = { ok: false, issues: [], blocked_count: 0, errors: ['issue_stage_missing'] };

  if (!issues || typeof issues !== 'object') {
    errors.push('issue_stage_missing: stages.issues is required');
    return fallback;
  }

  if (issues.all_open_issues_processed !== true) {
    errors.push('issue_stage_incomplete: all_open_issues_processed must be true');
  }

  const assessments = Array.isArray(issues.assessments) ? issues.assessments : [];
  const scan = issues.scan || {};
  const scanTotal = Number(scan.total || 0);
  if (assessments.length !== scanTotal) {
    errors.push(`issue_count_mismatch: assessments (${assessments.length}) != scan.total (${scanTotal})`);
  }

  const openSum = (scan.by_state?.open || 0)
    + (scan.by_state?.acknowledged || 0)
    + (scan.by_state?.fulfilled || 0)
    + (scan.by_state?.blocked || 0);
  if (scanTotal !== openSum) {
    errors.push(`issue_scan_state_mismatch: total ${scanTotal} != state sum ${openSum}`);
  }

  const INVALID_STATES = new Set(['missing', 'error']);
  const issueRecords = [];
  let blockedCount = 0;

  for (const [i, a] of assessments.entries()) {
    if (!Number.isInteger(a.issue_number) || a.issue_number <= 0) {
      errors.push(`issue_assessment[${i}]_invalid_issue_number: positive integer required`);
      continue;
    }
    const num = a.issue_number;
    if (!a.intake) {
      errors.push(`issue_assessment[${num}]_missing_intake`);
      continue;
    }
    if (!a.assessment) {
      errors.push(`issue_assessment[${num}]_missing_assessment`);
      continue;
    }
    if (!a.reply || typeof a.reply !== 'object') {
      errors.push(`issue_assessment[${num}]_missing_reply`);
      continue;
    }

    const status = a.reply.status || 'missing';
    if (INVALID_STATES.has(status)) {
      errors.push(`issue[${num}]_invalid_terminal: ${status}`);
    }

    const assessmentPath = normalizeRepositoryPath(a.reply.assessment_path, `issue[${num}]_assessment_path`, errors);
    const ledgerPath = normalizeRepositoryPath(a.reply.response_ledger_path, `issue[${num}]_ledger_path`, errors);

    issueRecords.push({
      number: num,
      status,
      assessmentPath,
      ledgerPath,
    });

    if (['held_for_review', 'blocked', 'reply_blocked'].includes(status)) {
      blockedCount++;
    }
  }

  return {
    ok: errors.filter((e) => e.startsWith('issue')).length === 0,
    issues: issueRecords.map((r) => ({
      number: r.number,
      status: r.status,
      assessment_path: r.assessmentPath,
      ledger_path: r.ledgerPath,
    })),
    blocked_count: blockedCount,
    errors: errors.filter((e) => e.startsWith('issue')),
  };
}

function validateTargets(targets, preparedIntents, errors, warnings) {
  const results = [];
  const seenEvalSessions = new Set();
  const seenFingerprintsPerTarget = new Map();

  if (!Array.isArray(targets)) {
    errors.push('targets_not_array: stages.targets must be an array');
    return results;
  }

  for (const [ti, target] of targets.entries()) {
    const prefix = `target[${ti}]`;
    if (!target.intent) {
      errors.push(`${prefix}_missing_intent`);
      continue;
    }

    // The immutable intent must be passed through byte-for-byte in meaning.
    // Execution-time seed resolution belongs in a separate evidence bundle, not
    // in mutations to the prepared intent.
    const matched = preparedIntents.intents.some((prepared) => isDeepStrictEqual(prepared, target.intent));
    if (!matched) {
      errors.push(`${prefix}_unprepared_intent: target intent does not exactly match any prepare-run intent`);
    }

    // Validate repairs
    const repairs = Array.isArray(target.repairs) ? target.repairs : [];
    let preflightRepairs = 0;
    let postEvalRepairs = 0;
    const fingerprintsForTarget = new Set();

    for (const [ri, repair] of repairs.entries()) {
      if (repair.kind === 'preflight') {
        preflightRepairs++;
      } else if (repair.kind === 'post_evaluation') {
        postEvalRepairs++;
      } else {
        errors.push(`${prefix}_repair[${ri}]_invalid_kind: ${repair.kind}`);
      }

      if (!repair.session_id || typeof repair.session_id !== 'string') {
        errors.push(`${prefix}_repair[${ri}]_missing_session_id`);
      }
      if (!Number.isInteger(repair.attempt) || repair.attempt < 2) {
        errors.push(`${prefix}_repair[${ri}]_invalid_attempt: integer >= 2 required`);
      }
      if (!repair.fingerprint || typeof repair.fingerprint !== 'string') {
        errors.push(`${prefix}_repair[${ri}]_missing_fingerprint`);
      } else {
        if (fingerprintsForTarget.has(repair.fingerprint)) {
          errors.push(`${prefix}_repair[${ri}]_duplicate_fingerprint: ${repair.fingerprint}`);
        }
        fingerprintsForTarget.add(repair.fingerprint);
      }
    }

    if (preflightRepairs > 1) {
      errors.push(`${prefix}_too_many_preflight_repairs: ${preflightRepairs}, max 1`);
    }
    if (postEvalRepairs > 1) {
      errors.push(`${prefix}_too_many_post_evaluation_repairs: ${postEvalRepairs}, max 1`);
    }

    // Validate synthesis
    const syn = target.synthesis;
    if (!syn) {
      errors.push(`${prefix}_missing_synthesis`);
      continue;
    }
    if (!syn.session_id) {
      errors.push(`${prefix}_synthesis_missing_session_id`);
    }

    const isNoPack = syn.ok !== true || !syn.candidate;

    if (isNoPack) {
      results.push({
        pack_id: null,
        synthesis_session_id: syn.session_id ?? null,
        evaluation_session_id: null,
        preflight: null,
        evaluation: null,
        promotion: null,
        terminal: 'no_pack_clean',
        proof_digest: null,
        paths: [],
      });
      continue;
    }

    const candidate = syn.candidate;
    const packId = candidate.pack_id;
    if (!packId) {
      errors.push(`${prefix}_candidate_missing_pack_id`);
      continue;
    }

    // Validate preflight
    const pf = target.preflight;
    if (!pf || pf.ok !== true) {
      errors.push(`${prefix}_preflight_failed_or_missing`);
    }

    // Validate evaluation
    const evl = target.evaluation;
    const prom = target.promotion;

    if (!evl || !evl.session_id) {
      if (prom && prom.ok === true) {
        errors.push(`${prefix}_promotion_without_evaluation`);
      }
      results.push({
        pack_id: packId,
        synthesis_session_id: syn.session_id,
        evaluation_session_id: evl?.session_id ?? null,
        preflight: pf ?? null,
        evaluation: null,
        promotion: prom ?? null,
        terminal: 'rejected',
        proof_digest: candidate.proof_digest ?? null,
        paths: collectPaths(candidate, evl, prom, prefix, errors),
      });
      continue;
    }

    // Session isolation
    if (syn.session_id === evl.session_id) {
      errors.push(`${prefix}_same_session_synthesis_evaluation: ${syn.session_id}`);
    }
    if (seenEvalSessions.has(evl.session_id)) {
      errors.push(`${prefix}_reused_evaluation_session: ${evl.session_id}`);
    }
    seenEvalSessions.add(evl.session_id);

    // Proof digest binding
    const proofDigest = candidate.proof_digest;
    if (evl.evaluation && evl.evaluation.proof_digest !== proofDigest) {
      errors.push(`${prefix}_proof_digest_mismatch: eval=${evl.evaluation.proof_digest} vs candidate=${proofDigest}`);
    }
    if (pf && pf.proof_digest && pf.proof_digest !== proofDigest) {
      errors.push(`${prefix}_preflight_proof_digest_mismatch: pf=${pf.proof_digest} vs candidate=${proofDigest}`);
    }

    // Evaluation decision
    const decision = evl.evaluation?.decision;
    if (!decision || !decision.level) {
      errors.push(`${prefix}_evaluation_missing_decision`);
      terminalizeRejected(results, packId, syn, evl, pf, prom, candidate);
      continue;
    }

    if (evl.evaluation.pack_id !== packId) {
      errors.push(`${prefix}_evaluation_pack_id_mismatch: eval=${evl.evaluation.pack_id} vs candidate=${packId}`);
    }

    const level = decision.level;
    if (level === 'passed') {
      if (!pf || pf.ok !== true) {
        errors.push(`${prefix}_passed_without_verified_preflight`);
      }
      if (!prom || prom.ok !== true) {
        errors.push(`${prefix}_passed_not_promoted`);
      }
      results.push({
        pack_id: packId,
        synthesis_session_id: syn.session_id,
        evaluation_session_id: evl.session_id,
        preflight: pf ?? null,
        evaluation: evl.evaluation ? {
          ...evl.evaluation,
          synthesis_session_id: syn.session_id,
          evaluation_session_id: evl.session_id,
        } : null,
        promotion: prom ?? null,
        terminal: prom?.ok === true ? 'promoted' : 'rejected',
        proof_digest: proofDigest ?? null,
        paths: collectPaths(candidate, evl, prom, prefix, errors),
      });
    } else if (level === 'needs_work') {
      if (postEvalRepairs >= 1) {
        // Already had the one post-eval repair and still needs_work
        if (!pf || pf.ok !== true) {
          errors.push(`${prefix}_needs_work_post_repair_preflight_failed`);
        }
        terminalizeRejected(results, packId, syn, evl, pf, prom, candidate, prefix, errors);
      } else {
        // No post-eval repair recorded but needs_work — this means the agent hasn't done the repair
        // In seal phase, this is a blocker
        errors.push(`${prefix}_needs_work_but_no_post_eval_repair_recorded`);
        terminalizeRejected(results, packId, syn, evl, pf, prom, candidate, prefix, errors);
      }
    } else if (level === 'rejected') {
      terminalizeRejected(results, packId, syn, evl, pf, prom, candidate);
    }
  }

  return results;
}

function terminalizeRejected(results, packId, syn, evl, pf, prom, candidate, prefix, errors) {
  results.push({
    pack_id: packId,
    synthesis_session_id: syn?.session_id ?? null,
    evaluation_session_id: evl?.session_id ?? null,
    preflight: pf ?? null,
    evaluation: evl?.evaluation ? {
      ...evl.evaluation,
      synthesis_session_id: syn?.session_id ?? null,
      evaluation_session_id: evl?.session_id ?? null,
    } : null,
    promotion: prom ?? null,
    terminal: 'rejected',
    proof_digest: candidate?.proof_digest ?? null,
    paths: collectPaths(candidate, evl, prom, prefix, errors),
  });
}

function collectPaths(candidate, evl, prom, prefix, errors) {
  const fields = [
    ['candidate.pack_path', candidate?.pack_path],
    ['candidate.proof_path', candidate?.proof_path],
    ['evaluation.evaluation_path', evl?.evaluation_path],
    ['promotion.published_path', prom?.published_path],
  ];
  return fields
    .map(([field, path]) => normalizeRepositoryPath(path, `${prefix}_${field}`, errors, { optional: true }))
    .filter(Boolean);
}

function normalizeRepositoryPath(path, label, errors, { optional = false } = {}) {
  if (path === null || path === undefined || path === '') {
    if (!optional) errors.push(`${label}_missing`);
    return null;
  }
  const pathError = validateRepositoryPath(path, label);
  if (pathError) {
    errors.push(`${label}_invalid: ${pathError}`);
    return null;
  }
  return path;
}

// ---------------------------------------------------------------------------
// Ledger construction
// ---------------------------------------------------------------------------

function buildLedger({ ledgerId, runId, timestamp, issueResult, candidateResults, errors, warnings }) {
  const issueOutcomes = (issueResult?.issues || []).map((iss) => ({
    entity_id: `issue_${iss.number}`,
    state: normalizeIssueState(iss.status),
    detail: `Issue #${iss.number}: ${iss.status}`,
    paths: [iss.assessment_path, iss.ledger_path].filter(Boolean).map(repoPath),
  }));

  const packOutcomes = [];
  if (candidateResults.length === 0) {
    packOutcomes.push({
      entity_id: 'pack_selection',
      state: 'no_pack_clean',
      detail: 'No eligible Pack intent was selected from the immutable run context.',
    });
  } else {
    for (const c of candidateResults) {
      const state = c.terminal === 'promoted' ? 'promoted'
        : c.terminal === 'rejected' ? 'rejected'
        : 'no_pack_clean';
      packOutcomes.push({
        entity_id: c.pack_id ?? 'unknown_pack',
        state,
        detail: state === 'promoted'
          ? 'Candidate passed independent evaluation and was promoted.'
          : state === 'rejected'
          ? 'Candidate rejected via final gate verification.'
          : 'Candidate selection produced no pack.',
        paths: c.paths || [],
      });
    }
  }

  const runStatus = determineRunStatus(errors, warnings, packOutcomes, issueOutcomes);

  return createTerminalLedger({
    ledgerId,
    runId,
    timestamp,
    sourceOutcomes: [],
    skillOutcomes: [],
    relationOutcomes: [],
    packOutcomes,
    issueOutcomes,
    runStatus,
    totalActions: issueOutcomes.length + packOutcomes.length,
    errors,
    warnings,
  });
}

function normalizeIssueState(status) {
  switch (status) {
    case 'posted': return 'posted';
    case 'dry_run': return 'dry_run';
    case 'draft': return 'draft';
    case 'duplicate': return 'duplicate';
    case 'held_for_review': return 'held_for_review';
    case 'no_action': return 'no_action';
    case 'blocked': return 'blocked';
    case 'reply_blocked': return 'reply_blocked';
    default: return 'reply_blocked';
  }
}

function determineRunStatus(errors, warnings, packOutcomes, issueOutcomes) {
  if (errors > 0) {
    const hasIssueBlock = issueOutcomes.some((i) => i.state === 'reply_blocked');
    return hasIssueBlock ? 'reply_blocked' : 'failed';
  }
  const allNoPack = packOutcomes.every((p) => p.state === 'no_pack_clean');
  if (allNoPack && packOutcomes.length > 0) return 'no_pack_clean';
  if (warnings > 0) return 'partial';
  return 'success';
}

// ---------------------------------------------------------------------------
// Artifact writing
// ---------------------------------------------------------------------------

function writeArtifacts({ directory, runContext, terminalLedger, report, summaryJson, baseHead, manifestMode }) {
  const resolvedDirectory = resolve(directory);
  const repositoryRelativeDirectory = relative(ROOT, resolvedDirectory).replaceAll('\\', '/');
  const insideRepository = repositoryRelativeDirectory !== '..'
    && !repositoryRelativeDirectory.startsWith('../')
    && !isAbsolute(repositoryRelativeDirectory);
  if (baseHead && !insideRepository) {
    throw new Error('Manifested seal output directory must be inside the repository');
  }

  if (!insideRepository) mkdirSync(resolvedDirectory, { recursive: true });
  const writeBase = insideRepository ? ROOT : resolvedDirectory;

  const contextPath = join(resolvedDirectory, 'run-context.json');
  const ledgerPath = join(resolvedDirectory, 'terminal-ledger.json');
  const reportPath = join(resolvedDirectory, 'run-report.md');
  const summaryPath = join(resolvedDirectory, 'run-summary.json');

  const contextJson = JSON.stringify(serializeRunContext(runContext), null, 2) + '\n';
  const ledgerJson = JSON.stringify(serializableLedger(terminalLedger), null, 2) + '\n';

  writeTextAtomic(contextPath, contextJson, writeBase);
  writeTextAtomic(ledgerPath, ledgerJson, writeBase);
  writeTextAtomic(reportPath, report, writeBase);
  writeTextAtomic(summaryPath, summaryJson, writeBase);

  let manifest = null;
  let manifestPath = null;

  if (baseHead) {
    if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u.test(baseHead)) {
      throw new Error('baseHead must be a full lowercase 40- or 64-character object ID');
    }
    manifestPath = join(directory, 'touched-paths.json');

    const pathSet = new Set([
      repoPath(reportPath),
      repoPath(summaryPath),
      repoPath(contextPath),
      repoPath(ledgerPath),
      repoPath(manifestPath),
      ...collectLedgerPaths(terminalLedger),
      ...(manifestMode === 'implementation' ? readGitChangedPaths() : []),
    ]);

    manifest = {
      schema_version: 1,
      run_id: runContext.run_id,
      mode: manifestMode,
      base_head: baseHead,
      summary_digest: createHash('sha256').update(summaryJson).digest('hex'),
      ledger_digest: terminalLedger.digest,
      paths: [...pathSet].sort(),
    };

    writeTextAtomic(manifestPath, JSON.stringify(manifest, null, 2) + '\n', writeBase);
  }

  return {
    directory,
    report_path: reportPath,
    summary_path: summaryPath,
    context_path: contextPath,
    ledger_path: ledgerPath,
    manifest_path: manifestPath,
    manifest,
  };
}

function collectLedgerPaths(ledger) {
  return [
    ...(ledger.source_outcomes || []),
    ...(ledger.skill_outcomes || []),
    ...(ledger.relation_outcomes || []),
    ...(ledger.pack_outcomes || []),
    ...(ledger.issue_outcomes || []),
  ].flatMap((entry) => entry.paths || []);
}

function readGitChangedPaths() {
  const proc = spawnSync('git', [
    '-c', 'core.fsmonitor=false',
    '-c', 'core.hooksPath=/dev/null',
    '-c', 'gc.auto=0',
    '-c', 'maintenance.auto=false',
    'status',
    '--porcelain=v1',
    '-z',
    '--no-renames',
    '--untracked-files=all',
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  if (proc.status !== 0) {
    throw new Error(`git status failed while building implementation manifest: ${(proc.stderr || proc.stdout).trim()}`);
  }
  return parseGitChangedPaths(proc.stdout);
}

export function parseGitChangedPaths(output) {
  const paths = [];
  for (const record of output.split('\0').filter(Boolean)) {
    if (record.startsWith('!! ')) continue;
    if (record.length < 4 || record[2] !== ' ') {
      throw new Error(`could not parse git status record for implementation manifest: ${JSON.stringify(record)}`);
    }
    paths.push(record.slice(3));
  }
  return [...new Set(paths)].sort();
}

function serializableLedger(ledger) {
  const { digest, _sealed, ...record } = ledger;
  return { ...record, digest };
}

function repoPath(p) {
  if (!p) return p;
  if (!isAbsolute(p)) return p.replaceAll('\\', '/');
  const rel = relative(ROOT, p).replaceAll('\\', '/');
  return rel.startsWith('../') ? p.replaceAll('\\', '/') : rel;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--input':
        opts.input = argv[++i];
        break;
      case '--expected-context-digest':
        opts.expectedContextDigest = argv[++i];
        break;
      case '--output-dir':
        opts.outputDir = argv[++i];
        break;
      case '--base-head':
        opts.baseHead = argv[++i];
        break;
      case '--manifest-mode':
        opts.manifestMode = argv[++i];
        break;
      case '--timestamp':
        opts.timestamp = argv[++i];
        break;
      case '--gate-id':
        opts.gateId = argv[++i];
        break;
      default:
        break;
    }
  }
  return opts;
}

function parseJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function failClosed(errors) {
  return {
    ok: false,
    errors,
    warnings: [],
    run_context: null,
    terminal_ledger: null,
    final_gate: null,
    summary: null,
    report_length: 0,
    manifest: null,
    output_paths: null,
  };
}

// ---------------------------------------------------------------------------
// CLI guard
// ---------------------------------------------------------------------------

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/seal-run.mjs');
if (isMain) {
  main();
}
