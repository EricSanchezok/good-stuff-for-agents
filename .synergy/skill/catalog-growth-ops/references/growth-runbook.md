# Growth Runbook

Run this sequence for autonomous growth.

1. Run maintenance preflight or read the latest maintenance status.
2. Inspect catalog gaps and previous reports.
3. Run demand scan and choose growth themes.
4. Load `source-discovery` and inspect a bounded public source batch.
5. Write discovery reports and candidate drafts for inspected sources.
6. Apply source activation policy.
7. Call `source:activate` only for reviewed activation drafts.
8. Load `source-sync` and sync active/preview sources.
9. Load `skill-extraction` and write candidates from changed/latest snapshots.
10. Load `skill-normalization` and write canonical records for clear candidates.
11. Load `skill-deep-analysis` and write analyses for new/changed skills.
12. Load `skill-dedup-relations` and append reviewed relation edges.
13. Run catalog impact detection.
14. Choose pack intents from demand scan, catalog gaps, and analyzed compatible skills.
15. Load `pack-synthesis` and write candidate packs only with enough evidence.
16. Load `catalog-evaluation` and write evaluation output.
17. Validate catalog and rebuild indexes.
18. Write the growth report.
19. Hand final publishing/commit/push to `nightly-catalog-ops`.

Skip downstream phases when inputs are absent, but record why. Do not fabricate data to keep the run moving.
