# Catalog Data Write Contracts

All canonical writes must flow through `scripts/`.

## Draft-to-write flow

```txt
agent/subagent analysis
  → draft JSON in catalog/runs/<run-id>/drafts/ or stdin
  → write/append script
  → normalization and defaults
  → atomic write
  → strict validation
```

## Ownership

- `catalog-data` owns canonical writes, validation, formatting, migrations, catalog hashes, indexes, and impact detection.
- `catalog-publishing` owns rendering README/docs only.
- Operational skills must not directly write YAML/JSONL.
- Agent/model/remote-derived drafts provide semantic judgments only and never select a destination, bucket, record status, canonical identity, or output path.

## Controller-Derived Pack Destinations

- Candidate pack writers derive `status: candidate` and `catalog/packs/candidates/<pack-id>/pack.yaml`; candidate drafts containing published status, bucket/path, publication timestamp, or promotion controls are rejected.
- `promotePassingCandidates()` is the only writer for `catalog/packs/published/**`. Promotion and validation share the same eligibility rule: a consistent passing evaluation at or above `0.78`, at least two members, eligible member statuses, and current pinned versions.
- Evaluation controllers bind canonical `pack_id`, candidate status, pack version, stable pack content hash, deterministic `evaluation_id`, and expected candidate evaluation path. The writer reloads the candidate before writing, rejects stale or replayed bindings, and does not expose published-pack re-evaluation.
- Evaluation drafts may provide rubric metrics, scores, terminal judgments, failure modes, and recommendations, but never pack identity/status, evaluation identity, bucket, or output path. Contradictory pass signals resolve conservatively to non-passing.

## Structural Recovery

Malformed canonical data may be repaired only through a narrow helper that consumes a reviewed draft, matches the declared corruption exactly, preserves complete semantic fields from existing evidence, rewrites atomically, and fails before writing if the remainder cannot parse. Recovery helpers must not infer missing meaning. Strict validation is mandatory immediately afterward.

## Atomicity

Writer scripts must write temp files and rename after successful serialization. JSONL appenders must re-write complete files atomically when practical.

Deterministic writers and cleanup routines must reject symbolic links in the target or any existing ancestor, verify realpath containment against their declared root immediately before the operation, and create missing directories one level at a time with a fresh `lstat`/realpath check after each level. These checks narrow check-to-use windows and block repository symlink escapes, but they do not provide dirfd-style protection against a malicious same-permission process that continuously swaps path components during the final filesystem syscall.

## Formatting

- YAML keys are stable-sorted.
- JSONL records are one object per line.
- Empty JSONL files are valid.
- Timestamps use ISO 8601.
