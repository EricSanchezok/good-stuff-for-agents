import { createHash } from 'node:crypto';
import { validateAgainstSchema, terminalLedgerSchemaV1 } from '../../../catalog-data/scripts/lib/schema-validators.mjs';

const VALID_OUTCOMES = new Set([
  'unchanged', 'discovered', 'activated', 'updated', 'synced',
  'analyzed', 'related', 'packaged', 'evaluated', 'published',
  'promoted', 'rejected', 'superseded', 'deprecated', 'blocked',
  'broken', 'removed', 'skipped', 'error', 'no_pack_clean', 'reply_blocked',
  'draft', 'dry_run', 'duplicate', 'posted', 'held_for_review', 'no_action',
]);

const VALID_RUN_STATUSES = new Set(['success', 'partial', 'failed', 'no_pack_clean', 'reply_blocked']);

/**
 * Creates a new terminal ledger.
 * The ledger is the single computation source for all reports, summaries, and manifests.
 */
export function createTerminalLedger({
  ledgerId,
  runId,
  timestamp,
  sourceOutcomes = [],
  skillOutcomes = [],
  relationOutcomes = [],
  packOutcomes = [],
  issueOutcomes = [],
  runStatus = 'success',
  runSummary = null,
  totalActions = 0,
  errors = 0,
  warnings = 0,
} = {}) {
  const ledger = {
    schema_version: 1,
    ledger_id: ledgerId || generateLedgerId(),
    run_id: runId || '',
    timestamp: timestamp || new Date().toISOString(),
    source_outcomes: normalizeOutcomes(sourceOutcomes),
    skill_outcomes: normalizeOutcomes(skillOutcomes),
    relation_outcomes: normalizeOutcomes(relationOutcomes),
    pack_outcomes: normalizeOutcomes(packOutcomes),
    issue_outcomes: normalizeOutcomes(issueOutcomes),
    run_outcome: {
      status: runStatus,
      summary: runSummary || deriveSummary(runStatus, skillOutcomes, packOutcomes),
      total_actions: totalActions,
      errors,
      warnings,
    },
  };

  if (!VALID_RUN_STATUSES.has(ledger.run_outcome.status)) {
    throw new Error(`Invalid run outcome status: ${ledger.run_outcome.status}`);
  }

  const validation = validateAgainstSchema(ledger, terminalLedgerSchemaV1);
  if (!validation.ok) {
    throw new Error(`Invalid terminal ledger: ${validation.errors.join('; ')}`);
  }

  const digest = computeLedgerDigest(ledger);

  return Object.freeze({
    ...ledger,
    digest,
    _sealed: true,
  });
}

/**
 * Add an outcome entry to a ledger builder (mutable builder pattern for orchestration).
 */
export function createLedgerBuilder(initial = {}) {
  let _ledger = null;
  let _sealed = false;

  const sources = [...(initial.sourceOutcomes || [])];
  const skills = [...(initial.skillOutcomes || [])];
  const relations = [...(initial.relationOutcomes || [])];
  const packs = [...(initial.packOutcomes || [])];
  const issues = [...(initial.issueOutcomes || [])];
  let runStatus = initial.runStatus || 'success';
  let runSummary = initial.runSummary || '';
  let totalActions = initial.totalActions || 0;
  let errorCount = initial.errors || 0;
  let warningCount = initial.warnings || 0;

  return {
    addSourceOutcome(entityId, state, detail, errorCode, paths) {
      assertNotSealed();
      validateState(state);
      sources.push(makeEntry(entityId, state, detail, errorCode, paths));
      totalActions++;
      return this;
    },
    addSkillOutcome(entityId, state, detail, errorCode, paths) {
      assertNotSealed();
      validateState(state);
      skills.push(makeEntry(entityId, state, detail, errorCode, paths));
      totalActions++;
      return this;
    },
    addRelationOutcome(entityId, state, detail, errorCode, paths) {
      assertNotSealed();
      validateState(state);
      relations.push(makeEntry(entityId, state, detail, errorCode, paths));
      totalActions++;
      return this;
    },
    addPackOutcome(entityId, state, detail, errorCode, paths) {
      assertNotSealed();
      validateState(state);
      packs.push(makeEntry(entityId, state, detail, errorCode, paths));
      totalActions++;
      return this;
    },
    addIssueOutcome(entityId, state, detail, errorCode, paths) {
      assertNotSealed();
      validateState(state);
      issues.push(makeEntry(entityId, state, detail, errorCode, paths));
      totalActions++;
      return this;
    },
    addError() { errorCount++; return this; },
    addWarning() { warningCount++; return this; },
    setRunStatus(status) {
      assertNotSealed();
      if (!VALID_RUN_STATUSES.has(status)) throw new Error(`Invalid run status: ${status}`);
      runStatus = status;
      return this;
    },
    setRunSummary(summary) {
      assertNotSealed();
      runSummary = summary;
      return this;
    },
    seal({ ledgerId, runId, timestamp } = {}) {
      if (_sealed) return _ledger;
      const derivedRunStatus = determineRunStatus(runStatus, errorCount, skills, packs);
      _ledger = createTerminalLedger({
        ledgerId,
        runId,
        timestamp,
        sourceOutcomes: sources,
        skillOutcomes: skills,
        relationOutcomes: relations,
        packOutcomes: packs,
        issueOutcomes: issues,
        runStatus: derivedRunStatus,
        runSummary: runSummary || deriveSummary(derivedRunStatus, skills, packs),
        totalActions,
        errors: errorCount,
        warnings: warningCount,
      });
      _sealed = true;
      return _ledger;
    },
    _sealed: () => _sealed,
    get _ledger() { return _ledger; },
  };

  function assertNotSealed() {
    if (_sealed) throw new Error('Ledger builder already sealed');
  }
}

export function computeLedgerDigest(ledger) {
  const ordered = {
    schema_version: ledger.schema_version,
    ledger_id: ledger.ledger_id,
    run_id: ledger.run_id,
    timestamp: ledger.timestamp,
    source_outcomes: ledger.source_outcomes,
    skill_outcomes: ledger.skill_outcomes,
    relation_outcomes: ledger.relation_outcomes,
    pack_outcomes: ledger.pack_outcomes,
    issue_outcomes: ledger.issue_outcomes,
    run_outcome: ledger.run_outcome,
  };
  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
}

export function validateState(state) {
  if (!VALID_OUTCOMES.has(state)) throw new Error(`Invalid terminal state: ${state}`);
}

// --- internals ---

function generateLedgerId() {
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const rand = Math.random().toString(36).slice(2, 8);
  return `ldg_${ts}-${rand}`;
}

function makeEntry(entityId, state, detail, errorCode, paths) {
  const entry = { entity_id: entityId, state };
  if (detail) entry.detail = detail;
  if (errorCode) entry.error_code = errorCode;
  if (Array.isArray(paths) && paths.length > 0) entry.paths = [...new Set(paths)].sort();
  return entry;
}

function normalizeOutcomes(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((e) => ({
    entity_id: e.entity_id || 'unknown',
    state: e.state || 'skipped',
    ...(e.detail ? { detail: e.detail } : {}),
    ...(e.error_code ? { error_code: e.error_code } : {}),
    ...(Array.isArray(e.paths) && e.paths.length > 0 ? { paths: [...new Set(e.paths)].sort() } : {}),
  }));
}

function determineRunStatus(currentStatus, errorCount, skillOutcomes, packOutcomes) {
  if (errorCount > 0) return currentStatus === 'success' ? 'partial' : currentStatus;
  return currentStatus;
}

function deriveSummary(status, skills, packs) {
  switch (status) {
    case 'no_pack_clean':
      return 'Run completed with no packs to publish. Zero packs is a clean terminal state.';
    case 'reply_blocked':
      return 'Run completed but reply stage detected a blocking condition.';
    case 'failed':
      return 'Run failed with errors.';
    case 'partial':
      return 'Run completed with warnings.';
    case 'success':
      return 'Run completed successfully.';
    default:
      return 'Run completed.';
  }
}
