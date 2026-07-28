#!/usr/bin/env node
/**
 * Deterministic production closure CLI.
 *
 * Consumes prepared run output plus the collector evidence manifest from
 * predetermined run paths and writes a run-scoped closure evidence manifest.
 *
 * Usage:
 *   resolve-closure.mjs --run-id <id>
 *
 * Production paths (all derived from --run-id):
 *   catalog/runs/<run-id>/prepared/prepared-run.json  — from prepare-run
 *   catalog/runs/<run-id>/collector-snapshot.json       — collector snapshot
 *   catalog/runs/<run-id>/closure/closure-manifest.json — output
 *
 * No hand assembly. Unknown/missing/duplicate args fail closed.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveIntentClosure, computeCoverage, computeRelationStats } from './lib/closure-resolver.mjs';
import { collectRunContextInput, loadCanonicalClosureEvidence } from './lib/collector.mjs';

function main(args = process.argv.slice(2)) {
  const parsed = parseArgs(args);

  if (!parsed.runId) {
    process.stderr.write('resolve-closure: --run-id is required\n');
    process.exit(1);
  }

  const runId = parsed.runId;
  if (!runId.startsWith('run_')) {
    process.stderr.write(`resolve-closure: invalid run-id "${runId}" — must start with run_\n`);
    process.exit(1);
  }

  // Resolve paths
  const catalogRoot = findCatalogRoot();
  const runDir = join(catalogRoot, 'runs', runId);

  if (!existsSync(runDir)) {
    process.stderr.write(`resolve-closure: run directory not found: ${runDir}\n`);
    process.exit(1);
  }

  const preparedPath = parsed.prepared || join(runDir, 'prepared', 'prepared-run.json');
  const collectorPath = parsed.collector || join(runDir, 'collector-snapshot.json');
  const outputPath = parsed.output || join(runDir, 'closure', 'closure-manifest.json');

  if (!existsSync(preparedPath)) {
    process.stderr.write(`resolve-closure: prepared run not found: ${preparedPath}\n`);
    process.exit(1);
  }

  // Load prepared run
  let prepared;
  try {
    prepared = JSON.parse(readFileSync(preparedPath, 'utf8'));
  } catch (err) {
    process.stderr.write(`resolve-closure: failed to parse prepared run: ${err.message}\n`);
    process.exit(1);
  }

  if (!prepared.run_context || !prepared.intents) {
    process.stderr.write('resolve-closure: prepared run missing run_context or intents\n');
    process.exit(1);
  }

  // Load collector snapshot for staleness check
  let collectorSnapshot = null;
  if (existsSync(collectorPath)) {
    try {
      collectorSnapshot = JSON.parse(readFileSync(collectorPath, 'utf8'));
    } catch {
      process.stderr.write(`resolve-closure: WARNING: could not parse collector snapshot at ${collectorPath}\n`);
    }
  }

  // Collect current canonical state
  const workloadPath = join(runDir, 'issue-stage', 'workload.json');
  const demandPath = join(runDir, 'demand-artifact.json');

  const collectorResult = collectRunContextInput({
    issueWorkloadPath: existsSync(workloadPath) ? workloadPath : null,
    demandArtifactPath: existsSync(demandPath) ? demandPath : null,
  });

  const snapshotDigest = collectorResult.snapshotDigest;

  // Staleness check against collector snapshot
  if (collectorSnapshot && collectorSnapshot.snapshot_digest) {
    if (collectorSnapshot.snapshot_digest !== snapshotDigest) {
      process.stderr.write(
        `resolve-closure: STALE_SNAPSHOT — ` +
        `current=${snapshotDigest.slice(0, 16)}... ` +
        `expected=${collectorSnapshot.snapshot_digest.slice(0, 16)}...\n`
      );
      process.exit(1);
    }
  }

  // Load canonical data through the same fail-closed reader used by the collector.
  const { skills, analyses, relations } = loadCanonicalClosureEvidence(catalogRoot);

  const coverage = computeCoverage(skills, analyses);
  const relStats = computeRelationStats(relations);

  // Resolve closure
  const result = resolveIntentClosure({
    intents: prepared.intents.intents || [],
    skills,
    analyses,
    relations,
    coverage,
    relationStats: relStats,
    issueDemandMetadata: null, // handled through collector
    snapshotDigest,
    maxIntents: 2,
    maxBudgetPerIntent: 50,
    maxTotalBudget: 100,
  });

  // Build output
  const output = {
    schema_version: 1,
    kind: 'closure_evidence_manifest',
    run_id: runId,
    snapshot_digest: snapshotDigest,
    prepared_digest: prepared.run_context.digest,
    closure: {
      digest: result.digest,
      intents: result.intents.map((i) => ({
        intent: i.intent,
        seed_skill_ids: i.seed_skill_ids,
        seeds_resolved: i.seeds_resolved,
      })),
      evidence_manifest: result.evidenceManifest,
    },
    generated_at: new Date().toISOString(),
  };

  // Write output
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  process.stderr.write(`resolve-closure: wrote closure manifest to ${outputPath}\n`);
  process.stdout.write(JSON.stringify({
    ok: true,
    run_id: runId,
    snapshot_digest: snapshotDigest,
    closure_digest: result.digest,
    resolved_intents: result.intents.length,
    total_seeds: result.evidenceManifest.total_seeds,
    output_path: outputPath,
  }, null, 2) + '\n');
}

// ---- Argument parsing ----

const KNOWN_FLAGS = new Set(['--run-id', '--prepared', '--collector', '--output', '--format']);

function parseArgs(argv) {
  const seen = new Set();
  const parsed = { runId: null };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--') && !KNOWN_FLAGS.has(arg)) {
      process.stderr.write(`resolve-closure: UNKNOWN_FLAG: ${arg}\n`);
      process.exit(1);
    }

    if (arg.startsWith('--') && seen.has(arg)) {
      process.stderr.write(`resolve-closure: DUPLICATE_FLAG: ${arg}\n`);
      process.exit(1);
    }
    seen.add(arg);

    switch (arg) {
      case '--run-id':
        parsed.runId = argv[++i];
        break;
      case '--prepared':
        parsed.prepared = argv[++i];
        break;
      case '--collector':
        parsed.collector = argv[++i];
        break;
      case '--output':
        parsed.output = argv[++i];
        break;
      case '--format':
        parsed.format = argv[++i];
        break;
    }
  }
  return parsed;
}

// ---- Path resolution ----

function findCatalogRoot() {
  let current = dirname(fileURLToPath(import.meta.url));
  while (current !== dirname(current)) {
    if (existsSync(join(current, 'AGENTS.md')) && existsSync(join(current, 'catalog'))) {
      return join(current, 'catalog');
    }
    current = dirname(current);
  }
  if (existsSync(join(process.cwd(), 'AGENTS.md')) && existsSync(join(process.cwd(), 'catalog'))) {
    return join(process.cwd(), 'catalog');
  }
  throw new Error('Unable to locate catalog root');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/resolve-closure.mjs')) {
  main();
}
