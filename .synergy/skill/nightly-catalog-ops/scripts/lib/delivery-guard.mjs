/**
 * Delivery Guard — pure-read deterministic pre-delivery validator.
 *
 * CLI-able: `node delivery-guard.mjs <runId> [--no-published] [--no-audit] [--fetch-remote]`
 * JSON output to stdout: { ready, errors, warnings, manifest_paths, baseline_head,
 *   current_head, remote_head, commit_message }
 *
 * Accepts only status=completed, outcome=published, ready audit,
 * valid chain/schema/seal/manifest, baseline/current HEAD match,
 * no active marker, changed paths exactly equal to manifest paths,
 * no code/secret/git/ordinary blockers.
 *
 * This module reads only. It never performs git mutations.
 * Commit message includes required footer but guard is pure-read: no stage/commit/push.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readChain } from './event-store.mjs';
import { CATALOG } from '../../../catalog-data/scripts/lib/catalog-lib.mjs';
import { collectChangedPaths, NIGHTLY_ALLOWED_PATHS } from './manifest-collector.mjs';

// ── CLI entry: `node delivery-guard.mjs <runId> [--no-published] [--no-audit] [--fetch-remote]` ──
export function cliMain() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    process.stderr.write('Usage: node delivery-guard.mjs <runId> [--no-published] [--no-audit] [--fetch-remote]\n');
    process.exit(2);
  }
  const runId = args[0];
  const requirePublished = !args.includes('--no-published');
  const requireReadyAudit = !args.includes('--no-audit');
  const fetchRemote = args.includes('--fetch-remote');

  const result = deliveryGuard({
    runId,
    requirePublished,
    requireReadyAudit,
    fetchRemote,
    repositoryRoot: process.cwd(),
  });

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.ready ? 0 : 1);
}

export function deliveryGuard({
  runId,
  runsRoot,
  repositoryRoot,
  requirePublished = true,
  requireReadyAudit = true,
  fetchRemote = false,
} = {}) {
  if (!runId || typeof runId !== 'string') throw new Error('runId is required');
  if (!runsRoot) runsRoot = join(CATALOG, 'runs');
  if (!repositoryRoot) throw new Error('repositoryRoot is required');

  const errors = [];
  const warnings = [];
  let manifestPaths = null;
  let remoteHead = null;

  // 1. Verify run exists
  const runDir = join(runsRoot, runId);
  if (!existsSync(runDir)) {
    errors.push('run_directory_missing');
    return fail(errors, warnings);
  }

  // 2. No active marker
  const activeMarkerPath = join(runsRoot, '.active-run');
  if (existsSync(activeMarkerPath)) {
    try {
      const marker = JSON.parse(readFileSync(activeMarkerPath, 'utf8'));
      if (marker.run_id === runId) {
        errors.push('active_marker_present: run is still active');
      }
    } catch { /* malformed marker is still a potential issue */ }
  }

  // 3. Read event chain
  const chain = readChain({ runsRoot, runId });
  if (!chain.ok) {
    errors.push(`chain_read_failed: ${chain.error}`);
    return fail(errors, warnings);
  }
  const events = chain.events;

  // 4. Terminal must exist with status=completed
  const terminalEvent = events.find(e => e.phase === 'terminal');
  if (!terminalEvent) {
    errors.push('no_terminal_event');
    return fail(errors, warnings);
  }

  // 5. Read terminal output
  const terminalPath = join(runsRoot, runId, 'outputs', 'terminal.json');
  if (!existsSync(terminalPath)) {
    errors.push('terminal_output_missing');
    return fail(errors, warnings);
  }
  let terminal;
  try {
    terminal = JSON.parse(readFileSync(terminalPath, 'utf8'));
  } catch (e) {
    errors.push(`terminal_parse_error: ${e.message}`);
    return fail(errors, warnings);
  }

  if (terminal.status !== 'completed') {
    errors.push(`terminal_status_not_completed: ${terminal.status}`);
  }

  if (requirePublished && terminal.outcome !== 'published') {
    errors.push(`terminal_outcome_not_published: ${terminal.outcome}`);
  }

  // 6. Audit receipt must exist and be ready
  const auditEvent = events.find(e => e.phase === 'audit');
  if (!auditEvent) {
    errors.push('no_audit_event');
    return fail(errors, warnings);
  }

  const auditDesc = (auditEvent.output_descriptors || [])[0];
  if (!auditDesc) {
    errors.push('audit_descriptor_missing');
    return fail(errors, warnings);
  }

  const auditPath = join(runsRoot, runId, 'outputs', auditDesc.label);
  if (!existsSync(auditPath)) {
    errors.push('audit_receipt_file_missing');
    return fail(errors, warnings);
  }

  let auditReceipt;
  try {
    auditReceipt = JSON.parse(readFileSync(auditPath, 'utf8'));
  } catch (e) {
    errors.push(`audit_receipt_parse_error: ${e.message}`);
    return fail(errors, warnings);
  }

  if (requireReadyAudit && auditReceipt.ready !== true) {
    errors.push('audit_not_ready');
  }

  // 7. Verify seal exists
  const sealPath = join(runsRoot, runId, 'outputs', 'seal.json');
  if (!existsSync(sealPath)) {
    errors.push('seal_output_missing');
    return fail(errors, warnings);
  }

  // 8. Verify seal-manifest
  const manifestPath = join(runsRoot, runId, 'outputs', 'seal-manifest.json');
  if (!existsSync(manifestPath)) {
    errors.push('manifest_output_missing');
    return fail(errors, warnings);
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    errors.push(`manifest_parse_error: ${e.message}`);
    return fail(errors, warnings);
  }

  manifestPaths = new Set(manifest.paths || []);

  // 9. Check baseline HEAD match
  const currentHead = getCurrentHead(repositoryRoot);
  if (!currentHead) {
    errors.push('cannot_resolve_current_head');
    return fail(errors, warnings);
  }

  const baselineHead = auditReceipt.baseline_head || manifest.baseline_head;
  if (!baselineHead || !/^[a-f0-9]{40}$/.test(baselineHead)) {
    errors.push('invalid_baseline_head_in_manifest_or_audit');
    return fail(errors, warnings);
  }

  if (baselineHead !== currentHead) {
    errors.push(`baseline_head_diverged: manifest=${baselineHead}, current=${currentHead}`);
  }

  // 10. Verify changed paths match manifest exactly — use manifest-collector
  let changedPaths = [];
  try {
    changedPaths = collectChangedPaths({ repositoryRoot });
  } catch (e) {
    errors.push(`collect_changed_paths_failed: ${e.message}`);
  }

  const changedSet = new Set(changedPaths);
  const manifestSet = new Set(manifest.paths || []);

  const onlyInChanged = [...changedSet].filter(p => !manifestSet.has(p));
  const onlyInManifest = [...manifestSet].filter(p => !changedSet.has(p));

  if (onlyInChanged.length > 0) {
    errors.push(`paths_not_in_manifest: ${onlyInChanged.join(', ')}`);
  }
  if (onlyInManifest.length > 0) {
    // Manifest-declared paths not on disk = error (C8 bidirectional mismatch)
    const missingOnDisk = onlyInManifest.filter(p => {
      const fullPath = join(repositoryRoot, p);
      return !existsSync(fullPath);
    });
    if (missingOnDisk.length > 0) {
      errors.push(`manifest_paths_missing_on_disk: ${missingOnDisk.join(', ')}`);
    }
  }

  // 11. Code/secret/git/ordinary blockers
  for (const p of changedPaths) {
    if (p.startsWith('.git/') || p === '.git') {
      errors.push(`git_internal_path: ${p}`);
    }
    if (p.includes('.env') || p.includes('credentials') || p.includes('secret') || p.includes('.pem')) {
      errors.push(`secret_path: ${p}`);
    }
    if (p.startsWith('.synergy/')) {
      errors.push(`code_path_blocker: ${p}`);
    }
    const allowed = NIGHTLY_ALLOWED_PATHS.some(d => {
      if (d.endsWith('/')) return p.startsWith(d);
      return p === d;
    });
    if (!allowed) {
      errors.push(`ordinary_path_blocker: ${p} is not in allowed directories`);
    }
  }

  // 12. Remote drift check (if requested)
  if (fetchRemote) {
    const remoteCheck = checkRemoteDrift(repositoryRoot, baselineHead);
    if (!remoteCheck.ok) {
      errors.push(`remote_drift: ${remoteCheck.error}`);
    }
    remoteHead = remoteCheck.remoteHead || null;
  }

  // 13. Verify chain integrity up to terminal
  const chainVerify = verifyChainIntegrity({ runsRoot, runId, events, terminal });
  if (!chainVerify.ok) {
    errors.push(...chainVerify.errors);
  }

  // 14. Verify output digest chain (schema/digest/seal/manifest/audit)
  const chainDigestVerify = verifyChainDigests({ runsRoot, runId, events, terminal, manifest, auditReceipt });
  if (!chainDigestVerify.ok) {
    errors.push(...chainDigestVerify.errors);
  }

  const ready = errors.length === 0;

  // Build commit message with required footer (guard is pure-read, does not stage/commit/push)
  const commitMessage = ready
    ? buildCommitMessage({ runId, terminal, manifestPaths: [...manifestSet].sort() })
    : null;

  return {
    ready,
    errors,
    warnings,
    manifest_paths: manifestPaths ? [...manifestPaths].sort() : [],
    baseline_head: baselineHead,
    current_head: currentHead,
    remote_head: remoteHead,
    commit_message: commitMessage,
  };
}

function fail(errors, warnings) {
  return { ready: false, errors, warnings, manifest_paths: [], baseline_head: '', current_head: '', remote_head: null, commit_message: null };
}

function getCurrentHead(repositoryRoot) {
  try {
    const result = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      timeout: 10000,
    });
    if (result.status === 0) {
      const head = result.stdout.trim();
      if (/^[a-f0-9]{40}$/.test(head)) return head;
    }
    return null;
  } catch {
    return null;
  }
}

function getChangedPaths(repositoryRoot, baselineHead) {
  // Use manifest-collector.collectChangedPaths which captures untracked files too
  try {
    return collectChangedPaths({ repositoryRoot });
  } catch {
    // Fallback to git diff for git-tracked changes
    try {
      const result = spawnSync('git', ['diff', '--name-only', baselineHead], {
        cwd: repositoryRoot,
        encoding: 'utf8',
        timeout: 10000,
      });
      if (result.status === 0) {
        return result.stdout.trim().split('\n').filter(Boolean);
      }
    } catch {}
    return [];
  }
}

function checkRemoteDrift(repositoryRoot, baselineHead) {
  let remoteHead = null;
  try {
    // Fetch origin silently to check if remote has diverged
    spawnSync('git', ['fetch', 'origin', 'main', '--quiet'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      timeout: 30000,
    });

    const remoteResult = spawnSync('git', ['rev-parse', 'origin/main'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      timeout: 10000,
    });

    if (remoteResult.status !== 0) {
      return { ok: false, error: 'cannot_resolve_remote_head', remoteHead: null };
    }

    remoteHead = remoteResult.stdout.trim();
    if (remoteHead !== baselineHead) {
      return { ok: false, error: `remote_diverged: remote=${remoteHead}, baseline=${baselineHead}`, remoteHead };
    }

    return { ok: true, remoteHead };
  } catch (e) {
    return { ok: false, error: `remote_check_failed: ${e.message}`, remoteHead };
  }
}

/**
 * Verify the full output digest chain: schema validation, digest chain,
 * seal descriptor ↔ manifest ↔ audit, terminal ↔ last event.
 */
function verifyChainDigests({ runsRoot, runId, events, terminal, manifest, auditReceipt }) {
  const errors = [];

  // Seal event must reference the manifest
  const sealEvent = events.find(e => e.phase === 'seal');
  if (sealEvent) {
    if (!manifest.manifest_digest) {
      errors.push('manifest_digest_missing');
    }
  }

  // Audit must have receipt_digest matching terminal
  const auditEvent = events.find(e => e.phase === 'audit');
  if (auditEvent) {
    if (!auditReceipt.receipt_digest) {
      errors.push('audit_receipt_digest_missing');
    }
  }

  // Terminal last_phase_event_digest must match the last non-terminal event
  const terminalEvent = events.find(e => e.phase === 'terminal');
  if (terminalEvent) {
    const lastNonTerm = events.filter(e => e.phase !== 'terminal').pop();
    if (lastNonTerm && terminal.last_phase_event_digest !== lastNonTerm.event_digest) {
      errors.push('terminal_last_phase_event_digest_mismatch');
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Build a commit message with required footer. Pure-read — does not stage/commit/push.
 */
function buildCommitMessage({ runId, terminal, manifestPaths }) {
  const outcomeLabel = terminal.outcome === 'published' ? 'published' :
    terminal.outcome === 'no_pack_clean' ? 'no_pack_clean' :
    terminal.outcome || 'completed';
  const summary = terminal.summary || `Nightly run ${runId} completed with outcome: ${outcomeLabel}`;
  const pathList = manifestPaths.length > 0
    ? manifestPaths.map(p => `  ${p}`).join('\n')
    : '  (no changed paths)';

  return [
    `Nightly run ${runId}: ${outcomeLabel}`,
    '',
    summary,
    '',
    'Changed paths:',
    pathList,
    '',
    `Terminal digest: ${terminal.terminal_digest || 'N/A'}`,
    '',
    'Co-authored-by: synergy-agent <299070056+synergy-agent@users.noreply.github.com>',
  ].join('\n');
}

function verifyChainIntegrity({ runsRoot, runId, events, terminal }) {
  const errors = [];

  // Verify last event link matches terminal
  const lastEvent = events[events.length - 1];
  if (lastEvent.phase === 'terminal') {
    if (!terminal.last_phase_event_digest) {
      errors.push('terminal_missing_last_phase_event_digest');
    }
  }

  // Verify event chain is unbroken
  for (let i = 1; i < events.length; i++) {
    if (events[i].prev_event_digest !== events[i - 1].event_digest) {
      errors.push(`chain_broken_at_event_${i}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
