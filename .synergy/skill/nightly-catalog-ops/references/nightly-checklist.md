# Maintenance Checklist

Use this checklist as a coordination map. Deterministic gates may run in maintenance helpers; semantic phases must be executed by their owner skills.

Run order:

1. Validate catalog strictly.
2. Apply catalog migrations only when schema versions require it.
3. Run source sync for approved sources, independently per source.
4. If new sources are needed, use `source-discovery` and stop for approval when required.
5. If snapshots changed, use `skill-extraction` for changed sources.
6. Use `skill-normalization` for extracted candidates that need canonical records.
7. Use `skill-deep-analysis` for new or changed skill records.
8. Use `skill-dedup-relations` for reviewed relation edges.
9. Run impact detection for changed catalog records.
10. Use `pack-synthesis` only for explicit intents or stale pack signals.
11. Use `catalog-evaluation` for candidate readiness.
12. Promote passing candidates only through catalog-data and only when policy allows it.
13. Build indexes.
14. Render public pages.
15. Run drift and link checks.
16. Run the public-boundary scan.
17. Write reports.
18. Commit and push only when explicitly authorized.

Exit codes: 0 green, 1 non-fatal source failures, 2 fatal invariant failure.
