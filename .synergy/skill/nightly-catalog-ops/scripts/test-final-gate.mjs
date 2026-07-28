#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  executeFinalGateOnce,
  runFinalGateSequence,
} from './run-final-gate.mjs';
import {
  computeGateResultDigest,
  TRUSTED_CHECKS,
  validateGateResultAgainstTrusted,
} from './lib/gate-checks.mjs';

const tests = [];
let failures = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function fakeRunner(results = {}) {
  const calls = [];
  return {
    calls,
    async run(request) {
      const script = request.args.at(-1);
      calls.push({ ...request, script });
      const configured = results[script] ?? {};
      return {
        exit_code: configured.exit_code ?? 0,
        duration_ms: configured.duration_ms ?? 1,
        stdout: configured.stdout ?? '',
        stderr: configured.stderr ?? '',
      };
    },
  };
}

function fixedClock() {
  const values = [
    new Date('2026-07-28T00:00:00.000Z'),
    new Date('2026-07-28T00:00:01.000Z'),
  ];
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

async function passingResult(overrides = {}) {
  const runner = fakeRunner();
  return runFinalGateSequence({
    runner: runner.run.bind(runner),
    runId: 'run_final-gate-test',
    contextDigest: 'a'.repeat(64),
    clock: fixedClock(),
    ...overrides,
  });
}

test('runs the exact trusted sequence with fixed npm and repository paths', async () => {
  const runner = fakeRunner();
  const result = await runFinalGateSequence({
    runner: runner.run.bind(runner),
    runId: 'run_exact-sequence',
    contextDigest: 'b'.repeat(64),
    clock: fixedClock(),
  });

  assert.equal(result.passed, true);
  assert.deepEqual(runner.calls.map((call) => call.script), TRUSTED_CHECKS.map((check) => check.script));
  for (const call of runner.calls) {
    assert.equal(call.command, 'npm');
    assert.equal(call.args[0], '--prefix');
    assert.ok(call.args[1].endsWith('/.synergy'));
    assert.equal(call.args[2], 'run');
    assert.ok(call.cwd.endsWith('/good-stuff-for-agents'));
  }
});

test('structural failure stops later commands and yields failing evidence', async () => {
  const runner = fakeRunner({ 'catalog:validate': { exit_code: 2 } });
  const result = await runFinalGateSequence({
    runner: runner.run.bind(runner),
    runId: 'run_structural-fail',
    contextDigest: 'c'.repeat(64),
    clock: fixedClock(),
  });
  assert.equal(result.passed, false);
  assert.equal(runner.calls.length, 1);
  assert.equal(result.checks.length, 1);
  assert.ok(validateGateResultAgainstTrusted(result).length > 0);
});

test('focused failure does not skip later focused checks', async () => {
  const runner = fakeRunner({ 'skill:extraction:test': { exit_code: 1 } });
  const result = await runFinalGateSequence({
    runner: runner.run.bind(runner),
    runId: 'run_focused-fail',
    contextDigest: 'd'.repeat(64),
    clock: fixedClock(),
  });
  assert.equal(result.passed, false);
  assert.equal(runner.calls.length, TRUSTED_CHECKS.length);
  assert.equal(result.checks.at(-1).name, TRUSTED_CHECKS.at(-1).name);
});

test('valid result is bound to exact run and context with canonical digest', async () => {
  const result = await passingResult();
  assert.equal(result.digest, computeGateResultDigest(result));
  assert.deepEqual(validateGateResultAgainstTrusted(result, {
    requireRunId: result.run_id,
    requireContextDigest: result.context_digest,
  }), []);
});

test('reordered, duplicated, or script-substituted checks are rejected', async () => {
  const result = await passingResult();

  const reordered = { ...result, checks: [...result.checks] };
  [reordered.checks[0], reordered.checks[1]] = [reordered.checks[1], reordered.checks[0]];
  reordered.digest = computeGateResultDigest(reordered);
  assert.ok(validateGateResultAgainstTrusted(reordered).some((error) => error.includes('expected name')));

  const duplicated = { ...result, checks: [...result.checks] };
  duplicated.checks[1] = duplicated.checks[0];
  duplicated.digest = computeGateResultDigest(duplicated);
  assert.ok(validateGateResultAgainstTrusted(duplicated).some((error) => error.includes('duplicate check')));

  const substituted = { ...result, checks: result.checks.map((check) => ({ ...check })) };
  substituted.checks[0].script = 'arbitrary:command';
  substituted.digest = computeGateResultDigest(substituted);
  assert.ok(validateGateResultAgainstTrusted(substituted).some((error) => error.includes('expected script')));
});

test('tampered pass state, exit code, or digest is rejected', async () => {
  const result = await passingResult();
  assert.ok(validateGateResultAgainstTrusted({ ...result, digest: '0'.repeat(64) }).some((error) => error.includes('digest_mismatch')));

  const failedCheck = { ...result, checks: result.checks.map((check) => ({ ...check })) };
  failedCheck.checks[0].passed = false;
  failedCheck.checks[0].exit_code = 1;
  failedCheck.digest = computeGateResultDigest(failedCheck);
  assert.ok(validateGateResultAgainstTrusted(failedCheck).some((error) => error.includes('did not pass')));

  const falsePass = { ...result, passed: false };
  falsePass.digest = computeGateResultDigest(falsePass);
  assert.ok(validateGateResultAgainstTrusted(falsePass).some((error) => error.includes('must pass')));
});

test('missing or extra checks are rejected', async () => {
  const result = await passingResult();
  const missing = { ...result, checks: result.checks.slice(0, -1) };
  missing.digest = computeGateResultDigest(missing);
  assert.ok(validateGateResultAgainstTrusted(missing).some((error) => error.includes('check_count')));

  const extra = { ...result, checks: [...result.checks, { ...result.checks[0], name: 'extra' }] };
  extra.digest = computeGateResultDigest(extra);
  assert.ok(validateGateResultAgainstTrusted(extra).some((error) => error.includes('check_count')));
});

test('run-scoped executor persists one result and rejects a second invocation', async () => {
  const runsRoot = mkdtempSync(join(tmpdir(), 'nightly-final-gate-'));
  const runner = fakeRunner();
  try {
    const first = await executeFinalGateOnce({
      runner: runner.run.bind(runner),
      runsRoot,
      runId: 'run_once-only',
      contextDigest: 'e'.repeat(64),
      clock: fixedClock(),
    });
    assert.equal(first.result.passed, true);
    assert.equal(first.result.invoked_count, 1);
    assert.ok(existsSync(first.resultPath));
    assert.equal(JSON.parse(readFileSync(first.resultPath, 'utf8')).digest, first.result.digest);
    await assert.rejects(() => executeFinalGateOnce({
      runner: runner.run.bind(runner),
      runsRoot,
      runId: 'run_once-only',
      contextDigest: 'e'.repeat(64),
      clock: fixedClock(),
    }), /final_gate_already_invoked/);
    assert.equal(runner.calls.length, TRUSTED_CHECKS.length);
  } finally {
    rmSync(runsRoot, { recursive: true, force: true });
  }
});

test('gate ID is deterministic for one run-context binding', async () => {
  const first = await passingResult();
  const second = await passingResult();
  assert.equal(first.gate_id, second.gate_id);
  assert.match(first.gate_id, /^gate_[a-f0-9]{16}$/u);
});

test('production CLI rejects arbitrary command and path arguments before execution', () => {
  const script = join(import.meta.dirname, 'run-final-gate.mjs');
  for (const args of [
    ['--run-id', 'run_cli-test', '--context-digest', 'f'.repeat(64), '--npm-path', '/tmp/evil'],
    ['--run-id', 'run_cli-test', '--context-digest', 'f'.repeat(64), '--prefix', '/tmp/evil'],
    ['--run-id', 'run_cli-test', '--context-digest', 'f'.repeat(64), '--unknown', 'value'],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unknown argument/);
  }
});

for (const { name, fn } of tests) {
  try {
    await fn();
    process.stdout.write(`ok - ${name}\n`);
  } catch (error) {
    failures += 1;
    process.stderr.write(`not ok - ${name}\n${error.stack}\n`);
  }
}

if (failures > 0) {
  process.stderr.write(`\n${failures}/${tests.length} final-gate test(s) failed\n`);
  process.exit(1);
}
process.stdout.write(`\n${tests.length} final-gate tests passed\n`);
