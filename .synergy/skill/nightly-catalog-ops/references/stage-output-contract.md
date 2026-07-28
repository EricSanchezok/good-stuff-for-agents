# Stage Output Contract v3

The agent (SOP dispatch) collects owner skill outputs and delivers them to `seal-run.mjs` as a single JSON object. This document specifies the required shape.

## Top-Level Shape

```json
{
  "run_context": { ... },
  "intents": { ... },
  "stages": {
    "issues": { ... },
    "targets": [ ... ],
    "gate_result": { ... }
  }
}
```

## `run_context`

The immutable run context object produced by `prepare-run.mjs`. Must include `run_id`, `digest`, and all catalog-state fields. Must be identical to the object returned by `prepare-run`.

**Required hashed fields (v1 hardened):**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `snapshot_digest` | string | yes | SHA-256 hex (64 chars). Compound digest: `SHA-256(semantic_digest + evidence_manifest_digest)`. Binds the run context to an exact collector snapshot. |
| `evidence_manifest_digest` | string | yes | SHA-256 hex (64 chars). Hash of the full evidence manifest containing every authoritative input path and its raw-byte SHA-256. |

These fields are validated by `seal-run` through schema validation and digest recomputation. Legacy raw aggregate input (without snapshot tracking) is rejected.

The context also contains required `demand_metadata` with normalized `demand_skill_ids` and `domain_slugs`. This binding is included in `run_context.digest` so `seal-run` can independently reproduce Issue-demand intent selection without rereading mutable run artifacts.

## `intents`

The intents object produced by `prepare-run.mjs`. Must include `intents` array (max 2), `total`, `max_targets`, `capped`.

## `stages.issues`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `all_open_issues_processed` | boolean | yes | Must be `true` for the gate to pass. |
| `scan` | object | yes | `{ total, by_state: { open, acknowledged, fulfilled, blocked } }` |
| `assessments` | array | yes | One entry per assessed issue. |

### Assessment entry

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `issue_number` | integer | yes | GitHub issue number. |
| `intake` | object | yes | Canonical intake record. |
| `assessment` | object | yes | Canonical assessment record. |
| `reply` | object | yes | Reply result from owner executor. |
| `reply.status` | string | yes | `posted`, `dry_run`, `draft`, `duplicate`, `held_for_review`, `no_action`, `reply_blocked` |
| `reply.assessment_path` | string | yes | Repository-relative path to persisted assessment. |
| `reply.response_ledger_path` | string | yes | Repository-relative path to persisted response ledger. |
| `reply.posted` | boolean | no | Whether the reply comment was actually posted. |
| `reply.comment_id` | string | no | GitHub comment ID when posted. |

## `stages.targets`

Array of target outcomes. Each entry:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `intent` | object | yes | The intent from prepared intents. Must match by `domain` and `source`. |
| `repairs` | array | yes | Repair attempt records (may be empty). |
| `synthesis` | object | yes | Synthesis session output. |
| `preflight` | object | yes | Preflight check result. |
| `evaluation` | object | no | Evaluation session output. Omitted for `no_pack_clean`. |
| `promotion` | object | no | Promotion result. Only present for promoted candidates. |

### Repair entry

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `kind` | string | yes | `preflight` or `post_evaluation`. |
| `session_id` | string | yes | Synthesis session that performed the repair. |
| `attempt` | integer | yes | 1-based attempt number (2 = first repair). |
| `fingerprint` | string | yes | Failure fingerprint — same fingerprint blocks retry. |

### Synthesis entry

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `session_id` | string | yes | Unique synthesis session ID. |
| `ok` | boolean | yes | Whether synthesis succeeded. |
| `candidate` | object | no | Candidate produced (omitted on failure). |
| `candidate.pack_id` | string | yes | Canonical pack ID. |
| `candidate.pack_path` | string | yes | Repository-relative pack path. |
| `candidate.proof_path` | string | yes | Repository-relative preflight proof path. |
| `candidate.proof_digest` | string | yes | SHA-256 proof digest. |
| `candidate.analysis_paths` | array | yes | Paths to referenced analyses. |
| `candidate.relation_ids` | array | yes | Referenced relation IDs. |

### Evaluation entry

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `session_id` | string | yes | Unique evaluation session ID. Must differ from all synthesis session IDs and be unique across targets. |
| `ok` | boolean | yes | Whether evaluation succeeded. |
| `evaluation` | object | no | Evaluation result (omitted on failure). |
| `evaluation.pack_id` | string | yes | Must match synthesis `candidate.pack_id`. |
| `evaluation.proof_digest` | string | yes | Must match synthesis `candidate.proof_digest`. |
| `evaluation.decision` | object | yes | `{ passed: boolean, level: "passed"|"needs_work"|"rejected", reason: string }` |
| `evaluation.blockers` | array | yes | Structural blockers (empty when passed). |
| `evaluation_path` | string | no | Repository-relative path to evaluation record. |

## `stages.gate_result`

The canonical result produced by `run-final-gate.mjs` — the single production executor that runs strict validation, indexes, public render, drift checks, link checks, public boundary verification, public analysis summaries, and all focused tests exactly once. This field replaces legacy boolean `catalog_validation` / `publication_checks` proxies.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `gate_id` | string | yes | Unique gate invocation ID. |
| `run_id` | string | yes | Must match the run context `run_id`. |
| `context_digest` | string | yes | Must match the trusted context digest from `prepare-run`. |
| `passed` | boolean | yes | Overall gate outcome — `true` only when all checks pass. |
| `invoked_count` | integer | yes | Must be `1` — exactly one invocation per run. |
| `started_at` | string | yes | ISO 8601 start timestamp. |
| `finished_at` | string | yes | ISO 8601 finish timestamp. |
| `checks` | array | yes | Ordered check entries (see below). |
| `digest` | string | yes | SHA-256 digest of the canonical payload (recomputed by seal-run to reject tampering). |
| `_single_invocation` | boolean | yes | Must be `true`. |

### Check entry

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | Check name from the trusted check set. Unknown names are rejected. |
| `script` | string | yes | npm script name corresponding to the check. |
| `passed` | boolean | yes | `true` if exit code was 0. |
| `exit_code` | integer | yes | Process exit code. |
| `duration_ms` | integer | yes | Execution duration in milliseconds. |

### Required check names

The exact ordered required set is:
`catalog-strict-validation`, `catalog-indexes`, `public-render`, `public-drift`, `public-links`, `public-boundary`, `public-summaries`, `extraction-test`, `normalization-bootstrap-test`, `analysis-binding-test`, `relation-v2-test`, `pack-schema-test`, `pack-core-test`, `pack-preflight-test`, `pack-proof-test`, `pack-promotion-test`, `pack-destination-test`, `evaluation-binding-test`, `path-safety-test`, `issue-intake-test`, `issue-pipeline-test`, `issue-stage-test`, `nightly-context-test`, `nightly-final-gate-test`, `nightly-seal-test`, `nightly-validator-test`, `nightly-git-test`, `catalog-reset-test`, `pack-publishing-test`.

There are no optional production final-gate checks.

## Invariants

- Synthesis and evaluation must be separate sessions (different `session_id`).
- Evaluation `session_id` must be unique across all targets (no session reuse).
- `proof_digest` must be consistent across synthesis, preflight, and evaluation for each candidate.
- Only `passed` candidates may carry `promotion` with `ok: true`.
- `needs_work` after the maximum 2 repair attempts (1 of each kind) must terminate `rejected`.
- The same failure fingerprint must not appear in retries for the same target.
- `all_open_issues_processed` must be `true` — partial issue processing is not valid.
- Issue terminal states `missing` or `error` fail the gate; `blocked`, `dry_run`, `posted`, `duplicate`, `held_for_review`, `no_action` are valid canonical states.
