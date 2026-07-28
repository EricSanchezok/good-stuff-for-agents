# Catalog Data Write Contracts

All canonical writes flow through current-schema helpers under `scripts/`. Legacy records fail validation and must be regenerated through their owner workflow; there is no in-place compatibility or migration path.

## Draft-to-Write Flow

```text
owner semantic judgment
  → complete draft or controller envelope
  → one narrow canonical writer
  → current-schema validation
  → atomic write
  → strict catalog validation
```

Operational skills must not hand-edit canonical YAML or JSONL. Model- or remote-derived content supplies semantic data only; it never selects IDs, status, buckets, paths, sessions, permissions, or external actions.

## Current Production Schemas

- Analysis: v2 claim records.
- Relation: v2 predicate-specific records.
- Pack: v3 DAG records with no inline evaluation.
- Evaluation: v2 independent decision records.
- Nightly summary: v3, rendered from the sealed ledger.

## Pack v3 Candidate Write

`write-pack-record.mjs` is the only candidate Pack writer. It:

- accepts a semantic draft without destination or promotion controls;
- derives `status: candidate` and `catalog/packs/candidates/<pack-id>/pack.yaml`;
- validates member eligibility and current version pins;
- validates DAG nodes, edges, roots, sinks, reachability, cycles, artifact handoffs, and claim-backed relation usage;
- writes the Pack v3 record atomically;
- computes the complete semantic preflight exactly once and writes `preflight-proof.json` beside the candidate.

The proof contains the current rules version and a digest bound to the Pack, selected analyses, relations, checked claims, compatibility, and mitigation. There is no second proof filename.

## Evaluation v2 Write

`write-evaluation.mjs` is the only Evaluation writer. The controller first requests a binding for one canonical candidate. The binding fixes:

- Pack ID, status, version, and content hash;
- deterministic evaluation ID and candidate evaluation path;
- current `preflight-proof.json` digest;
- synthesis-session identity.

The writer accepts only `{binding, draft}`, rereads current candidate and proof state immediately before writing, rejects stale or replayed bindings, and never mutates Pack YAML. The semantic draft supplies the ten metric objects, warnings, blockers, checked claim IDs, evaluation session ID, and run identity; it cannot supply controlled identity/path fields.

Evaluation applies blocker-first MIN-gate semantics:

- any structural blocker: `rejected`;
- no blocker and every metric at least `0.70`: `passed`;
- no blocker with any metric from `0.50` through `0.69`: `needs_work`;
- any metric below `0.50`: `rejected`.

Synthesis and evaluation session IDs must differ. The resulting Evaluation v2 binds to the current proof digest.

## Promotion

`promotePassingCandidates()` is the only writer for `catalog/packs/published/**`. It does not rerun semantic preflight. It verifies:

1. Pack schema v3 and candidate status;
2. at least two eligible members with current version pins;
3. current candidate proof exists and matches Evaluation v2;
4. independent Evaluation decision is exactly `passed` with no blockers;
5. evaluation Pack/session/proof bindings are consistent.

Successful promotion creates the sole published Pack, copies the bound evaluation and proof, removes the candidate directory, and leaves no inline evaluation state. Non-passing or stale candidates remain unpublished.

## Relation v2 Write

`append-relation.mjs` accepts a complete v2 relation, validates the predicate-specific block, and atomically appends it without semantic loss. It rejects v1, unknown fields, invalid enums, and missing relation/claim topology.

## Structural Recovery

Malformed current-schema data may be repaired only through a narrow helper that consumes complete reviewed evidence, matches the declared corruption exactly, and writes atomically without guessing. Unsupported legacy records are regenerated through owner workflows.

## Filesystem Safety

Writers reject symbolic links in targets or existing ancestors, enforce realpath containment, create missing directories one level at a time, and use temp-file-plus-rename writes. JSONL appenders rewrite the complete file atomically when practical.

## Formatting and Verification

- YAML and JSON use deterministic key ordering where defined.
- JSONL stores one object per line; empty JSONL is valid.
- Timestamps use ISO 8601.

After a write, run the narrow contract test and strict validation. Rebuild indexes before publishing when canonical records changed.