# Growth Runbook

Run this sequence for autonomous growth.

Use one run ID for the whole growth run. Format it as `run_<YYYY-MM-DD-HHmmss>` so multiple runs on the same day do not overwrite reports or append unrelated candidates to the same JSONL file. Pass this run ID to `skill-extraction` with `--run-id`, and use the same timestamp in growth and nightly report filenames.

## Operating Principle

The growth pipeline is evidence-threaded, not summary-threaded. Every stage must preserve enough information for the next stage to recover the original evidence. Do not allow a source summary, candidate shell, normalized record, or report paragraph to replace the artifact itself.

## Evidence Thread Rule

Every skill-like item must keep a traceable evidence thread:

```txt
source candidate
  → source record
    → snapshot manifest
      → artifact path + content digest + retrieval location
        → skill candidate
          → canonical skill ID
            → deep analysis
```

Do not let a stage replace original source evidence with summaries. Summaries are convenience. Original artifacts are the source of truth.

## Single Computation Point (SCP) Rule

Every value in the catalog is computed exactly once. The SCP table defines which stage owns each value. For the authoritative full table, see `single-computation-points.md`.

| Value | Computed by | Consumed by |
|---|---|---|
| `content_digest`, `raw_url`, `license` | `source-sync` | `skill-extraction`, `skill-normalization`, `skill-deep-analysis`, `skill-analyzer` |
| `declared_name` | `skill-extraction` (preserved as-is) | `skill-normalization` |
| `canonical_skill_id`, `canonical_name`, `display_name`, `version_id`, `source_skill_id`, `status` | `skill-normalization` | `skill-deep-analysis`, relations, packs, publishing, all downstream |

No stage may recompute or reinterpret a value owned by an upstream SCP. If a value is missing or incorrect, the bug is in the SCP stage, not in the consumer. Return to the SCP owner for repair; do not work around it by recomputing.

## Stage Boundary Rule

- `source-discovery` finds broad candidate sources and records why they may be worth tracking.
- `source-activation` checks safety, access, license posture, and syncability. It is not a quality gate.
- `source-sync` preserves recoverable artifact evidence.
- `skill-extraction` preserves candidate artifacts without semantic inflation.
- `skill-normalization` creates stable identity records and duplicate/update/block decisions.
- `skill-deep-analysis` reads the original artifact and provides the first real semantic judgment.

If a stage starts doing the next stage's job, stop and correct course. Semantic interpretation belongs in deep analysis, not in sync, extraction, or normalization.

## Backpressure Rule

Do not treat extraction volume as success. A growth run succeeds when touched items reach useful terminal states:

- source candidate accepted, rejected, previewed, activated, or blocked with reason;
- skill candidate normalized for analysis, marked duplicate, rejected, blocked, deferred with explicit batch reason, or deferred due to batch budget;
- analyzed skill completed, analysis deferred with reason, or deferred due to batch budget.

If extraction produces more candidates than normalization or analysis can handle, split by source or artifact batch. Do not leave a large raw candidate pile with no owner, no reason, and no next action.

Per-cycle thresholds:

- Activate 3–5 sources per run.
- Keep extraction to ≤50 candidates per extraction batch.
- Deep Analysis should focus on new/changed, high-potential or batch-prioritized skills; all remaining candidates must have an explicit deferred reason.

## Run Sequence

1. Run maintenance preflight or read the latest maintenance status.
2. Inspect catalog gaps and previous reports.
3. Run demand scan and choose growth themes.
4. Load `source-discovery` and inspect a bounded public source batch. Discovery should optimize for broad coverage and novelty, not for standard SKILL.md-only sources. Activate 3–5 sources per run.
5. Write discovery reports and candidate drafts for inspected sources. Each accepted source must include evidence links, parseability, dedup summary, and activation handoff notes.
6. Apply source activation policy. Activation checks safety and syncability only; it does not endorse content quality.
7. Call `source:activate` only for reviewed activation drafts.
8. Load `source-sync` and sync active/preview sources. Sync must preserve enough artifact evidence for downstream agents to recover the original content.
9. Load `skill-extraction` and write candidates from changed/latest snapshots. Extraction preserves candidate evidence; it does not infer domain, quality, workflow role, tools, or risk. Keep extraction to ≤50 candidates per extraction batch.
10. Load `skill-normalization` and write identity-only canonical records for clear candidates. Normalization resolves stable identity, provenance, versioning, and duplicate/update/block status. It does not perform deep semantic interpretation.
11. Load `skill-deep-analysis` and write judgment-driven analyses for new/changed, high-potential or batch-prioritized skills; remaining candidates must have an explicit deferred reason. Deep analysis reads the original artifact directly; normalized records are routing hints, not the semantic source of truth.
12. Load `skill-dedup-relations` and append reviewed relation edges after analysis gives enough semantic evidence.
13. Run catalog impact detection.
14. Resolve pack lifecycle work for every pack intent, candidate pack, stale published pack, or impacted pack touched by the run.
15. Load `pack-synthesis` when synthesis, repair, or reorganization is the right next action.
16. Load `catalog-evaluation` when a candidate or changed pack can be scored; write `passed`, `needs_work`, or `rejected` rather than leaving it pending.
17. Validate catalog and rebuild indexes.
18. Write the growth report with terminal states for touched objects and explicit deferred reasons.
19. Hand final promotion, publishing, commit, and push to `nightly-catalog-ops`.

Skip downstream phases when inputs are absent, but record why. Do not fabricate data to keep the run moving.