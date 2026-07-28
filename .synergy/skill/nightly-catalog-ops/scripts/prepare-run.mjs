#!/usr/bin/env node
/**
 * Deterministic run preparation CLI.
 *
 * Input:  JSON (collector output with snapshot_digest, evidence_manifest_digest, context)
 *         via stdin, --input, or --resume.
 * Output: JSON with immutable run context + selected intents to stdout.
 *
 * The collector output binds snapshot evidence. prepare-run must receive collector
 * output — legacy raw aggregate input is rejected.
 *
 * No semantic work. No Synergy session dispatch. No side effects.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { computeDemandDigest, computeInputDigest, computeManifestDigest } from './lib/collector.mjs';
import { createRunContext, resumeRunContext, serializeRunContext } from './lib/run-context.mjs';
import { selectTargetIntents } from './lib/target-selector.mjs';

function main(args = process.argv.slice(2)) {
  const parsed = parseArgs(args);

  let runContext;
  let collectorOutput = null;
  let snapshotDigest = null;
  let evidenceManifestDigest = null;

  if (parsed.resume) {
    const saved = readJson(parsed.resume);
    const resumed = resumeRunContext(saved, parsed.expectedDigest);
    if (!resumed) {
      process.stderr.write('prepare-run: RESUME_DIGEST_MISMATCH\n');
      process.exit(1);
    }
    runContext = resumed;
  } else {
    collectorOutput = parsed.input ? readJson(parsed.input) : readStdinJson();

    // Require collector output with snapshot tracking
    if (!collectorOutput.snapshot_digest || !collectorOutput.evidence_manifest_digest) {
      process.stderr.write('prepare-run: COLLECTOR_OUTPUT_REQUIRED — input must come from collect-run-context and include snapshot_digest + evidence_manifest_digest\n');
      process.exit(1);
    }

    snapshotDigest = collectorOutput.snapshot_digest;
    evidenceManifestDigest = collectorOutput.evidence_manifest_digest;

    // Reject legacy raw aggregate input (no snapshot_digest means pre-hardening)
    if (!/^[a-f0-9]{64}$/u.test(snapshotDigest) || !/^[a-f0-9]{64}$/u.test(evidenceManifestDigest)) {
      process.stderr.write('prepare-run: BAD_SNAPSHOT_DIGEST — snapshot_digest and evidence_manifest_digest must be valid SHA-256 hex\n');
      process.exit(1);
    }

    validateCollectorOutput(collectorOutput);
    const input = collectorOutput.context;
    runContext = createRunContext({
      ...input,
      snapshotDigest,
      evidenceManifestDigest,
      demandMetadata: collectorOutput.demand_metadata,
    });
  }

  const demandMetadata = runContext.demand_metadata;

  const intents = selectTargetIntents({
    coverage: runContext.coverage,
    relations: runContext.relations,
    packLifecycle: runContext.pack_lifecycle,
    catalogCounts: runContext.catalog_counts,
    issueDemandMetadata: demandMetadata,
  });

  const serialized = serializeRunContext(runContext);

  const output = {
    run_context: serialized,
    intents,
    _sealed: true,
  };

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

/**
 * Programmatic API: prepare a run from collected context input.
 *
 * @param {object} opts
 * @param {object} [opts.runContextInput]  — raw collected input (MUST have snapshot_digest + evidence_manifest_digest)
 * @param {object} [opts.resumeFrom]       — saved run context to resume
 * @param {string} [opts.expectedDigest]   — digest expected when resuming
 * @param {object} [opts.issueDemandMetadata] — controller-bound demand metadata
 * @returns {{ run_context: object, intents: object, _sealed: true }}
 */
export function prepareRun({ runContextInput, resumeFrom, expectedDigest, issueDemandMetadata } = {}) {
  let runContext;
  if (resumeFrom) {
    const resumed = resumeRunContext(resumeFrom, expectedDigest);
    if (!resumed) throw new Error('RESUME_DIGEST_MISMATCH');
    runContext = resumed;
  } else {
    // Require collector output
    const input = runContextInput || {};
    if (!input.snapshotDigest || !input.evidenceManifestDigest) {
      throw new Error('COLLECTOR_OUTPUT_REQUIRED: snapshot_digest and evidence_manifest_digest must come from collector');
    }
    runContext = createRunContext({
      ...input,
      snapshotDigest: input.snapshotDigest,
      evidenceManifestDigest: input.evidenceManifestDigest,
      demandMetadata: issueDemandMetadata ?? input.demandMetadata,
    });
  }

  const intents = selectTargetIntents({
    coverage: runContext.coverage,
    relations: runContext.relations,
    packLifecycle: runContext.pack_lifecycle,
    catalogCounts: runContext.catalog_counts,
    issueDemandMetadata: runContext.demand_metadata,
  });

  return Object.freeze({
    run_context: serializeRunContext(runContext),
    intents,
    _sealed: true,
  });
}

function validateCollectorOutput(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('COLLECTOR_OUTPUT_INVALID: expected an object');
  if (!raw.context || typeof raw.context !== 'object' || Array.isArray(raw.context)) throw new Error('COLLECTOR_OUTPUT_INVALID: context is required');
  if (!raw.evidence_manifest || typeof raw.evidence_manifest !== 'object' || Array.isArray(raw.evidence_manifest)) {
    throw new Error('COLLECTOR_OUTPUT_INVALID: evidence_manifest is required');
  }

  const semanticDigest = computeInputDigest(raw.context);
  if (raw.semantic_digest !== semanticDigest) throw new Error('COLLECTOR_OUTPUT_INVALID: semantic_digest mismatch');

  const manifestDigest = computeManifestDigest(raw.evidence_manifest);
  if (raw.evidence_manifest_digest !== manifestDigest) throw new Error('COLLECTOR_OUTPUT_INVALID: evidence_manifest_digest mismatch');

  const snapshotDigest = createHash('sha256').update(semanticDigest).update(manifestDigest).digest('hex');
  if (raw.snapshot_digest !== snapshotDigest) throw new Error('COLLECTOR_OUTPUT_INVALID: snapshot_digest mismatch');

  const demand = raw.demand_metadata ?? null;
  if (raw.context.demandDigest == null) {
    if (demand !== null) throw new Error('COLLECTOR_OUTPUT_INVALID: unbound demand_metadata');
    return;
  }
  if (!demand || typeof demand !== 'object' || Array.isArray(demand)) throw new Error('COLLECTOR_OUTPUT_INVALID: demand_metadata is required');
  if (!Array.isArray(demand.demand_skill_ids) || !Array.isArray(demand.domain_slugs)) {
    throw new Error('COLLECTOR_OUTPUT_INVALID: demand_metadata arrays are required');
  }
  if (demand.run_id !== raw.context.runId) throw new Error('COLLECTOR_OUTPUT_INVALID: demand run_id mismatch');
  if (demand.workload_digest !== raw.context.issueWorkloadDigest) throw new Error('COLLECTOR_OUTPUT_INVALID: demand workload_digest mismatch');
  if (computeDemandDigest(demand) !== raw.context.demandDigest || demand.digest !== raw.context.demandDigest) {
    throw new Error('COLLECTOR_OUTPUT_INVALID: demand digest mismatch');
  }
}

function parseArgs(argv) {
  const parsed = {};
  const KNOWN = new Set(['--input', '--resume', '--expected-digest']);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--') && !KNOWN.has(arg)) {
      process.stderr.write(`prepare-run: UNKNOWN_FLAG: ${arg}\n`);
      process.exit(1);
    }
    switch (arg) {
      case '--input':
        parsed.input = argv[++i];
        break;
      case '--resume':
        parsed.resume = argv[++i];
        break;
      case '--expected-digest':
        parsed.expectedDigest = argv[++i];
        break;
    }
  }
  return parsed;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readStdinJson() {
  return JSON.parse(readFileSync('/dev/stdin', 'utf8'));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/prepare-run.mjs')) {
  main();
}
