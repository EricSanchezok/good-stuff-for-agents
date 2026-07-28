import { createHash } from 'node:crypto';

export const PHASES = Object.freeze([
  'init',
  'maintenance',
  'issues',
  'context',
  'targets',
  'gate',
  'seal',
  'audit',
  'terminal',
]);

const PHASE_INDEX = Object.freeze(
  Object.fromEntries(PHASES.map((p, i) => [p, i]))
);

const TERMINAL_INDEX = PHASES.length - 1;

const VALID_TRANSITIONS = Object.freeze(new Set(
  PHASES.slice(0, -1).map((from, i) => `${from}->${PHASES[i + 1]}`)
));

const VALID_TERMINAL_STATUSES = Object.freeze(
  new Set(['completed', 'blocked', 'failed', 'interrupted', 'audit_blocked'])
);

const VALID_OUTCOMES = Object.freeze(
  new Set(['published', 'no_pack_clean', null])
);

const DIGEST_RE = /^sha256:[a-f0-9]{64}$/;
const HEAD_RE = /^[a-f0-9]{40}$/;

export function nextPhase(current) {
  const idx = PHASE_INDEX[current];
  if (idx == null) throw new Error(`Unknown phase: ${current}`);
  if (idx === TERMINAL_INDEX) return null;
  return PHASES[idx + 1];
}

export function validateTransition(from, to) {
  if (from == null) {
    if (to === 'init') return { ok: true };
    return { ok: false, error: `bootstrap_transition: null only allows transition to init, got ${to}` };
  }
  if (isTerminal(from)) {
    return { ok: false, error: `terminal_closure: run is terminal, no further phases allowed (attempted ${from} -> ${to})` };
  }
  if (to === 'terminal') return { ok: true };
  if (VALID_TRANSITIONS.has(`${from}->${to}`)) return { ok: true };
  const nextNormal = nextPhase(from);
  return { ok: false, error: `illegal_transition: ${from} -> ${to} (allowed: ${from} -> ${nextNormal} or ${from} -> terminal)` };
}

export function isTerminal(phase) {
  return PHASE_INDEX[phase] === TERMINAL_INDEX;
}

export function phaseIndex(phase) {
  const idx = PHASE_INDEX[phase];
  if (idx == null) throw new Error(`Unknown phase: ${phase}`);
  return idx;
}

// ── Canonical serialization ─────────────────────────────────────────

export function canonicalStringify(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalStringify).join(',') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(value[k])).join(',') + '}';
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return String(value);
    return 'null';
  }
  if (typeof value === 'boolean') return String(value);
  return 'null';
}

export function computeContentDigest(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

export function computeEventDigest(event) {
  const { event_digest, ...rest } = event;
  return `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;
}

export function canonicalPayloadDigest(obj) {
  const { digest, terminal_digest, result_digest, receipt_digest, manifest_digest, ...rest } = obj;
  return `sha256:${createHash('sha256').update(canonicalStringify(rest)).digest('hex')}`;
}

// ── Descriptor / digest validators ────────────────────────────────────

export function validateDigest(value, name) {
  if (typeof value !== 'string' || !DIGEST_RE.test(value)) {
    return { ok: false, error: `${name || 'digest'} must match sha256:<64-hex>, got ${JSON.stringify(value)}` };
  }
  return { ok: true };
}

export function validateDescriptorShape(desc) {
  if (!desc || typeof desc !== 'object') return { ok: false, error: 'descriptor must be a non-null object' };
  if (typeof desc.label !== 'string' || desc.label.length === 0) return { ok: false, error: 'descriptor.label must be a non-empty string' };
  if (desc.label.includes('/') || desc.label.includes('\\')) return { ok: false, error: `descriptor.label must not contain path separators: ${desc.label}` };
  if (desc.label.startsWith('.') || desc.label.startsWith('~')) return { ok: false, error: `descriptor.label must not start with . or ~: ${desc.label}` };

  const d = validateDigest(desc.digest, 'descriptor.digest');
  if (!d.ok) return d;

  if (!Number.isInteger(desc.byte_length) || desc.byte_length < 0) return { ok: false, error: 'descriptor.byte_length must be a non-negative integer' };

  if (typeof desc.repo_relative_path !== 'string' || desc.repo_relative_path.length === 0) {
    return { ok: false, error: 'descriptor.repo_relative_path must be a non-empty string' };
  }
  if (desc.repo_relative_path.includes('..')) return { ok: false, error: `descriptor.repo_relative_path must not contain "..": ${desc.repo_relative_path}` };
  if (desc.repo_relative_path.startsWith('/')) return { ok: false, error: `descriptor.repo_relative_path must be relative: ${desc.repo_relative_path}` };

  return { ok: true };
}

export function validateInputDigests(digests) {
  if (!Array.isArray(digests)) return { ok: false, error: 'input_digests must be an array' };
  for (let i = 0; i < digests.length; i++) {
    const d = validateDigest(digests[i], `input_digests[${i}]`);
    if (!d.ok) return d;
  }
  return { ok: true };
}

// ── Terminal semantic enforcement ────────────────────────────────────

export function validateTerminalOutput(prevPhase, terminalOutput) {
  if (!terminalOutput || typeof terminalOutput !== 'object') {
    return { ok: false, error: 'terminal_output_missing: terminal requires parsed output content' };
  }

  const status = terminalOutput.status;
  if (!VALID_TERMINAL_STATUSES.has(status)) {
    return { ok: false, error: `invalid_terminal_status: ${status} must be one of [${[...VALID_TERMINAL_STATUSES].join(', ')}]` };
  }

  const outcome = terminalOutput.outcome;
  if (!VALID_OUTCOMES.has(outcome)) {
    return { ok: false, error: `invalid_terminal_outcome: ${JSON.stringify(outcome)} must be one of [published, no_pack_clean, null]` };
  }

  if (status === 'completed') {
    if (prevPhase !== 'audit') {
      return { ok: false, error: 'terminal_completed_requires_audit: completed status only allowed from audit phase' };
    }
    if (outcome !== 'published' && outcome !== 'no_pack_clean') {
      return { ok: false, error: `terminal_completed_outcome: completed requires published or no_pack_clean, got ${JSON.stringify(outcome)}` };
    }
    if (typeof terminalOutput.summary !== 'string' || terminalOutput.summary.length === 0) {
      return { ok: false, error: 'terminal_completed_summary: completed requires a non-empty summary' };
    }
    return { ok: true };
  }

  if (status === 'audit_blocked') {
    if (prevPhase !== 'audit') {
      return { ok: false, error: 'terminal_audit_blocked_requires_audit: audit_blocked status only allowed from audit phase' };
    }
    if (outcome !== null) {
      return { ok: false, error: `terminal_audit_blocked_outcome: audit_blocked requires null outcome, got ${JSON.stringify(outcome)}` };
    }
    return { ok: true };
  }

  // blocked, failed, interrupted: any phase including audit is valid
  if (outcome !== null) {
    return { ok: false, error: `terminal_${status}_outcome: ${status} requires null outcome, got ${JSON.stringify(outcome)}` };
  }

  return { ok: true };
}

// ── Gate ID ─────────────────────────────────────────────────────────

export function computeGateId(runId, contextDigest, preGateEventDigest) {
  if (typeof runId !== 'string' || !runId.startsWith('run_')) throw new Error('runId must be a string starting with run_');
  if (typeof contextDigest !== 'string' || !DIGEST_RE.test(contextDigest)) throw new Error(`contextDigest must match sha256:<64-hex>, got ${contextDigest}`);
  if (typeof preGateEventDigest !== 'string' || !DIGEST_RE.test(preGateEventDigest)) throw new Error(`preGateEventDigest must match sha256:<64-hex>, got ${preGateEventDigest}`);

  const input = `gate:${runId}:${contextDigest.slice(7)}:${preGateEventDigest.slice(7)}`;
  const hex = createHash('sha256').update(input).digest('hex').slice(0, 16);
  return `gate_${hex}`;
}

// ── Baseline validation ──────────────────────────────────────────────

export function validateBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') return { ok: false, error: 'baseline must be a non-null object' };

  const head = baseline.head_sha;
  if (typeof head !== 'string') return { ok: false, error: 'baseline.head_sha must be a string' };
  if (!HEAD_RE.test(head)) return { ok: false, error: `baseline.head_sha must be a 40-char hex string, got ${JSON.stringify(head)}` };

  if (typeof baseline.branch !== 'string' || baseline.branch.length === 0) {
    return { ok: false, error: 'baseline.branch must be a non-empty string' };
  }

  if (baseline.upstream !== undefined && typeof baseline.upstream !== 'string') {
    return { ok: false, error: 'baseline.upstream must be a string if provided' };
  }

  if (baseline.worktree_clean !== true) {
    return { ok: false, error: 'baseline.worktree_clean must be true' };
  }

  return { ok: true };
}

export function serializeBaseline(baseline) {
  const v = validateBaseline(baseline);
  if (!v.ok) throw new Error(v.error);

  const obj = {
    head_sha: baseline.head_sha,
    branch: baseline.branch,
    upstream: baseline.upstream || null,
    worktree_clean: true,
  };
  return canonicalStringify(obj);
}

// ── Chain validation ──────────────────────────────────────────────────

export function validateChain(events, { verifyOutput } = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    return { ok: false, error: 'empty_chain: no events to validate' };
  }
  for (let i = 0; i < events.length; i++) {
    if (events[i].event_index !== i) {
      return { ok: false, error: `index_gap: expected event_index ${i}, got ${events[i].event_index}` };
    }
  }
  if (events[0].phase !== 'init') {
    return { ok: false, error: `first_event_not_init: got ${events[0].phase}` };
  }
  if (events[0].prev_event_digest !== null) {
    return { ok: false, error: 'init_event_must_have_null_prev_event_digest' };
  }
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const computed = computeEventDigest(event);
    if (computed !== event.event_digest) {
      return { ok: false, error: `event_${i}_digest_mismatch: computed ${computed}, stored ${event.event_digest}` };
    }
    // validate descriptor shape
    for (let j = 0; j < (event.output_descriptors || []).length; j++) {
      const result = validateDescriptorShape(event.output_descriptors[j]);
      if (!result.ok) return { ok: false, error: `event_${i}_bad_descriptor[${j}]: ${result.error}` };
    }
    if (i > 0) {
      const prev = events[i - 1];
      if (event.prev_event_digest !== prev.event_digest) {
        return { ok: false, error: `event_${i}_broken_link: expected prev ${prev.event_digest}, got ${event.prev_event_digest}` };
      }
      const transition = validateTransition(prev.phase, event.phase);
      if (!transition.ok) {
        return { ok: false, error: `event_${i}_${transition.error}` };
      }
    }
    if (verifyOutput && event.output_descriptors) {
      for (const desc of event.output_descriptors) {
        const result = verifyOutput(desc);
        if (!result.ok) {
          return { ok: false, error: `event_${i}_output_tampered: ${desc.label}: ${result.error}` };
        }
      }
    }
  }
  return { ok: true, events };
}

export function buildEvent({ runId, phase, timestamp, prevEvent, outputDescriptors, inputDigests }) {
  const idx = prevEvent ? prevEvent.event_index + 1 : 0;
  const prevDigest = prevEvent ? prevEvent.event_digest : null;

  const event = {
    event_index: idx,
    run_id: runId,
    phase,
    timestamp: timestamp || new Date().toISOString(),
    prev_event_digest: prevDigest,
    output_descriptors: outputDescriptors || [],
    input_digests: inputDigests || [],
    event_digest: '',
  };

  event.event_digest = computeEventDigest(event);
  return Object.freeze(event);
}
