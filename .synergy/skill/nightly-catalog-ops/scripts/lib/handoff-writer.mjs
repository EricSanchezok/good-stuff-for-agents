/**
 * Deterministic issue-drafts writer and evidence-index builder.
 *
 * Write-once, coverage-binding, schema-valid writer for semantic issue
 * assessment drafts. Consumer is issue-stage-orchestrator.validateDraftsComplete.
 *
 * Document kind: `issue_semantic_drafts`
 * Per-draft required fields: issue_binding, intake, fulfillment_assessment,
 *   evidence_index, public_evidence_boundary, notes.
 * Forbidden keys: no tool_names, no external_urls, no free_form_text, no raw_content.
 * Canonical evidence path always rooted in catalog/ evidence stores.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { CATALOG } from '../../../catalog-data/scripts/lib/catalog-lib.mjs';

/**
 * Write issue assessment drafts — write-once, coverage-binding.
 *
 * @param {object} opts
 * @param {string} opts.runId
 * @param {string} opts.workloadPath - path to the issue-workload.json
 * @param {Array}  opts.drafts - array of assessment draft objects
 * @param {string} [opts.runsRoot]
 * @param {string} [opts.catalogRoot]
 * @returns {object} { path, digest, byte_length, coverage }
 */
export function writeIssueDrafts({
  runId,
  workloadPath,
  drafts,
  runsRoot,
  catalogRoot,
} = {}) {
  if (!runId || typeof runId !== 'string') throw new Error('runId is required');
  if (!workloadPath || typeof workloadPath !== 'string') throw new Error('workloadPath is required');
  if (!Array.isArray(drafts)) throw new Error('drafts must be an array');
  if (!runsRoot) runsRoot = join(CATALOG, 'runs');

  // Load workload to get accepted issues
  if (!existsSync(workloadPath)) throw new Error(`workload file not found: ${workloadPath}`);
  const workload = JSON.parse(readFileSync(workloadPath, 'utf8'));
  const acceptedIssues = workload.all_accepted_issues || [];

  // Coverage check: every accepted issue must have a draft
  const draftByNumber = new Map();
  for (const draft of drafts) {
    if (draft.issue_number == null) throw new Error('draft missing issue_number');
    draftByNumber.set(draft.issue_number, draft);
  }

  const coverage = {
    total_accepted: acceptedIssues.length,
    total_drafts: drafts.length,
    covered: 0,
    missing: [],
  };

  for (const iss of acceptedIssues) {
    const num = iss.issue_number;
    if (draftByNumber.has(num)) {
      coverage.covered++;
    } else {
      coverage.missing.push(num);
    }
  }

  if (coverage.missing.length > 0) {
    throw new Error(
      `issue_drafts_coverage_incomplete: ${coverage.missing.length} accepted issues missing drafts: ${coverage.missing.join(', ')}`
    );
  }

  // Validate each draft shape (forbidden keys + required consumer schema fields)
  const FORBIDDEN_KEYS = new Set(['tool_names', 'external_urls', 'free_form_text', 'raw_content']);
  const REQUIRED_DRAFT_KEYS = new Set([
    'issue_binding', 'intake', 'fulfillment_assessment',
    'evidence_index', 'public_evidence_boundary', 'notes'
  ]);
  for (const draft of drafts) {
    // Forbidden keys
    for (const key of FORBIDDEN_KEYS) {
      if (key in draft) {
        throw new Error(`forbidden_key_in_draft[${draft.issue_number}]: ${key}`);
      }
    }
    // Required consumer-schema fields
    for (const key of REQUIRED_DRAFT_KEYS) {
      if (!(key in draft)) {
        throw new Error(`draft[${draft.issue_number}]: missing required field '${key}'`);
      }
    }
    // issue_binding must contain issue_number
    if (!draft.issue_binding || typeof draft.issue_binding !== 'object' || draft.issue_binding.issue_number == null) {
      throw new Error(`draft[${draft.issue_number}]: issue_binding.issue_number is required`);
    }
    // issue_number on draft must match issue_binding.issue_number
    if (draft.issue_number !== draft.issue_binding.issue_number) {
      throw new Error(`draft[${draft.issue_number}]: draft.issue_number must match issue_binding.issue_number`);
    }
    // intake must be a valid object
    if (!draft.intake || typeof draft.intake !== 'object') {
      throw new Error(`draft[${draft.issue_number}]: intake must be a non-null object`);
    }
    // fulfillment_assessment must contain assessment_id
    if (!draft.fulfillment_assessment || typeof draft.fulfillment_assessment !== 'object') {
      throw new Error(`draft[${draft.issue_number}]: fulfillment_assessment must be a non-null object`);
    }
    if (typeof draft.fulfillment_assessment.assessment_id !== 'string'
        || !draft.fulfillment_assessment.assessment_id.startsWith('asm_')) {
      throw new Error(`draft[${draft.issue_number}]: fulfillment_assessment.assessment_id must start with asm_`);
    }
    // evidence_index must be present
    if (!draft.evidence_index || typeof draft.evidence_index !== 'object') {
      throw new Error(`draft[${draft.issue_number}]: evidence_index must be a non-null object`);
    }
    // public_evidence_boundary must be present
    if (typeof draft.public_evidence_boundary !== 'string' || draft.public_evidence_boundary.length === 0) {
      throw new Error(`draft[${draft.issue_number}]: public_evidence_boundary must be a non-empty string`);
    }
    // notes must be present
    if (typeof draft.notes !== 'string') {
      throw new Error(`draft[${draft.issue_number}]: notes must be a string`);
    }
    if (draft.issue_number == null) {
      throw new Error('draft missing issue_number');
    }
  }

  // Write-once
  const runDir = join(runsRoot, runId);
  const draftsPath = join(runDir, 'issue-drafts.json');
  if (existsSync(draftsPath)) {
    throw new Error(`EEXIST: issue-drafts.json already exists for run ${runId} (write-once violation)`);
  }

  const content = JSON.stringify({
    schema_version: 1,
    run_id: runId,
    workload_digest: workload.workload_digest || '',
    drafts,
    coverage,
    created_at: new Date().toISOString(),
  }, null, 2);

  writeFileSync(draftsPath, content, { flag: 'wx' });

  const digest = `sha256:${createHash('sha256').update(content).digest('hex')}`;
  const byteLength = Buffer.byteLength(content);

  return Object.freeze({
    path: draftsPath,
    digest,
    byte_length: byteLength,
    coverage,
  });
}

/**
 * Validate existing issue drafts — coverage, binding, forbidden keys.
 *
 * @param {object} opts
 * @param {string} opts.runId
 * @param {string} opts.workloadPath
 * @param {string} [opts.runsRoot]
 * @returns {object} { ok, error, coverage, drafts? }
 */
export function validateIssueDrafts({ runId, workloadPath, runsRoot } = {}) {
  if (!runsRoot) runsRoot = join(CATALOG, 'runs');

  const draftsPath = join(runsRoot, runId, 'issue-drafts.json');
  if (!existsSync(draftsPath)) {
    return { ok: false, error: `issue_drafts_not_found: ${draftsPath}` };
  }

  let draftsDoc;
  try {
    draftsDoc = JSON.parse(readFileSync(draftsPath, 'utf8'));
  } catch (e) {
    return { ok: false, error: `issue_drafts_parse_error: ${e.message}` };
  }

  if (!workloadPath || !existsSync(workloadPath)) {
    return { ok: false, error: 'workload_not_found' };
  }

  const workload = JSON.parse(readFileSync(workloadPath, 'utf8'));

  // Binding check: run_id match
  if (draftsDoc.run_id !== runId) {
    return { ok: false, error: `drafts_run_id_mismatch: ${draftsDoc.run_id} vs ${runId}` };
  }

  // Workload digest binding
  if (draftsDoc.workload_digest && draftsDoc.workload_digest !== workload.workload_digest) {
    return { ok: false, error: 'drafts_workload_digest_mismatch' };
  }

  const drafts = draftsDoc.drafts || [];
  const acceptedIssues = workload.all_accepted_issues || [];

  // Coverage check
  const draftNumbers = new Set(drafts.map(d => d.issue_number));
  const missing = acceptedIssues.filter(iss => !draftNumbers.has(iss.issue_number));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `drafts_coverage_incomplete: missing issues ${missing.map(m => m.issue_number).join(', ')}`,
    };
  }

  // Forbidden keys + required consumer schema fields
  const FORBIDDEN_KEYS = new Set(['tool_names', 'external_urls', 'free_form_text', 'raw_content']);
  const REQUIRED_DRAFT_KEYS = new Set([
    'issue_binding', 'intake', 'fulfillment_assessment',
    'evidence_index', 'public_evidence_boundary', 'notes'
  ]);
  for (const draft of drafts) {
    // Forbidden keys
    for (const key of FORBIDDEN_KEYS) {
      if (key in draft) {
        return { ok: false, error: `forbidden_key_in_draft[${draft.issue_number}]: ${key}` };
      }
    }
    // Required consumer-schema fields
    for (const key of REQUIRED_DRAFT_KEYS) {
      if (!(key in draft)) {
        return { ok: false, error: `draft[${draft.issue_number}]: missing required field '${key}'` };
      }
    }
  }

  return {
    ok: true,
    coverage: draftsDoc.coverage || { total_accepted: acceptedIssues.length, total_drafts: drafts.length, covered: drafts.length, missing: [] },
    drafts,
  };
}
