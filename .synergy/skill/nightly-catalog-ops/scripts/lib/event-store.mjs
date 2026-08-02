import { writeFileSync, linkSync, unlinkSync, readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join, relative } from 'node:path';
import {
  assertSafeContainedPathForWrite,
  CATALOG,
} from '../../../catalog-data/scripts/lib/catalog-lib.mjs';
import {
  buildEvent,
  validateTransition,
  validateChain,
  validateDescriptorShape,
  validateDigest,
  validateTerminalOutput,
  computeEventDigest,
  computeContentDigest,
  canonicalStringify,
} from './phase-state-machine.mjs';
import {
  validateAgainstSchema,
  phaseEventSchemaV3,
} from '../../../catalog-data/scripts/lib/schema-validators.mjs';

const RUNS_ROOT = join(CATALOG, 'runs');

export { RUNS_ROOT };

export function eventsDir(runsRoot, runId) {
  return join(runsRoot, runId, 'events');
}

export function outputsDir(runsRoot, runId) {
  return join(runsRoot, runId, 'outputs');
}

export function eventPath(runsRoot, runId, index, phase) {
  return join(eventsDir(runsRoot, runId), `${index}-${phase}.json`);
}

function atomicWriteFile(targetPath, content) {
  const dir = join(targetPath, '..');
  mkdirSync(dir, { recursive: true });

  const tmpName = `.tmp-${randomUUID()}`;
  const tmpPath = join(dir, tmpName);

  writeFileSync(tmpPath, content, { flag: 'wx' });

  try {
    linkSync(tmpPath, targetPath);
  } catch (e) {
    try { unlinkSync(tmpPath); } catch (_) { /* best effort */ }
    if (e.code === 'EEXIST') {
      throw Object.assign(new Error('EEXIST: target already exists on disk'), { code: 'EEXIST' });
    }
    throw e;
  }

  try { unlinkSync(tmpPath); } catch (_) { /* best effort */ }
}

export function publishOutput({ runsRoot, runId, name, content, repositoryRoot }) {
  if (!runsRoot) runsRoot = RUNS_ROOT;
  if (!content) throw new Error('content is required');
  if (typeof name !== 'string' || name.length === 0) throw new Error('name must be a non-empty string');
  if (name.includes('/') || name.includes('\\')) throw new Error(`name must not contain path separators: ${name}`);

  const dir = outputsDir(runsRoot, runId);
  const targetPath = join(dir, name);
  assertSafeContainedPathForWrite(runsRoot, targetPath);

  const contentBytes = typeof content === 'string' ? content : content;
  atomicWriteFile(targetPath, contentBytes);

  const digest = computeContentDigest(contentBytes);
  const byteLength = Buffer.byteLength(contentBytes);

  let repoRelativePath;
  if (repositoryRoot) {
    repoRelativePath = relative(repositoryRoot, targetPath);
  } else {
    repoRelativePath = relative(join(runsRoot, '..', '..'), targetPath);
  }

  return Object.freeze({ label: name, path: targetPath, repo_relative_path: repoRelativePath, digest, byte_length: byteLength });
}

export function verifyOutputByDescriptor({ runsRoot, runId, label, digest, byte_length, repo_relative_path }) {
  if (!runsRoot) runsRoot = RUNS_ROOT;

  const shapeCheck = validateDescriptorShape({ label, digest, byte_length, repo_relative_path });
  if (!shapeCheck.ok) return { ok: false, error: `bad_descriptor: ${shapeCheck.error}` };

  const dir = outputsDir(runsRoot, runId);
  const target = join(dir, label);

  if (!existsSync(target)) {
    return { ok: false, error: `output_missing: ${label}` };
  }

  const bytes = readFileSync(target);
  const actual = computeContentDigest(bytes);

  if (actual !== digest) {
    return { ok: false, error: `output_digest_mismatch: ${label} expected ${digest}, got ${actual}` };
  }

  if (bytes.length !== byte_length) {
    return { ok: false, error: `output_length_mismatch: ${label} expected ${byte_length} bytes, got ${bytes.length}` };
  }

  return { ok: true, digest: actual, byte_length: bytes.length };
}

export function writeEventFile({ runsRoot, runId, event }) {
  if (!runsRoot) runsRoot = RUNS_ROOT;
  const path = eventPath(runsRoot, runId, event.event_index, event.phase);
  const target = assertSafeContainedPathForWrite(runsRoot, path);
  const content = canonicalStringify(event) + '\n';
  atomicWriteFile(target, content);
  return target;
}

export function readEventFile(eventFilePath) {
  if (!existsSync(eventFilePath)) return null;
  const raw = readFileSync(eventFilePath, 'utf8');
  try {
    const event = JSON.parse(raw);
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      throw new Error('Invalid event file: not a JSON object');
    }
    return event;
  } catch (e) {
    if (e.message.startsWith('Invalid event')) throw e;
    throw new Error(`Malformed event file ${eventFilePath}: ${e.message}`);
  }
}

export function readChain({ runsRoot, runId, verifyOutputs = false }) {
  if (!runsRoot) runsRoot = RUNS_ROOT;
  const dir = eventsDir(runsRoot, runId);
  if (!existsSync(dir)) {
    return { ok: false, error: 'no_events_directory' };
  }

  const files = readdirSync(dir)
    .filter(f => f.endsWith('.json') && /^\d+-/.test(f))
    .sort((a, b) => {
      const ai = parseInt(a.split('-')[0], 10);
      const bi = parseInt(b.split('-')[0], 10);
      return ai - bi;
    });

  const events = [];
  for (const file of files) {
    const event = readEventFile(join(dir, file));
    if (!event) {
      return { ok: false, error: `missing_event_file: ${file}` };
    }
    events.push(event);
  }

  const verifyFn = verifyOutputs
    ? (desc) => verifyOutputByDescriptor({ runsRoot, runId, ...desc })
    : undefined;

  const result = validateChain(events, { verifyOutput: verifyFn });
  if (!result.ok) return result;

  return { ok: true, events: result.events, lastEvent: events[events.length - 1] };
}

export function appendPhaseEvent({ runsRoot, runId, phase, outputDescriptors, inputDigests, timestamp } = {}) {
  if (!runsRoot) runsRoot = RUNS_ROOT;
  if (!runId || typeof runId !== 'string') throw new Error('runId is required');
  if (!phase || typeof phase !== 'string') throw new Error('phase is required');

  if (phase === 'terminal') {
    throw new Error('use_appendTerminalEvent_for_terminal: terminal phase requires terminal output validation');
  }

  _validateDescriptors(outputDescriptors, inputDigests);

  const chainResult = readChain({ runsRoot, runId });
  let prevEvent = null;
  let currentPhase = null;

  if (chainResult.ok) {
    prevEvent = chainResult.lastEvent;
    currentPhase = prevEvent.phase;
  } else if (chainResult.error === 'no_events_directory' || chainResult.error.startsWith('empty_chain')) {
    if (phase !== 'init') {
      throw new Error(`first_event_must_be_init: attempted ${phase}`);
    }
  } else {
    throw new Error(`chain_corrupted: ${chainResult.error}`);
  }

  if (currentPhase === phase) {
    throw new Error(`event_already_exists: ${phase} event already written for run ${runId}`);
  }

  const transition = validateTransition(currentPhase, phase);
  if (!transition.ok) throw new Error(transition.error);

  const event = buildEvent({
    runId, phase, timestamp, prevEvent,
    outputDescriptors: outputDescriptors || [],
    inputDigests: inputDigests || [],
  });

  // Validate phase event against v3 schema before writing
  const schemaCheck = validateAgainstSchema(event, phaseEventSchemaV3);
  if (!schemaCheck.ok) {
    throw new Error(`phase_event_schema_invalid: ${schemaCheck.errors.join('; ')}`);
  }

  writeEventFile({ runsRoot, runId, event });
  return event;
}

export function appendTerminalEvent({ runsRoot, runId, outputDescriptors, inputDigests, timestamp } = {}) {
  if (!runsRoot) runsRoot = RUNS_ROOT;
  if (!runId || typeof runId !== 'string') throw new Error('runId is required');

  _validateDescriptors(outputDescriptors, inputDigests);

  const chainResult = readChain({ runsRoot, runId });
  if (!chainResult.ok) throw new Error(`chain_corrupted: ${chainResult.error}`);

  const prevEvent = chainResult.lastEvent;
  const currentPhase = prevEvent.phase;

  if (currentPhase === 'terminal') {
    throw new Error(`terminal_closure: run ${runId} is already terminal`);
  }

  if (!outputDescriptors || outputDescriptors.length === 0) {
    throw new Error('terminal_output_required: appendTerminalEvent requires at least one output descriptor');
  }

  const termDesc = outputDescriptors[0];
  const termDisk = verifyOutputByDescriptor({ runsRoot, runId, ...termDesc });
  if (!termDisk.ok) {
    throw new Error(`terminal_output_verification_failed: ${termDisk.error}`);
  }

  const termBytes = readFileSync(join(outputsDir(runsRoot, runId), termDesc.label));
  let terminalOutput;
  try {
    terminalOutput = JSON.parse(termBytes);
  } catch (e) {
    throw new Error(`terminal_output_invalid_json: ${e.message}`);
  }

  const termValidation = validateTerminalOutput(currentPhase, terminalOutput);
  if (!termValidation.ok) throw new Error(termValidation.error);

  if (typeof terminalOutput.last_phase_event_digest !== 'string' || terminalOutput.last_phase_event_digest !== prevEvent.event_digest) {
    throw new Error(`terminal_last_phase_event_digest_mismatch: expected ${prevEvent.event_digest}, got ${terminalOutput.last_phase_event_digest}`);
  }

  {
    const { terminal_digest, ...rest } = terminalOutput;
    const expected = `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;
    if (terminalOutput.terminal_digest !== expected) {
      throw new Error(`terminal_digest_mismatch: expected ${expected}, got ${terminalOutput.terminal_digest}`);
    }
  }

  if (terminalOutput.status === 'completed' || terminalOutput.status === 'audit_blocked') {
    const auditEv = chainResult.events.findLast(e => e.phase === 'audit');
    if (!auditEv || auditEv.output_descriptors.length === 0) {
      throw new Error('terminal_audit_receipt_required: completed/audit_blocked status requires audit phase with bound output descriptor');
    }
    const auditDesc = auditEv.output_descriptors[0];
    const auditDisk = verifyOutputByDescriptor({ runsRoot, runId, ...auditDesc });
    if (!auditDisk.ok) {
      throw new Error(`terminal_audit_receipt_verification_failed: ${auditDisk.error}`);
    }
    const auditBytes = readFileSync(join(outputsDir(runsRoot, runId), auditDesc.label));
    let auditReceipt;
    try { auditReceipt = JSON.parse(auditBytes); } catch (_) { auditReceipt = null; }
    if (!auditReceipt) {
      throw new Error('terminal_audit_receipt_invalid_json');
    }
    if (terminalOutput.status === 'completed' && auditReceipt.ready !== true) {
      throw new Error('terminal_completed_requires_audit_ready: audit receipt ready must be true');
    }
    if (terminalOutput.status === 'audit_blocked' && auditReceipt.ready !== false) {
      throw new Error('terminal_audit_blocked_requires_audit_not_ready: audit receipt ready must be false');
    }
  }

  const transition = validateTransition(currentPhase, 'terminal');
  if (!transition.ok) throw new Error(transition.error);

  const event = buildEvent({
    runId, phase: 'terminal', timestamp, prevEvent,
    outputDescriptors: outputDescriptors || [],
    inputDigests: inputDigests || [],
  });

  writeEventFile({ runsRoot, runId, event });
  return event;
}

export function verifyEventFileOnDisk(eventFilePath) {
  const event = readEventFile(eventFilePath);
  if (!event) return { ok: false, error: 'event_file_not_found' };
  const computed = computeEventDigest(event);
  if (computed !== event.event_digest) {
    return { ok: false, error: `digest_mismatch: computed ${computed}, stored ${event.event_digest}` };
  }
  return { ok: true };
}

export function verifyAllEventFiles({ runsRoot, runId }) {
  if (!runsRoot) runsRoot = RUNS_ROOT;
  const dir = eventsDir(runsRoot, runId);
  if (!existsSync(dir)) return { ok: false, error: 'no_events_directory', count: 0 };
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.json') && /^\d+-/.test(f))
    .sort();
  let count = 0;
  for (const file of files) {
    const result = verifyEventFileOnDisk(join(dir, file));
    if (!result.ok) return { ok: false, error: `${file}: ${result.error}`, count };
    count++;
  }
  return { ok: true, count };
}

export function eventExists({ runsRoot, runId, phase }) {
  if (!runsRoot) runsRoot = RUNS_ROOT;
  const dir = eventsDir(runsRoot, runId);
  if (!existsSync(dir)) return false;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch { return false; }
  // Only regular .json files matching the <index>-<phase>.json naming pattern
  const files = entries.filter(f => {
    if (!f.endsWith('.json')) return false;
    // Must match the expected naming convention: <index>-<phase>.json
    if (!/^\d+-/.test(f)) return false;
    // Skip temp files and directories
    try {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) return false;
      return true;
    } catch { return false; }
  });
  for (const file of files) {
    const event = readEventFile(join(dir, file));
    if (event && event.phase === phase) return true;
  }
  return false;
}

function _validateDescriptors(outputDescriptors, inputDigests) {
  if (outputDescriptors) {
    if (!Array.isArray(outputDescriptors)) throw new Error('outputDescriptors must be an array');
    for (let i = 0; i < outputDescriptors.length; i++) {
      const check = validateDescriptorShape(outputDescriptors[i]);
      if (!check.ok) throw new Error(`invalid outputDescriptors[${i}]: ${check.error}`);
    }
  }
  if (inputDigests) {
    if (!Array.isArray(inputDigests)) throw new Error('inputDigests must be an array');
    for (let i = 0; i < inputDigests.length; i++) {
      const check = validateDigest(inputDigests[i], `inputDigests[${i}]`);
      if (!check.ok) throw new Error(`invalid inputDigests[${i}]: ${check.error}`);
    }
  }
}
