# Nightly Total Runbook

Use this runbook for the full scheduled/autonomous catalog operation.

1. Confirm authorization mode: read-only, local-write, commit, push, or scheduled automation.
2. Inspect git status and protect unrelated changes.
3. Load `catalog-maintenance` and run preflight gates.
4. Load `catalog-growth-ops` and run autonomous growth.
5. Load `catalog-maintenance` again for final validation, indexes, public render, drift, links, and status.
6. Load `catalog-publishing` only when public rendering needs focused repair.
7. Write total run report under `reports/nightly-catalog-ops/<YYYY-MM-DD>-run.md`.
8. If authorized, create clean commits with the required co-author footer and push normally.
9. Report completion, blockers, skipped phases, commit IDs, push state, and next-run priorities.

The total controller delegates. It does not replace maintenance or growth owner SOPs.
