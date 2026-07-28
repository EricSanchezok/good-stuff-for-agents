#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { closeSync, openSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import {
  assertCatalogId,
  ensureDir,
  resolveWithin,
  ROOT,
  stableStringify,
  writeTextAtomic,
} from '../../catalog-data/scripts/lib/catalog-lib.mjs';
import {
  computeGateResultDigest,
  STRUCTURAL_CHECK_NAMES,
  TRUSTED_CHECKS,
} from './lib/gate-checks.mjs';

const SYNERGY_ROOT = join(ROOT, '.synergy');

async function main(args = process.argv.slice(2)) {
  const { runId, contextDigest } = parseArgs(args);
  const { result, resultPath } = await executeFinalGateOnce({ runId, contextDigest });
  const output = stableStringify({ result_path: resultPath, result });
  if (result.passed) {
    process.stdout.write(output);
    return;
  }
  process.stderr.write(output);
  process.exitCode = 1;
}

export async function executeFinalGateOnce({
  runId,
  contextDigest,
  runner = spawnRunner,
  runsRoot = resolveWithin(ROOT, 'catalog', 'runs'),
  clock = () => new Date(),
} = {}) {
  assertCatalogId('run', runId);
  assertDigest(contextDigest, 'contextDigest');

  const gateDirectory = resolveWithin(runsRoot, runId, 'final-gate');
  ensureDir(gateDirectory, runsRoot);
  const lockPath = resolveWithin(gateDirectory, 'invocation.lock');
  const resultPath = resolveWithin(gateDirectory, 'result.json');
  const gateId = deterministicGateId(runId, contextDigest);
  const lock = stableStringify({
    schema_version: 1,
    gate_id: gateId,
    run_id: runId,
    context_digest: contextDigest,
  });

  let descriptor;
  try {
    descriptor = openSync(lockPath, 'wx');
    writeFileSync(descriptor, lock, 'utf8');
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(`final_gate_already_invoked: ${runId}`);
    }
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }

  const result = await runFinalGateSequence({
    runner,
    runId,
    contextDigest,
    clock,
  });
  writeTextAtomic(resultPath, stableStringify(result), runsRoot);
  return Object.freeze({ result, resultPath });
}

export async function runFinalGateSequence({
  runner = spawnRunner,
  runId,
  contextDigest,
  clock = () => new Date(),
} = {}) {
  assertCatalogId('run', runId);
  assertDigest(contextDigest, 'contextDigest');

  const gateId = deterministicGateId(runId, contextDigest);
  const checks = [];
  let structuralPassed = true;
  const startedAt = clock().toISOString();
  const baseArgs = ['--prefix', SYNERGY_ROOT, 'run'];

  for (const check of TRUSTED_CHECKS.filter((candidate) => STRUCTURAL_CHECK_NAMES.has(candidate.name))) {
    const result = await invokeCheck(runner, check, baseArgs);
    checks.push(buildCheckEntry(check, result));
    if (result.exit_code !== 0) {
      structuralPassed = false;
      break;
    }
  }

  if (structuralPassed) {
    for (const check of TRUSTED_CHECKS.filter((candidate) => !STRUCTURAL_CHECK_NAMES.has(candidate.name))) {
      const result = await invokeCheck(runner, check, baseArgs);
      checks.push(buildCheckEntry(check, result));
    }
  }

  const finishedAt = clock().toISOString();
  const passed = checks.length === TRUSTED_CHECKS.length && checks.every((check) => check.passed);
  const result = {
    gate_id: gateId,
    run_id: runId,
    context_digest: contextDigest,
    passed,
    invoked_count: 1,
    started_at: startedAt,
    finished_at: finishedAt,
    checks,
    _single_invocation: true,
  };
  return Object.freeze({ ...result, digest: computeGateResultDigest(result) });
}

function invokeCheck(runner, check, baseArgs) {
  return Promise.resolve(runner({
    command: 'npm',
    args: [...baseArgs, check.script],
    cwd: ROOT,
  })).catch((error) => ({
    exit_code: 127,
    duration_ms: 0,
    stdout: '',
    stderr: error?.message ?? String(error),
  }));
}

function spawnRunner({ command, args, cwd }) {
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = '';
    let stderr = '';
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      resolve({ exit_code: 127, duration_ms: Date.now() - started, stdout, stderr: error.message });
    });
    child.on('close', (exitCode) => {
      resolve({
        exit_code: Number.isInteger(exitCode) ? exitCode : 127,
        duration_ms: Date.now() - started,
        stdout: stdout.slice(-4096),
        stderr: stderr.slice(-4096),
      });
    });
  });
}

function buildCheckEntry(check, result) {
  return {
    name: check.name,
    script: check.script,
    passed: result.exit_code === 0,
    exit_code: result.exit_code,
    duration_ms: Number.isInteger(result.duration_ms) && result.duration_ms >= 0 ? result.duration_ms : 0,
  };
}

function parseArgs(argv) {
  const allowed = new Set(['--run-id', '--context-digest']);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(flag)) throw new Error(`Unknown argument: ${flag ?? '<missing>'}`);
    if (values.has(flag)) throw new Error(`Duplicate argument: ${flag}`);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    values.set(flag, value);
  }
  if (argv.length % 2 !== 0) throw new Error(`Missing value for ${argv.at(-1)}`);
  const runId = values.get('--run-id');
  const contextDigest = values.get('--context-digest');
  if (!runId || !contextDigest) throw new Error('Required arguments: --run-id <run_id> --context-digest <sha256>');
  assertCatalogId('run', runId);
  assertDigest(contextDigest, 'contextDigest');
  return { runId, contextDigest };
}

function deterministicGateId(runId, contextDigest) {
  return `gate_${createHash('sha256').update(`${runId}\0${contextDigest}`).digest('hex').slice(0, 16)}`;
}

function assertDigest(value, label) {
  if (!/^[a-f0-9]{64}$/u.test(value ?? '')) throw new Error(`${label} must be a lowercase SHA-256 digest`);
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/run-final-gate.mjs');
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`final-gate-fatal: ${error.message}\n`);
    process.exitCode = 2;
  });
}
