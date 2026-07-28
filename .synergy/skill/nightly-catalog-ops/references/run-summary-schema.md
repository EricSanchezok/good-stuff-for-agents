# Nightly Run Summary v3

`seal-run.mjs` is the only writer of the machine-readable Nightly summary. It renders the summary from the immutable run context, sealed terminal ledger, final gate, and prepared intents. Agents must not hand-author or patch this JSON.

The canonical JSON Schema is `../catalog-data/references/schemas/v3/run-summary.schema.json`; runtime validation is implemented by `scripts/lib/run-summary-validator.mjs`.

## Exact Top-Level Shape

```json
{
  "schema_version": 3,
  "run_id": "run_...",
  "ledger_id": "ldg_...",
  "context_digest": "<64 lowercase hex>",
  "ledger_digest": "<64 lowercase hex>",
  "timestamp": "2026-07-28T00:00:00.000Z",
  "run_outcome": {
    "status": "no_pack_clean",
    "summary": "Run completed with no packs to publish.",
    "total_actions": 7,
    "errors": 0,
    "warnings": 0
  },
  "gate": {
    "gate_id": "gate_...",
    "decision": "pass",
    "passed": true,
    "errors": [],
    "warnings": []
  },
  "intents": [],
  "outcome_counts": {
    "sources": 0,
    "skills": 0,
    "relations": 0,
    "packs": 1,
    "issues": 6
  }
}
```

No additional fields are allowed.

## Fields

### `schema_version`

Must be exactly `3`. Legacy summaries are rejected rather than migrated or interpreted.

### Identity and Binding

- `run_id`: non-empty and begins with `run_`.
- `ledger_id`: non-empty and begins with `ldg_`.
- `context_digest`: lowercase 64-character SHA-256 hex digest of the immutable prepared context.
- `ledger_digest`: lowercase 64-character SHA-256 hex digest of the terminal ledger.
- `timestamp`: valid ISO 8601 timestamp.

### `run_outcome`

Exact fields:

- `status`: `success`, `partial`, `failed`, `no_pack_clean`, or `reply_blocked`.
- `summary`: non-empty factual description.
- `total_actions`: non-negative integer.
- `errors`: non-negative integer.
- `warnings`: non-negative integer.

`no_pack_clean` is a successful zero-Pack terminal, not a candidate status.

### `gate`

Exact fields:

- `gate_id`: non-empty ID.
- `decision`: `pass` or `fail`.
- `passed`: boolean.
- `errors`: string array.
- `warnings`: string array.

The final gate is invoked once. The summary records its result; it does not run or re-run gates.

### `intents`

Array of at most two immutable prepared intents. Each item contains exactly:

- `domain`, `source`, `reason`: non-empty strings;
- `score`: finite number from 0 to 1;
- `seed_skill_ids`: skill IDs beginning with `skl_`;
- `max_analysis_budget`: non-negative integer.

Execution-time seed resolution is not written back into this object.

### `outcome_counts`

Exact non-negative integer fields: `sources`, `skills`, `relations`, `packs`, and `issues`. Counts reflect terminal-ledger entries, not catalog totals.

## Cross-Field Invariants

- `gate.passed: true` requires `gate.decision: pass` and empty `gate.errors`.
- `gate.passed: false` requires `gate.decision: fail` and at least one gate error.
- `run_outcome.total_actions` equals the sum of every `outcome_counts` field.
- `run_outcome.errors: 0` is required for `success` and `no_pack_clean`.
- `failed` and `reply_blocked` require at least one error.
- A failed gate requires `failed` or `reply_blocked` run status.
- A passing gate cannot carry `failed` or `reply_blocked` status.

## Manifest Binding

The summary does not contain Git authorization or a manifest path. When `seal-run` receives a base `HEAD`, it writes a separate touched-path manifest containing:

- the same `run_id` and `ledger_digest`;
- a digest of the exact summary bytes;
- the full base `HEAD`;
- canonical exact file paths.

`finalize-git.mjs` validates those bindings read-only. Neither artifact authorizes commit or push.

## Verification

```bash
npm --prefix .synergy run nightly:validator:test
npm --prefix .synergy run nightly:seal:test
```
