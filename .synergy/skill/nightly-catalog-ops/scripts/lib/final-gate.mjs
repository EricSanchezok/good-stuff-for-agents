/**
 * Single final gate — invoked exactly once per run.
 *
 * The gate never recalculates evaluation metrics. It verifies that every
 * candidate terminal is consistently bound to its synthesis/evaluation
 * sessions, preflight proof, owner decision, and promotion result; then it
 * verifies the canonical gate result produced by run-final-gate (strict
 * validation, indexes, public render, drift, links, boundary, summaries,
 * and focused tests), Issue integrity, and ledger integrity.
 *
 * The canonical gate result must be produced by the trusted executor
 * (run-final-gate.mjs) — boolean-only catalog/publication fields are rejected.
 */
import { validateGateResultAgainstTrusted } from './gate-checks.mjs';

export function verifyFinalGateResult({
  runContext,
  terminalLedger,
  candidateResults = [],
  issueResult,
  gateResult,
  gateId,
} = {}) {
  const errors = [];
  const warnings = [];
  const checks = [];
  const resolvedGateId = gateId || `gate_${Date.now()}`;

  const sessionCheck = checkSessionIsolation(candidateResults, resolvedGateId);
  recordCheck(checks, errors, 'same-session-verification', sessionCheck);

  const candidateCheck = checkCandidateBindings(candidateResults);
  recordCheck(checks, errors, 'candidate-terminal-bindings', candidateCheck);

  // --- Validate canonical gate result ---
  if (!gateResult || typeof gateResult !== 'object') {
    errors.push('gate_result_missing: canonical gate result from run-final-gate is required');
  } else {
    const gateErrors = validateGateResultAgainstTrusted(gateResult, {
      requireRunId: runContext?.run_id,
      requireContextDigest: runContext?.digest,
    });
    if (gateErrors.length > 0) {
      for (const ge of gateErrors) errors.push(ge);
    }

    // Mirror gate check entries into the final gate view
    if (Array.isArray(gateResult.checks)) {
      for (const c of gateResult.checks) {
        checks.push({
          name: `gate:${c.name}`,
          passed: c.passed,
          details: c.exit_code === 0
            ? `${c.script} passed in ${c.duration_ms}ms`
            : `${c.script} failed exit=${c.exit_code}`,
        });
        if (!c.passed && !errors.some((e) => e.includes(c.name))) {
          errors.push(`gate_check_failed: ${c.name} (${c.script}) exit=${c.exit_code}`);
        }
      }
    }
  }

  // --- Issue stage ---
  const issueCheck = checkIssueStates(issueResult);
  checks.push({ name: 'issue-states', passed: issueCheck.passed, details: issueCheck.reason });
  if (!issueCheck.passed) warnings.push(`issue_states_warning: ${issueCheck.reason}`);

  // --- Ledger integrity ---
  const ledgerCheck = checkLedgerIntegrity(terminalLedger, runContext);
  recordCheck(checks, errors, 'ledger-integrity', ledgerCheck);

  const passed = errors.length === 0;
  return Object.freeze({
    gate_id: resolvedGateId,
    decision: passed ? 'pass' : 'fail',
    passed,
    errors,
    warnings,
    checks,
    invoked_at: new Date().toISOString(),
    invoked_count: 1,
    _single_invocation: true,
  });
}

function checkSessionIsolation(candidateResults, gateId) {
  const errors = [];
  const seenEvaluationSessions = new Set();
  for (const [index, candidate] of candidateResults.entries()) {
    const synthesisSessionId = candidate?.synthesis_session_id;
    const evaluationSessionId = candidate?.evaluation_session_id;
    if (!evaluationSessionId) continue;
    if (!synthesisSessionId) errors.push(`candidate[${index}] evaluation lacks synthesis_session_id`);
    if (synthesisSessionId === evaluationSessionId) {
      errors.push(`candidate[${index}] synthesis and evaluation share session ${evaluationSessionId}`);
    }
    if (synthesisSessionId === gateId || evaluationSessionId === gateId) {
      errors.push(`candidate[${index}] shares session with final gate`);
    }
    if (seenEvaluationSessions.has(evaluationSessionId)) {
      errors.push(`evaluation session ${evaluationSessionId} was reused across candidates`);
    }
    seenEvaluationSessions.add(evaluationSessionId);
  }
  return errors.length === 0
    ? { passed: true, reason: 'Every evaluated candidate uses a distinct synthesis, evaluation, and final-gate session.' }
    : { passed: false, reason: errors.join('; ') };
}

function checkCandidateBindings(candidateResults) {
  if (!Array.isArray(candidateResults)) return { passed: false, reason: 'candidateResults must be an array' };
  const errors = [];
  for (const [index, candidate] of candidateResults.entries()) {
    const terminal = candidate?.terminal;
    const evaluation = candidate?.evaluation;
    const preflightOk = candidate?.preflight?.ok === true;
    const promotionOk = candidate?.promotion?.ok === true;

    if (!['promoted', 'rejected', 'no_pack_clean'].includes(terminal)) {
      errors.push(`candidate[${index}] has invalid terminal ${String(terminal)}`);
      continue;
    }

    if (terminal === 'no_pack_clean') {
      if (evaluation || promotionOk) errors.push(`candidate[${index}] no_pack_clean cannot carry evaluation or promotion`);
      continue;
    }

    if (!evaluation) {
      if (terminal === 'promoted') errors.push(`candidate[${index}] promoted without evaluation`);
      if (terminal === 'rejected' && preflightOk) {
        errors.push(`candidate[${index}] rejected after passing preflight but lacks canonical evaluation`);
      }
      continue;
    }

    const decision = evaluation.decision;
    const level = decision?.level;
    if (!decision || typeof decision.passed !== 'boolean' || !['passed', 'needs_work', 'rejected'].includes(level)) {
      errors.push(`candidate[${index}] has invalid owner decision`);
      continue;
    }
    if (evaluation.pack_id !== candidate.pack_id) {
      errors.push(`candidate[${index}] evaluation.pack_id does not match synthesized pack_id`);
    }
    if (evaluation.synthesis_session_id !== candidate.synthesis_session_id || evaluation.evaluation_session_id !== candidate.evaluation_session_id) {
      errors.push(`candidate[${index}] evaluation session bindings do not match executed sessions`);
    }
    if (!candidate.proof_digest || evaluation.proof_digest !== candidate.proof_digest) {
      errors.push(`candidate[${index}] evaluation proof_digest does not match synthesis proof`);
    }
    if (candidate.preflight?.proof_digest && candidate.preflight.proof_digest !== candidate.proof_digest) {
      errors.push(`candidate[${index}] preflight proof_digest does not match synthesis proof`);
    }
    if (promotionOk && candidate.promotion?.pack_id !== candidate.pack_id) {
      errors.push(`candidate[${index}] promotion.pack_id does not match evaluated pack_id`);
    }
    if ((level === 'passed') !== decision.passed) {
      errors.push(`candidate[${index}] decision.passed contradicts decision.level`);
    }
    if (level === 'passed' && Array.isArray(evaluation.blockers) && evaluation.blockers.length > 0) {
      errors.push(`candidate[${index}] passed with structural blockers`);
    }
    if (level === 'passed' && (!preflightOk || !promotionOk || terminal !== 'promoted')) {
      errors.push(`candidate[${index}] passed evaluation without verified preflight and promotion`);
    }
    if (level !== 'passed' && terminal !== 'rejected') {
      errors.push(`candidate[${index}] ${level} evaluation must terminate rejected after bounded repair`);
    }
    if (level !== 'passed' && promotionOk) {
      errors.push(`candidate[${index}] non-passing evaluation was promoted`);
    }
  }

  return errors.length === 0
    ? { passed: true, reason: candidateResults.length === 0 ? 'No pack candidates were produced; clean zero-pack terminal verified.' : 'All candidate terminals match owner decisions, proof checks, and promotion outcomes.' }
    : { passed: false, reason: errors.join('; ') };
}

function checkIssueStates(issueResult) {
  if (!issueResult) return { passed: false, reason: 'Issue scan/assessment result missing' };
  if (Array.isArray(issueResult.errors) && issueResult.errors.length > 0) {
    return { passed: false, reason: `Issue stage errors: ${issueResult.errors.join('; ')}` };
  }
  if (issueResult.ok !== true) return { passed: false, reason: 'Issue stage did not complete successfully' };
  const blocked = Number(issueResult.blocked_count || 0);
  return blocked > 0
    ? { passed: true, reason: `${blocked} Issue(s) are held or blocked with canonical terminal records` }
    : { passed: true, reason: 'Issue states verified' };
}

function checkLedgerIntegrity(ledger, runContext) {
  if (!ledger || !runContext) return { passed: false, reason: 'Ledger or run context missing' };
  if (ledger.run_id !== runContext.run_id) {
    return { passed: false, reason: `Ledger run_id "${ledger.run_id}" does not match context run_id "${runContext.run_id}"` };
  }
  if (ledger._sealed !== true || typeof ledger.digest !== 'string' || ledger.digest.length !== 64) {
    return { passed: false, reason: 'Terminal ledger is not sealed with a content digest' };
  }
  return { passed: true, reason: 'Terminal ledger is sealed and bound to the run context' };
}

function recordCheck(checks, errors, name, result) {
  checks.push({ name, passed: result.passed, details: result.reason });
  if (!result.passed) errors.push(`${name}: ${result.reason}`);
}
