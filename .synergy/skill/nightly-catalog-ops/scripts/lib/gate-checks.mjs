import { createHash } from 'node:crypto'

import { canonicalStringify } from './phase-state-machine.mjs'

export const TRUSTED_CHECKS = Object.freeze([
  Object.freeze({ name: 'catalog_validate', script: 'catalog:validate' }),
  Object.freeze({ name: 'catalog_status', script: 'catalog:status' }),
  Object.freeze({ name: 'catalog_reset_test', script: 'catalog:reset:test' }),
  Object.freeze({ name: 'skill_extraction_test', script: 'skill:extraction:test' }),
  Object.freeze({ name: 'skill_normalization_bootstrap_test', script: 'skill:normalization:bootstrap:test' }),
  Object.freeze({ name: 'analysis_binding_test', script: 'analysis:binding:test' }),
  Object.freeze({ name: 'relations_v2_test', script: 'relations:v2:test' }),
  Object.freeze({ name: 'pack_schema_test', script: 'pack:schema:test' }),
  Object.freeze({ name: 'pack_core_test', script: 'pack:core:test' }),
  Object.freeze({ name: 'pack_preflight_test', script: 'pack:preflight:test' }),
  Object.freeze({ name: 'pack_proof_test', script: 'pack:proof:test' }),
  Object.freeze({ name: 'pack_promotion_test', script: 'pack:promotion:test' }),
  Object.freeze({ name: 'pack_destination_test', script: 'pack:destination:test' }),
  Object.freeze({ name: 'evaluation_binding_test', script: 'evaluation:binding:test' }),
  Object.freeze({ name: 'path_safety_test', script: 'path:safety:test' }),
  Object.freeze({ name: 'issue_intake_test', script: 'issue:intake:test' }),
  Object.freeze({ name: 'issue_response_ledger_test', script: 'issue:response-ledger:test' }),
  Object.freeze({ name: 'issue_pipeline_test', script: 'issue:pipeline:test' }),
  Object.freeze({ name: 'issue_stage_test', script: 'issue:stage:test' }),
  Object.freeze({ name: 'source_http_classifier_test', script: 'source:http-classifier:test' }),
  Object.freeze({ name: 'publish_check', script: 'publish:check' }),
  Object.freeze({ name: 'publish_links', script: 'publish:links' }),
  Object.freeze({ name: 'publish_boundary', script: 'publish:boundary' }),
  Object.freeze({ name: 'publish_summaries', script: 'publish:summaries' }),
  Object.freeze({ name: 'publish_pack_v3_test', script: 'publish:pack-v3:test' }),
  Object.freeze({ name: 'nightly_foundation_test', script: 'nightly:foundation:test' }),
  Object.freeze({ name: 'nightly_controller_test', script: 'nightly:controller:test' }),
  Object.freeze({ name: 'nightly_legacy_absence_test', script: 'nightly:legacy-absence:test' }),
  Object.freeze({ name: 'catalog_impact', script: 'catalog:impact' }),
])

export function computeGateResultDigest(gateResult) {
  const payload = {
    gate_id: gateResult.gate_id,
    run_id: gateResult.run_id,
    pre_gate_event_digest: gateResult.pre_gate_event_digest,
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
    evidence_logs: (gateResult.evidence_logs ?? []).map((log) => ({
      check_name: log.check_name,
      stdout_digest: log.stdout_digest,
      stderr_digest: log.stderr_digest,
      stdout_path: log.stdout_path,
      stderr_path: log.stderr_path,
    })),
  }

  return createHash('sha256').update(canonicalStringify(payload)).digest('hex')
}

export function validateGateResultAgainstTrusted(gateResult) {
  const errors = []

  if (!gateResult || typeof gateResult !== 'object') {
    return { ok: false, errors: ['gate_result: expected object'] }
  }

  if (gateResult.invoked_count !== 1) {
    errors.push('gate_result.invoked_count: must equal 1')
  }

  if (!/^sha256:[a-f0-9]{64}$/u.test(gateResult.result_digest ?? '')) {
    errors.push('gate_result.result_digest: missing or invalid SHA-256 digest')
  }

  if (!Array.isArray(gateResult.checks)) {
    errors.push('gate_result.checks: expected array')
  } else {
    if (gateResult.checks.length !== TRUSTED_CHECKS.length) {
      errors.push(`gate_result.checks: expected ${TRUSTED_CHECKS.length}, got ${gateResult.checks.length}`)
    }

    TRUSTED_CHECKS.forEach((expected, index) => {
      const actual = gateResult.checks[index]
      if (!actual) {
        errors.push(`gate_result.checks[${index}]: missing ${expected.name}`)
        return
      }
      if (actual.name !== expected.name) {
        errors.push(`gate_result.checks[${index}].name: expected ${expected.name}, got ${actual.name}`)
      }
      if (actual.script !== expected.script) {
        errors.push(`gate_result.checks[${index}].script: expected ${expected.script}, got ${actual.script}`)
      }
    })
  }

  if (!Array.isArray(gateResult.evidence_logs)) {
    errors.push('gate_result.evidence_logs: expected array')
  } else if (gateResult.evidence_logs.length !== TRUSTED_CHECKS.length) {
    errors.push(`gate_result.evidence_logs: expected ${TRUSTED_CHECKS.length}, got ${gateResult.evidence_logs.length}`)
  }

  if (gateResult.passed === true) {
    const failed = (gateResult.checks ?? []).filter((check) => check.passed !== true)
    if (failed.length > 0) {
      errors.push(`gate_result.passed: true but ${failed.length} check(s) did not pass`)
    }
  }

  const expectedDigest = `sha256:${computeGateResultDigest(gateResult)}`
  if (gateResult.result_digest && gateResult.result_digest !== expectedDigest) {
    errors.push('gate_result.result_digest: content mismatch')
  }

  return { ok: errors.length === 0, errors }
}
