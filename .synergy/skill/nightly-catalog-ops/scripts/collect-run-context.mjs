#!/usr/bin/env node
/**
 * Deterministic live-state collector CLI — hardened.
 *
 * Reads current canonical repository files (no indexes) and emits the exact
 * collector output consumed by `prepare-run.mjs`.
 *
 * Production: --run-id is required. All paths are derived from it:
 *   catalog/runs/<run-id>/issue-stage/workload.json
 *   catalog/runs/<run-id>/demand-artifact.json
 *
 * Removed: --catalog-root (always repo-root-autodetect)
 * Removed: --issue-workload arbitrary path
 *
 * Options:
 *   --run-id <run-id>          Required. Determines workload/demand paths.
 *   --check-freshness <digest>  Check against prior snapshot digest
 *   --format json               Output format (default: json)
 *
 * Output: JSON object with { context, digest, evidenceManifest, evidenceManifestDigest, snapshotDigest } to stdout.
 *
 * No side effects. No network.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectRunContextInput, checkEvidenceFreshness, __FILE_DIR__ } from './lib/collector.mjs';

function main(args = process.argv.slice(2)) {
  const parsed = parseArgs(args);

  if (parsed.checkFreshness) {
    const result = checkEvidenceFreshness({
      expectedDigest: parsed.checkFreshness,
    });
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exit(result.ok ? 0 : 2);
  }

  // Production: resolve paths from run-id
  const workloadPath = resolveRunPath(parsed.runId, 'issue-stage/workload.json');
  const demandPath = resolveRunPath(parsed.runId, 'demand-artifact.json');

  const { context, digest, evidenceManifest, evidenceManifestDigest, snapshotDigest, demandMetadata } = collectRunContextInput({
    issueWorkloadPath: workloadPath,
    demandArtifactPath: demandPath,
  });

  const output = {
    semantic_digest: digest,
    snapshot_digest: snapshotDigest,
    evidence_manifest_digest: evidenceManifestDigest,
    evidence_manifest: evidenceManifest,
    demand_metadata: demandMetadata,
    generated_at: new Date().toISOString(),
    context: {
      ...context,
      runId: parsed.runId,
    },
  };

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

const KNOWN_FLAGS = new Set(['--run-id', '--check-freshness', '--format']);

function parseArgs(argv) {
  const parsed = { runId: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--') && !KNOWN_FLAGS.has(arg)) {
      process.stderr.write(`collect-run-context: UNKNOWN_FLAG: ${arg}\n`);
      process.exit(1);
    }
    switch (arg) {
      case '--run-id':
        parsed.runId = argv[++i];
        break;
      case '--check-freshness':
        parsed.checkFreshness = argv[++i];
        break;
      case '--format':
        parsed.format = argv[++i];
        break;
    }
  }

  if (!parsed.runId && !parsed.checkFreshness) {
    process.stderr.write('collect-run-context: --run-id is required (or --check-freshness)\n');
    process.exit(1);
  }

  return parsed;
}

function resolveRunPath(runId, subPath) {
  if (!runId) return null;
  const catalogRoot = findCatalogRootFallback();
  return join(catalogRoot, 'runs', runId, subPath);
}

function findCatalogRootFallback() {
  let current = dirname(fileURLToPath(import.meta.url));
  // Walk up from current file dir
  while (current !== dirname(current)) {
    if (existsSync(join(current, 'AGENTS.md')) && existsSync(join(current, 'catalog'))) {
      return join(current, 'catalog');
    }
    current = dirname(current);
  }
  // Try cwd
  if (existsSync(join(process.cwd(), 'AGENTS.md')) && existsSync(join(process.cwd(), 'catalog'))) {
    return join(process.cwd(), 'catalog');
  }
  return join(process.cwd(), 'catalog');
}

export { collectRunContextInput, checkEvidenceFreshness };

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/collect-run-context.mjs')) {
  main();
}
