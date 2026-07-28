# Nightly Catalog v3 Runbook

Use this runbook for one complete autonomous catalog run. It is the operational expansion of `../SKILL.md`; owner skills retain semantic judgment.

## Sequence

1. Capture current branch, upstream, full `HEAD`, and working-tree status. Protect unrelated changes.
2. Prove the curated source seed parses, GitHub API capacity is non-blocking, and at least one approved source can sync before any destructive reset.
3. Run deterministic health and approved-source sync only. Do not render public pages yet.
4. Prepare the fixed Issue snapshot: `issue-stage-orchestrator.mjs --prepare --run-id <id>`. This read-only fetch fully paginates open Issues and comments, excludes pull requests, binds previous ledgers, and writes `catalog/runs/<run-id>/issue-stage/workload.json`. Stop Issue-dependent preparation if the snapshot is incomplete.
5. Run collector: `nightly:collect --run-id <id> > catalog/runs/<run-id>/collector-snapshot.json`. This binds the exact Issue workload together with every authoritative canonical file in a raw-byte SHA-256 evidence manifest and emits the compound snapshot digest.
6. Run `nightly:prepare --input catalog/runs/<run-id>/collector-snapshot.json > catalog/runs/<run-id>/prepared/prepared-run.json`. The collector output is required — legacy raw aggregate input is rejected. Any demand binding is read only from the canonical run-scoped artifact already hashed by the collector; `prepare-run` accepts no separate demand path. It binds the requested run ID, exact `snapshot_digest`, and `evidence_manifest_digest` into one immutable context. Keep `run_context.digest` outside later stage output as the trusted seal anchor.
7. Finalize the fixed Issue stage and start target work from that same prepared snapshot. Run `issue-stage-orchestrator.mjs --finalize --run-id <id> --workload catalog/runs/<run-id>/issue-stage/workload.json --drafts <path> [--apply] --output catalog/runs/<run-id>/issue-stage/stages-issues.json`. It consumes controller-bound structured semantic drafts, builds and persists canonical assessments, runs restricted reply with TOCTOU/dedup/rendering, persists response ledgers, and writes the exact `stages.issues` object required by seal-run. Dry run (default) never comments.

   The workload.json is a canonical content-addressed artifact: `{ kind: "issue_workload", repository: "EricSanchezok/good-stuff-for-agents", run_id, workload_digest (sha256:...), snapshot_complete (boolean), scan_summary, all_accepted_issues[], rejected_issues[] }`. Incomplete snapshots are blocked — never zero-complete. Only the canonical fixed repository and content-addressed workload digest are accepted.
8. Run `nightly:closure --run-id <id>` to produce a deterministic run-scoped closure evidence manifest. This consumes the prepared run output plus collector snapshot from `catalog/runs/<run-id>/`, resolves seed skills for concrete evidence (controller-bound demand or relation components), enforces max2/max50, and rejects stale snapshots before writing. Writes to `catalog/runs/<run-id>/closure/closure-manifest.json`.
9. Attempt at most two prepared intents. Do not mutate an intent to add resolved skills; keep execution-time resolution in a separate evidence bundle. The closure resolver preserves the exact prepared intent under `intent` and keeps seed resolution in a separate evidence bundle with exact skill/analysis/relation paths, SHA-256 hashes, and IDs.
10. For each intent, acquire the minimum canonical analyses and relations needed for one candidate. Repeated failure fingerprints are skipped.
11. Run Pack synthesis in its own session. Candidate output is Pack schema v3 plus candidate-time `preflight-proof.json`. One preflight/topology repair is allowed. Missing evidence may end as `no_pack_clean`.
12. Run Evaluation v2 in a fresh session that has no synthesis history. It receives only the candidate, proof, and minimal bound evidence. A blocker rejects. Without blockers, every rubric dimension must be at least `0.70` to pass. One post-evaluation repair is allowed.
13. Promote only an independently `passed` evaluation bound to the current proof. Promotion creates the published record, copies the evaluation and proof, and deletes the candidate directory.
14. After all owner stages complete, run `nightly:final-gate` exactly once. The canonical executor runs: fail-fast strict validation, indexes, public render, drift, links, public boundary, public analysis summaries, and all focused tests in order. It produces a deterministic bound result with digest. Do not use `npm run check`, boolean proxies, or a second publishing gate.
15. Assemble stage output exactly as defined in `stage-output-contract.md`, including the `gate_result` from step 14. Run `nightly:seal` with the independent context digest, output directory, and full base `HEAD`.
16. Confirm the sealed terminal ledger, report, v3 summary, and touched-path manifest are mutually bound and the final gate was invoked once.
17. Run `nightly:git:audit` against the sealed summary and manifest. Treat review readiness as consistency evidence only.
18. Report `success`, `partial`, `failed`, `no_pack_clean`, or `reply_blocked`, together with Issue terminals, Pack terminals, artifacts, verification, and blockers.

## Required Invariants

- One run context and one independently held digest anchor.
- One fixed Issue stage per run.
- At most two immutable intents.
- Separate synthesis and evaluation sessions; evaluator sessions are not reused.
- One complete semantic preflight per candidate, materialized as `preflight-proof.json`.
- Evaluation and promotion verify proof freshness; they do not repeat semantic graph traversal.
- Maximum one preflight repair and one post-evaluation repair per intent.
- One final gate and one ledger-driven reporting path.
- No filler Pack and no legacy schema fallback.
- No Git mutation from repository Nightly helpers.

## Clean Zero-Pack Outcome

`no_pack_clean` is successful when no candidate can be supported within the target and repair budget. The terminal ledger must explain the absence of a Pack; public pages may show sources and skills without an invented example Pack.

## Failure Isolation

Issue reply failures are persisted as `reply_blocked` and do not erase safe catalog results. One target's evidence or evaluation failure does not block the second intent when validation remains healthy. Catalog validation or public-gate failure blocks sealing as successful until the owning deterministic layer is repaired.