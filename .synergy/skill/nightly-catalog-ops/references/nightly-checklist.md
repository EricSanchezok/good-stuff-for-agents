# Nightly Checklist

Run order:

1. `catalog-data validate --strict`.
2. `catalog-data migrate-catalog` if schema versions require it.
3. `source-discovery` when configured.
4. `source-sync` for approved sources, independently per source.
5. `skill-extraction` for changed sources.
6. `skill-normalization` for extracted candidates.
7. `skill-deep-analysis` for new or changed records.
8. `skill-dedup-relations`.
9. `catalog-data detect-impact`.
10. `pack-synthesis` for intents or stale pack signals.
11. `catalog-evaluation`.
12. Promote passing candidates through catalog-data.
13. `catalog-data build-indexes`.
14. `catalog-publishing render`.
15. `catalog-publishing check-docs-drift` and `check-links`.
16. Write reports.
17. Commit and push only meaningful changes.

Exit codes: 0 green, 1 non-fatal source failures, 2 fatal invariant failure.
