import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertSafeContainedPathForWrite,
  CATALOG,
} from '../../../catalog-data/scripts/lib/catalog-lib.mjs';
import {
  appendPhaseEvent,
  readChain,
  eventsDir,
  outputsDir,
  publishOutput,
} from './event-store.mjs';
import { validateBaseline, serializeBaseline } from './phase-state-machine.mjs';

const RUNS_ROOT = join(CATALOG, 'runs');

/**
 * Reserve a run directory atomically and write the init event with baseline evidence.
 *
 * The `baseline` object must include:
 *   - head_sha: 40-char hex string (HEAD commit)
 *   - branch: non-empty string
 *   - upstream: string or absent
 *   - worktree_clean: must be true
 *
 * The baseline is serialized internally and published as the init output.
 * Callers must NOT pass a separate `initContent` — the baseline is the truth.
 *
 * @param {object} opts
 * @param {string} [opts.runsRoot]
 * @param {string} opts.runId
 * @param {object} opts.baseline - { head_sha, branch, upstream?, worktree_clean }
 * @param {string} [opts.timestamp]
 * @returns {{ event: object, output: object }}
 */
export function reserveRun({ runsRoot, runId, baseline, timestamp } = {}) {
  if (!runId || typeof runId !== 'string') throw new Error('runId is required');
  if (!baseline || typeof baseline !== 'object') throw new Error('baseline is required');

  const check = validateBaseline(baseline);
  if (!check.ok) throw new Error(`invalid_baseline: ${check.error}`);

  if (!runsRoot) runsRoot = RUNS_ROOT;

  const runDir = join(runsRoot, runId);
  const safeDir = assertSafeContainedPathForWrite(runsRoot, runDir);

  try {
    mkdirSync(safeDir);
  } catch (e) {
    if (e.code === 'EEXIST') {
      throw new Error(`run_already_reserved: run ${runId} directory already exists`);
    }
    throw e;
  }

  mkdirSync(eventsDir(runsRoot, runId));
  mkdirSync(outputsDir(runsRoot, runId));

  const initContent = serializeBaseline(baseline);

  const initOutput = publishOutput({
    runsRoot,
    runId,
    name: 'init-evidence.json',
    content: initContent,
  });

  const event = appendPhaseEvent({
    runsRoot,
    runId,
    phase: 'init',
    outputDescriptors: [{
      label: initOutput.label,
      digest: initOutput.digest,
      byte_length: initOutput.byte_length,
      repo_relative_path: initOutput.repo_relative_path,
    }],
    inputDigests: [],
    timestamp,
  });

  return Object.freeze({ event, output: initOutput });
}

export function isRunReserved({ runsRoot, runId } = {}) {
  if (!runsRoot) runsRoot = RUNS_ROOT;
  if (!runId) throw new Error('runId is required');
  return existsSync(join(runsRoot, runId));
}

export function readRunPhase({ runsRoot, runId } = {}) {
  if (!runsRoot) runsRoot = RUNS_ROOT;
  if (!runId) throw new Error('runId is required');

  const chainResult = readChain({ runsRoot, runId });
  if (!chainResult.ok) {
    if (chainResult.error === 'no_events_directory') {
      throw new Error(`run_not_reserved: run ${runId} has no events directory`);
    }
    throw new Error(`chain_corrupted: ${chainResult.error}`);
  }

  return {
    runId,
    initEvent: chainResult.events[0],
    events: chainResult.events,
    currentPhase: chainResult.lastEvent.phase,
    eventCount: chainResult.events.length,
  };
}
