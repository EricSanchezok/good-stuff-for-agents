import { createHash } from 'node:crypto';

export const TRUSTED_CHECKS = Object.freeze([
  { name: 'catalog-strict-validation', script: 'catalog:validate' },
  { name: 'catalog-indexes', script: 'catalog:index' },
  { name: 'public-render', script: 'publish:render' },
  { name: 'public-drift', script: 'publish:check' },
  { name: 'public-links', script: 'publish:links' },
  { name: 'public-boundary', script: 'publish:boundary' },
  { name: 'public-summaries', script: 'publish:summaries' },
  { name: 'extraction-test', script: 'skill:extraction:test' },
  { name: 'normalization-bootstrap-test', script: 'skill:normalization:bootstrap:test' },
  { name: 'analysis-binding-test', script: 'analysis:binding:test' },
  { name: 'relation-v2-test', script: 'relations:v2:test' },
  { name: 'pack-schema-test', script: 'pack:schema:test' },
  { name: 'pack-core-test', script: 'pack:core:test' },
  { name: 'pack-preflight-test', script: 'pack:preflight:test' },
  { name: 'pack-proof-test', script: 'pack:proof:test' },
  { name: 'pack-promotion-test', script: 'pack:promotion:test' },
  { name: 'pack-destination-test', script: 'pack:destination:test' },
  { name: 'evaluation-binding-test', script: 'evaluation:binding:test' },
  { name: 'path-safety-test', script: 'path:safety:test' },
  { name: 'issue-intake-test', script: 'issue:intake:test' },
  { name: 'issue-pipeline-test', script: 'issue:pipeline:test' },
  { name: 'issue-stage-test', script: 'issue:stage:test' },
  { name: 'nightly-context-test', script: 'nightly:context:test' },
  { name: 'nightly-final-gate-test', script: 'nightly:final-gate:test' },
  { name: 'nightly-seal-test', script: 'nightly:seal:test' },
  { name: 'nightly-validator-test', script: 'nightly:validator:test' },
  { name: 'nightly-git-test', script: 'nightly:git:test' },
  { name: 'catalog-reset-test', script: 'catalog:reset:test' },
  { name: 'pack-publishing-test', script: 'publish:pack-v3:test' },
]);

export const REQUIRED_CHECK_NAMES = Object.freeze(new Set(TRUSTED_CHECKS.map((check) => check.name)));
export const STRUCTURAL_CHECK_NAMES = Object.freeze(new Set(TRUSTED_CHECKS.slice(0, 7).map((check) => check.name)));

export function computeGateResultDigest(gateResult) {
  const payload = {
    gate_id: gateResult.gate_id,
    run_id: gateResult.run_id,
    context_digest: gateResult.context_digest,
    passed: gateResult.passed,
    invoked_count: gateResult.invoked_count,
    started_at: gateResult.started_at,
    finished_at: gateResult.finished_at,
    checks: (gateResult.checks ?? []).map((check) => ({
      name: check.name,
      script: check.script,
      passed: check.passed,
      exit_code: check.exit_code,
      duration_ms: check.duration_ms,
    })),
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function validateGateResultAgainstTrusted(gateResult, { requireRunId, requireContextDigest } = {}) {
  const errors = [];

  if (!gateResult || typeof gateResult !== 'object' || Array.isArray(gateResult)) {
    return ['gate_result_missing: gate_result must be a non-null object'];
  }

  if (!/^gate_[a-f0-9]{16}$/u.test(gateResult.gate_id ?? '')) {
    errors.push('gate_result_gate_id: must be a deterministic gate identifier');
  }
  if (!/^run_[a-z0-9_-]+$/u.test(gateResult.run_id ?? '')) {
    errors.push('gate_result_run_id: must be a lowercase run ID');
  }
  if (!/^[a-f0-9]{64}$/u.test(gateResult.context_digest ?? '')) {
    errors.push('gate_result_context_digest: must be a lowercase SHA-256 digest');
  }
  if (gateResult.invoked_count !== 1 || gateResult._single_invocation !== true) {
    errors.push('gate_result_invocation: invoked_count must be 1 and _single_invocation must be true');
  }
  if (gateResult.passed !== true) {
    errors.push('gate_result_passed: canonical final gate must pass');
  }
  if (!isTimestamp(gateResult.started_at) || !isTimestamp(gateResult.finished_at)) {
    errors.push('gate_result_timestamps: started_at and finished_at must be ISO timestamps');
  } else if (gateResult.finished_at < gateResult.started_at) {
    errors.push('gate_result_timestamps: finished_at must not precede started_at');
  }
  if (!/^[a-f0-9]{64}$/u.test(gateResult.digest ?? '')) {
    errors.push('gate_result_digest: missing or invalid SHA-256 digest');
  }

  if (!Array.isArray(gateResult.checks)) {
    errors.push('gate_result_checks: must be an array');
  } else {
    if (gateResult.checks.length !== TRUSTED_CHECKS.length) {
      errors.push(`gate_result_check_count: expected ${TRUSTED_CHECKS.length}, got ${gateResult.checks.length}`);
    }

    const seen = new Set();
    const count = Math.max(gateResult.checks.length, TRUSTED_CHECKS.length);
    for (let index = 0; index < count; index += 1) {
      const actual = gateResult.checks[index];
      const expected = TRUSTED_CHECKS[index];
      if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
        errors.push(`gate_result_check[${index}]: missing or invalid check entry`);
        continue;
      }
      if (seen.has(actual.name)) errors.push(`gate_result_check[${index}]: duplicate check name ${actual.name}`);
      seen.add(actual.name);
      if (!expected) {
        errors.push(`gate_result_check[${index}]: unexpected check ${actual.name}`);
        continue;
      }
      if (actual.name !== expected.name) {
        errors.push(`gate_result_check[${index}]: expected name ${expected.name}, got ${actual.name}`);
      }
      if (actual.script !== expected.script) {
        errors.push(`gate_result_check[${index}]: expected script ${expected.script}, got ${actual.script}`);
      }
      if (actual.passed !== true || actual.exit_code !== 0) {
        errors.push(`gate_result_check[${index}]: ${expected.name} did not pass with exit code 0`);
      }
      if (!Number.isInteger(actual.duration_ms) || actual.duration_ms < 0) {
        errors.push(`gate_result_check[${index}]: duration_ms must be a non-negative integer`);
      }
    }
  }

  if (gateResult.digest && gateResult.digest !== computeGateResultDigest(gateResult)) {
    errors.push('gate_result_digest_mismatch: digest does not match canonical payload');
  }
  if (requireRunId && gateResult.run_id !== requireRunId) {
    errors.push(`gate_result_run_id_mismatch: expected ${requireRunId}, got ${gateResult.run_id}`);
  }
  if (requireContextDigest && gateResult.context_digest !== requireContextDigest) {
    errors.push('gate_result_context_digest_mismatch');
  }

  return errors;
}

function isTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
