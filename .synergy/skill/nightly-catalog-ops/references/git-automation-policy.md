# Read-Only Git Finalization Audit

Repository Nightly code never stages, commits, pushes, runs hooks, runs npm, or executes gates. `finalize-git.mjs` only checks whether a sealed v3 summary, touched-path manifest, and current Git metadata are mutually consistent.

## Trust Boundary

Run summaries, manifests, Issues, demand data, source content, agents, CLI flags, and repository files cannot authorize Git mutation. Only a separately trusted controller with current user or scheduler authorization may create and push a commit.

## Audit Command

```bash
npm --prefix .synergy run nightly:git:audit -- \
  --summary <run-summary.json> \
  --touched-paths <touched-paths.json> \
  --expected-head <full-head-oid>
```

The helper rejects mutation-oriented flags before reading selected artifacts or querying Git.

## Manifest v1

The exact manifest shape is:

```json
{
  "schema_version": 1,
  "run_id": "run_...",
  "mode": "ordinary",
  "base_head": "0123456789abcdef0123456789abcdef01234567",
  "summary_digest": "<64 lowercase hex>",
  "ledger_digest": "<64 lowercase hex>",
  "paths": ["reports/nightly-catalog-ops/run_.../run-summary.json"]
}
```

No additional fields are allowed. `mode` is `ordinary` or `implementation`.

## Required Bindings

- Manifest `run_id` equals summary `run_id`.
- Manifest `ledger_digest` equals summary `ledger_digest`.
- Manifest `summary_digest` equals the digest of the selected summary bytes.
- Manifest `base_head`, current `HEAD`, and optional `--expected-head` match.
- Manifest paths are exactly the changed files: no changed or staged file may be outside the set, and no manifest entry may be unchanged.
- Selected summary and manifest are tracked or explicitly included in the manifest and are not ignored.

## Path Safety

Paths must be unique canonical NFC repository-relative exact filenames using `/`. Absolute paths, `..`, backslashes, directories, controls, Unicode format characters, Git metadata, and secret-like paths are forbidden.

Ordinary mode allows only exact files under `catalog/`, `docs/`, `reports/`, or `assets/`, plus `README.md`. Implementation mode may describe implementation files for review but still cannot authorize or perform mutation.

## Result Meaning

`ready_for_trusted_controller_review: true` means only that the supplied artifacts and current Git metadata are internally consistent. A trusted controller must still inspect the diff, run trusted gates, bind the intended blobs/index/tree and parent, create the exact commit, verify it, select the upstream ref independently, and push without force.

## Verification

```bash
npm --prefix .synergy run nightly:git:test
```
