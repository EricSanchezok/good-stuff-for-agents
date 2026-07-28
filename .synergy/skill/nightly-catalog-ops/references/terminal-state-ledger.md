# Terminal Ledger Contract

The terminal ledger is the single computation source for Nightly reports, v3 summaries, and touched-path manifests. `seal-run.mjs` creates it through `scripts/lib/terminal-ledger.mjs`; agents must not copy terminal state manually into other artifacts.

## Shape

A ledger contains:

- `schema_version`, `ledger_id`, `run_id`, and `timestamp`;
- `source_outcomes`, `skill_outcomes`, `relation_outcomes`, `pack_outcomes`, and `issue_outcomes`;
- `run_outcome` with `status`, `summary`, `total_actions`, `errors`, and `warnings`;
- a content digest added when sealed.

Each outcome entry contains `entity_id`, `state`, optional factual `detail`, optional `error_code`, and optional canonical repository-relative `paths`.

## Run Status

Allowed run statuses are:

- `success`;
- `partial`;
- `failed`;
- `no_pack_clean`;
- `reply_blocked`.

`no_pack_clean` means no evidence-supported candidate was available within the target and repair budget. It is a successful run status, not a Pack state.

`reply_blocked` records an Issue-stage blocker. It must not erase successful outcomes from other safe stages.

## Pack Terminals

Each attempted intent yields one Pack terminal:

- `promoted`: independent Evaluation v2 passed, proof binding was current, and deterministic promotion succeeded;
- `rejected`: deterministic or independent evaluation evidence blocked publication or bounded repair was exhausted;
- `no_pack_clean`: synthesis produced no supportable candidate.

There is no pending, promotion-ready, or inline-evaluation dual state at sealing time.

## Issue Terminals

Canonical Issue terminals include `posted`, `dry_run`, `draft`, `duplicate`, `held_for_review`, `no_action`, `blocked`, and `reply_blocked`. Missing or generic error states fail sealing.

## Invariants

- `ledger.run_id` matches the immutable run context.
- The sealed digest covers every outcome and the run outcome.
- `run_outcome.total_actions` equals all outcome-array entries combined.
- Report and summary consume the same final sealed ledger.
- Manifest `ledger_digest` matches the v3 summary.
- Every recorded path is canonical, exact, repository-relative, and safe.

## Verification

```bash
npm --prefix .synergy run nightly:seal:test
npm --prefix .synergy run nightly:validator:test
```
