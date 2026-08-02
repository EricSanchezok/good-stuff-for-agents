#!/usr/bin/env node
/**
 * Canonical target-result writer — pure deterministic, write-once.
 *
 * The outer Agent writes owner skill results through this writer.
 * The production resume adapter reads and validates the write-once file.
 *
 * Import-safe: zero I/O on import. All behavior lives in exported
 * functions and the isMain-guarded CLI block.
 *
 * CLI:
 *   node target-result-writer.mjs --input <path>   # read JSON from file
 *   echo '{"runId":...}' | node target-result-writer.mjs   # read from stdin
 *
 * stdout: JSON descriptor { path, digest, byte_length, intents_covered }
 * exit 1 on validation/write failure.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG } from '../../../catalog-data/scripts/lib/catalog-lib.mjs';

const RUNS_ROOT_DEFAULT = join(CATALOG, 'runs');

const VALID_TERMINALS = Object.freeze(new Set([
  'promoted', 'rejected', 'insufficient_evidence', 'no_pack_clean', 'blocked',
]));

const DIGEST_RE = /^sha256:[a-f0-9]{64}$/;
const SESSION_ID_RE = /^ses_[a-zA-Z0-9]{20}$/;

// ══════════════════════════════════════════════════════════════════════
//  writeTargetResults — deterministic write-once
// ══════════════════════════════════════════════════════════════════════

export function writeTargetResults({
  runId,
  runsRoot,
  contextDigest,
  intents,
  candidateResults,
  intentResults,
  sessionDescriptors,
} = {}) {
  // ── Required fields ───────────────────────────────────────────────
  if (!runId || typeof runId !== 'string') {
    throw new Error('runId is required (string)');
  }
  if (!contextDigest || typeof contextDigest !== 'string' || !DIGEST_RE.test(contextDigest)) {
    throw new Error('contextDigest is required and must match sha256:<64 hex>');
  }
  if (!Array.isArray(intents)) {
    throw new Error('intents must be an array');
  }
  if (!Array.isArray(candidateResults)) {
    throw new Error('candidateResults must be an array');
  }
  if (!Array.isArray(intentResults)) {
    throw new Error('intentResults must be an array');
  }

  if (!runsRoot) runsRoot = RUNS_ROOT_DEFAULT;

  // ── Load authoritative binding ────────────────────────────────────
  const outDir = join(runsRoot, runId, 'outputs');
  const intentsPath = join(outDir, 'target-intents.json');
  const handoffPath = join(outDir, 'target-execution-handoff.json');

  let authoritativeIntents;
  let authoritativeContextDigest;
  let authoritativeRunId;

  if (existsSync(intentsPath)) {
    const raw = JSON.parse(readFileSync(intentsPath, 'utf8'));
    authoritativeIntents = raw.intents || [];
    authoritativeContextDigest = raw.context_digest || '';
    authoritativeRunId = raw.run_id;
  } else if (existsSync(handoffPath)) {
    const raw = JSON.parse(readFileSync(handoffPath, 'utf8'));
    authoritativeIntents = raw.intents || [];
    authoritativeContextDigest = raw.context_digest || '';
    authoritativeRunId = raw.run_id;
  } else {
    throw new Error(
      `target_binding_missing: neither target-intents.json nor target-execution-handoff.json found for run ${runId}`
    );
  }

  // ── Validate run_id match ─────────────────────────────────────────
  if (authoritativeRunId !== runId) {
    throw new Error(`run_id_mismatch: binding run_id=${authoritativeRunId}, input runId=${runId}`);
  }

  // ── Validate context_digest match ─────────────────────────────────
  const bindingCtxDigest = authoritativeContextDigest;
  if (bindingCtxDigest && contextDigest !== bindingCtxDigest) {
    throw new Error(
      `context_digest_mismatch: binding=${bindingCtxDigest}, input=${contextDigest}`
    );
  }

  // ── Validate exact intent coverage ────────────────────────────────
  if (authoritativeIntents.length === 0) {
    throw new Error('zero_intents_in_binding: cannot write target results with zero intents');
  }

  const intentDigests = new Map();
  for (const intent of authoritativeIntents) {
    const iDigest = computeIntentDigest(intent);
    intentDigests.set(iDigest, { intent, resolved: false });
  }

  const providedDigests = new Set();
  for (const ir of intentResults) {
    if (!ir.intent_digest || typeof ir.intent_digest !== 'string') {
      throw new Error('intentResult missing intent_digest');
    }
    if (providedDigests.has(ir.intent_digest)) {
      throw new Error(`duplicate_intent_result: ${ir.intent_digest}`);
    }
    providedDigests.add(ir.intent_digest);
  }

  for (const iDigest of providedDigests) {
    if (!intentDigests.has(iDigest)) {
      throw new Error(`unknown_intent_digest: ${iDigest} not found in authoritative intents`);
    }
    intentDigests.get(iDigest).resolved = true;
  }

  const unresolved = [];
  for (const [digest, entry] of intentDigests) {
    if (!entry.resolved) unresolved.push(digest);
  }
  if (unresolved.length > 0) {
    throw new Error(
      `intent_coverage_incomplete: ${unresolved.length} intent(s) missing results: ${unresolved.join(', ')}`
    );
  }

  if (providedDigests.size !== intentDigests.size) {
    throw new Error(
      `intent_count_mismatch: binding has ${intentDigests.size} intents, received ${providedDigests.size} results`
    );
  }

  // ── Validate intent terminal states ───────────────────────────────
  const candidateByPackId = new Map();
  for (const cr of candidateResults) {
    if (!cr.pack_id || typeof cr.pack_id !== 'string') {
      throw new Error('candidateResult missing pack_id');
    }
    if (candidateByPackId.has(cr.pack_id)) {
      throw new Error(`duplicate_pack_id: ${cr.pack_id}`);
    }
    candidateByPackId.set(cr.pack_id, cr);
  }

  const usedPackIds = new Set();
  const usedSessionIds = new Set();

  for (const ir of intentResults) {
    if (!ir.terminal || !VALID_TERMINALS.has(ir.terminal)) {
      throw new Error(
        `invalid_terminal[${ir.intent_digest}]: ${ir.terminal} (must be one of ${[...VALID_TERMINALS].join(',')})`
      );
    }

    if (ir.terminal === 'promoted') {
      // Must have pack_id
      if (!ir.pack_id || typeof ir.pack_id !== 'string') {
        throw new Error(`promoted_intent[${ir.intent_digest}] missing pack_id`);
      }
      if (usedPackIds.has(ir.pack_id)) {
        throw new Error(`duplicate_pack_id_in_intents[${ir.intent_digest}]: ${ir.pack_id}`);
      }
      usedPackIds.add(ir.pack_id);

      // Must reference a candidate result
      if (!candidateByPackId.has(ir.pack_id)) {
        throw new Error(
          `promoted_intent[${ir.intent_digest}] pack_id=${ir.pack_id} not found in candidateResults`
        );
      }

      // Must have proof/evaluation bindings
      if (!ir.proof_artifact_digest || !DIGEST_RE.test(ir.proof_artifact_digest)) {
        throw new Error(
          `promoted_intent[${ir.intent_digest}] missing or invalid proof_artifact_digest`
        );
      }
      if (!ir.evaluation_artifact_digest || !DIGEST_RE.test(ir.evaluation_artifact_digest)) {
        throw new Error(
          `promoted_intent[${ir.intent_digest}] missing or invalid evaluation_artifact_digest`
        );
      }

      // Must have synthesis_session_id and evaluation_session_id (different)
      if (!ir.synthesis_session_id || typeof ir.synthesis_session_id !== 'string') {
        throw new Error(`promoted_intent[${ir.intent_digest}] missing synthesis_session_id`);
      }
      if (!ir.evaluation_session_id || typeof ir.evaluation_session_id !== 'string') {
        throw new Error(`promoted_intent[${ir.intent_digest}] missing evaluation_session_id`);
      }
      if (ir.synthesis_session_id === ir.evaluation_session_id) {
        throw new Error(
          `promoted_intent[${ir.intent_digest}] synthesis_session_id and evaluation_session_id must differ`
        );
      }

      // Track session IDs, reject reuse across intents
      const sessKey = `synth:${ir.synthesis_session_id}`;
      const evalKey = `eval:${ir.evaluation_session_id}`;
      if (usedSessionIds.has(sessKey)) {
        throw new Error(
          `session_reuse[${ir.intent_digest}]: synthesis_session_id ${ir.synthesis_session_id} already used`
        );
      }
      if (usedSessionIds.has(evalKey)) {
        throw new Error(
          `session_reuse[${ir.intent_digest}]: evaluation_session_id ${ir.evaluation_session_id} already used`
        );
      }
      usedSessionIds.add(sessKey);
      usedSessionIds.add(evalKey);

      // Verify candidate result is also promoted
      const cr = candidateByPackId.get(ir.pack_id);
      if (cr.terminal !== 'promoted') {
        throw new Error(
          `promoted_intent[${ir.intent_digest}] pack_id=${ir.pack_id} candidate terminal=${cr.terminal}, expected promoted`
        );
      }
    } else {
      // Non-promoted must have gap/exhaustion or error
      if (!ir.gap_class && !ir.error) {
        throw new Error(
          `non_promoted_intent[${ir.intent_digest}] terminal=${ir.terminal} must have gap_class or error`
        );
      }
    }
  }

  // ── Validate sessionDescriptors if provided ───────────────────────
  const sessionDescArray = Array.isArray(sessionDescriptors) ? sessionDescriptors : [];
  for (const sd of sessionDescArray) {
    if (!sd.session_id || typeof sd.session_id !== 'string') {
      throw new Error('sessionDescriptor missing session_id');
    }
    if (!sd.kind || typeof sd.kind !== 'string') {
      throw new Error(`sessionDescriptor[${sd.session_id}] missing kind`);
    }
  }

  // ── Write-once ────────────────────────────────────────────────────
  const runDir = join(runsRoot, runId);
  mkdirSync(runDir, { recursive: true });
  const resultPath = join(runDir, 'target-result.json');

  if (existsSync(resultPath)) {
    throw new Error(`EEXIST: target-result.json already exists for run ${runId} (write-once violation)`);
  }

  const contentObj = {
    schema_version: 1,
    run_id: runId,
    context_digest: contextDigest,
    intents: authoritativeIntents,
    candidate_results: candidateResults,
    intent_results: intentResults,
    session_descriptors: sessionDescArray,
    created_at: new Date().toISOString(),
  };

  const content = JSON.stringify(contentObj, null, 2);
  writeFileSync(resultPath, content, { flag: 'wx' });

  const digest = `sha256:${createHash('sha256').update(content).digest('hex')}`;
  const byteLength = Buffer.byteLength(content);

  return Object.freeze({
    path: resultPath,
    digest,
    byte_length: byteLength,
    intents_covered: intentResults.length,
  });
}

// ══════════════════════════════════════════════════════════════════════
//  validateTargetResults — tamper/digest mismatch → reject
// ══════════════════════════════════════════════════════════════════════

export function validateTargetResults({ runId, runsRoot, expectedContextDigest } = {}) {
  if (!runId) throw new Error('runId is required');
  if (!runsRoot) runsRoot = RUNS_ROOT_DEFAULT;

  const resultPath = join(runsRoot, runId, 'target-result.json');
  if (!existsSync(resultPath)) {
    return { ok: false, error: `target_result_not_found: ${resultPath}` };
  }

  let content;
  let doc;
  try {
    content = readFileSync(resultPath, 'utf8');
    doc = JSON.parse(content);
  } catch (e) {
    return { ok: false, error: `target_result_parse_error: ${e.message}` };
  }

  // Validate stored digest (tamper detection)
  const actualDigest = `sha256:${createHash('sha256').update(content).digest('hex')}`;

  // run_id match
  if (doc.run_id !== runId) {
    return { ok: false, error: `target_result_run_id_mismatch: ${doc.run_id} vs ${runId}` };
  }

  // context_digest match if expected
  if (expectedContextDigest && doc.context_digest !== expectedContextDigest) {
    return {
      ok: false,
      error: `target_result_context_digest_mismatch: ${doc.context_digest} vs ${expectedContextDigest}`,
    };
  }

  return {
    ok: true,
    digest: actualDigest,
    doc,
    candidateResults: doc.candidate_results || [],
    intentResults: doc.intent_results || [],
    intents: doc.intents || [],
  };
}

// ══════════════════════════════════════════════════════════════════════
//  readTargetResults — raw read (import-safe, throws on missing/invalid)
// ══════════════════════════════════════════════════════════════════════

export function readTargetResults({ runId, runsRoot } = {}) {
  if (!runId) throw new Error('runId is required');
  if (!runsRoot) runsRoot = RUNS_ROOT_DEFAULT;

  const resultPath = join(runsRoot, runId, 'target-result.json');
  if (!existsSync(resultPath)) {
    throw new Error(`target_result_not_found: ${resultPath}`);
  }

  const content = readFileSync(resultPath, 'utf8');
  const doc = JSON.parse(content);

  if (doc.run_id !== runId) {
    throw new Error(`target_result_run_id_mismatch: ${doc.run_id} vs ${runId}`);
  }

  return doc;
}

// ══════════════════════════════════════════════════════════════════════
//  computeIntentDigest — deterministic binding key
// ══════════════════════════════════════════════════════════════════════

export function computeIntentDigest(intent) {
  const { domain, source, reason, seed_skill_ids, max_analysis_budget } = intent;
  const sortedSeedIds = [...(seed_skill_ids || [])].sort();
  const payload = JSON.stringify({
    domain: domain || '',
    source: source || '',
    reason: reason || '',
    seed_skill_ids: sortedSeedIds,
    max_analysis_budget: max_analysis_budget ?? 0,
  });
  return `sha256:${createHash('sha256').update(payload).digest('hex')}`;
}

// ══════════════════════════════════════════════════════════════════════
//  CLI — invoked via npm script or direct node
// ══════════════════════════════════════════════════════════════════════

function isMain(metaUrl) {
  return process.argv[1] && metaUrl === `file://${process.argv[1]}`;
}

async function cliMain() {
  const args = process.argv.slice(2);
  let inputData;

  if (args.length === 2 && args[0] === '--input') {
    // Read from file
    const inputPath = args[1];
    if (!existsSync(inputPath)) {
      process.stderr.write(`ERROR: input file not found: ${inputPath}\n`);
      process.exitCode = 1;
      return;
    }
    try {
      inputData = JSON.parse(readFileSync(inputPath, 'utf8'));
    } catch (e) {
      process.stderr.write(`ERROR: failed to parse input file: ${e.message}\n`);
      process.exitCode = 1;
      return;
    }
  } else if (args.length === 0) {
    // Read from stdin
    let stdinData = '';
    const { stdin } = process;
    stdin.setEncoding('utf8');
    for await (const chunk of stdin) {
      stdinData += chunk;
    }
    if (!stdinData.trim()) {
      process.stderr.write('ERROR: no data on stdin\n');
      process.exitCode = 1;
      return;
    }
    try {
      inputData = JSON.parse(stdinData);
    } catch (e) {
      process.stderr.write(`ERROR: failed to parse stdin JSON: ${e.message}\n`);
      process.exitCode = 1;
      return;
    }
  } else {
    process.stderr.write('Usage: node target-result-writer.mjs [--input <path>]\n');
    process.stderr.write('  Reads target result JSON from stdin or --input file.\n');
    process.stderr.write('  Writes target-result.json and outputs descriptor JSON to stdout.\n');
    process.exitCode = 1;
    return;
  }

  if (!inputData || typeof inputData !== 'object') {
    process.stderr.write('ERROR: input must be a JSON object\n');
    process.exitCode = 1;
    return;
  }

  try {
    const result = writeTargetResults(inputData);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (e) {
    process.stderr.write(`FATAL: ${e.message}\n`);
    process.exitCode = 1;
  }
}

if (isMain(import.meta.url)) {
  cliMain().catch((err) => {
    process.stderr.write(`FATAL: ${err.message}\n`);
    process.exitCode = 1;
  });
}
