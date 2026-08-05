/**
 * Manifest collector — reads git porcelain to produce exact current path set.
 *
 * Collects staged, unstaged, and untracked paths via `git status --porcelain -z --untracked-files=all`.
 * Adds pre-declared future paths (seal event output, audit receipt/event, terminal output/event, report).
 * Paths are sorted, unique, and validated against allowlist for normal nightly runs.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { canonicalStringify } from './phase-state-machine.mjs';

export const NIGHTLY_ALLOWED_PATHS = Object.freeze(['catalog/', 'docs/', 'reports/', 'assets/', 'README.md']);

export function collectChangedPaths({ repositoryRoot }) {
  const result = spawnSync('git', ['status', '--porcelain', '-z', '--untracked-files=all'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout: 15000,
  });

  if (result.status !== 0) {
    throw new Error(`git status --porcelain -z failed: ${result.stderr || result.status}`);
  }

  const paths = new Set();
  const output = result.stdout;
  // -z format: each record is "XY <path>\0"; rename/copy records emit a
  // second bare "<source-path>\0" field. The 3-char "XY " prefix must be
  // stripped from every status field; the bare rename source field is
  // already a plain path.
  const fields = output.split('\0').filter(Boolean);
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const isRenameOrCopy = field[0] === 'R' || field[0] === 'C';
    const path = field.length > 3 ? field.slice(3) : '';
    if (path) paths.add(path);
    if (isRenameOrCopy && i + 1 < fields.length) {
      const source = fields[i + 1];
      if (source) paths.add(source);
      i++;
    }
  }

  // The controller's runtime active-marker is internal state, never a
  // deliverable. Exclude it even when it is not gitignored so it can
  // never leak into a seal manifest.
  const filtered = [...paths].filter((p) => !p.endsWith('.active-run') && !p.includes('/.active-run'));

  return filtered.sort();
}

export function buildManifestV3({
  baselineHead,
  changedPaths,
  futurePaths,
  ledgerDigest,
  summaryDigest,
}) {
  // Merge current + future paths
  const allPaths = new Set(changedPaths);
  for (const fp of futurePaths) {
    allPaths.add(fp);
  }

  const sortedPaths = [...allPaths].sort();

  const manifest = {
    schema_version: 3,
    baseline_head: baselineHead,
    ledger_digest: ledgerDigest,
    summary_digest: summaryDigest,
    paths: sortedPaths,
  };

  const { manifest_digest, ...rest } = manifest;
  manifest.manifest_digest = `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;

  return Object.freeze(manifest);
}

export function checkAuditPaths({ changedPaths, allowedDirs = NIGHTLY_ALLOWED_PATHS }) {
  const errors = [];
  const warnings = [];

  for (const p of changedPaths) {
    // .git/ paths
    if (p.startsWith('.git/') || p === '.git') {
      errors.push(`git_internal_path: ${p}`);
      continue;
    }

    // Secret-like paths
    if (p.includes('.env') || p.includes('credentials') || p.includes('secret') || p.includes('.pem')) {
      errors.push(`secret_path: ${p}`);
      continue;
    }

    // .synergy/ code changes => audit blocker
    if (p.startsWith('.synergy/')) {
      errors.push(`code_path_blocker: ${p}`);
      continue;
    }

    // Check against allowlisted dirs
    const allowed = allowedDirs.some(d => {
      if (d.endsWith('/')) return p.startsWith(d);
      return p === d;
    });

    if (!allowed) {
      errors.push(`ordinary_path_blocker: ${p} is not in allowed directories`);
    }
  }

  return { ready: errors.length === 0, errors, warnings };
}
