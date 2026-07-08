# Growth Runbook

Run this sequence for autonomous growth.

Use one run ID for the whole growth run. Format it as `run_<YYYY-MM-DD-HHmmss>` so multiple runs on the same day do not overwrite reports or append unrelated candidates to the same JSONL file. Pass this run ID to `skill-extraction` with `--run-id`, and use the same timestamp in growth and nightly report filenames.

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
14. Resolve pack lifecycle work for every pack intent, candidate pack, stale published pack, or impacted pack touched by the run.
15. Load `pack-synthesis` when synthesis, repair, or reorganization is the right next action.
16. Load `catalog-evaluation` when a candidate or changed pack can be scored; write `passed`, `needs_work`, or `rejected` rather than leaving it pending.
17. Validate catalog and rebuild indexes.
18. Write the growth report with terminal states for touched objects.
19. Hand final promotion, publishing, commit, and push to `nightly-catalog-ops`.

Skip downstream phases when inputs are absent, but record why. Do not fabricate data to keep the run moving.
