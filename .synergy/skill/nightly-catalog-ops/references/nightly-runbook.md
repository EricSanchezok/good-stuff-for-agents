# Nightly Total Runbook

Use this runbook for the full scheduled/autonomous catalog operation.

1. Confirm authorization mode: read-only, local-write, commit, push, or scheduled automation.
2. Inspect git status and protect unrelated changes.
3. Load `catalog-maintenance` and run preflight gates.
4. Load `catalog-growth-ops` and run autonomous growth.
5. Resolve touched lifecycle states using the Terminal State Model in `../shared-references/integration-contract.md`: no-op, written/updated and validated, evaluated, promotion-ready, promoted/published, deprecated/removed under policy, or blocked with owner and reason.
6. Promote passing candidate packs with catalog-data when policy allows (favor `pack:promote -- --cleanup-candidates` for full runs), then render public pages through catalog-publishing.
7. Load `catalog-maintenance` again for final validation, indexes, public render, drift, links, boundary, and status. Run `nightly:full-check`.
8. Load `catalog-publishing` only when public rendering needs focused repair.
9. Assemble the machine-readable summary JSON (see `references/run-summary-schema.md`) with terminal states for every object touched by the run.
10. Write the total run report via `nightly:report:write`, validate it via `nightly:report:check` and `nightly:states:check`.
11. If authorized, run `nightly:git -- --dry-run --authorized` to inspect, then `nightly:git -- --commit --push --authorized --message "nightly: ..."` to commit and push. Never hand-roll `git add && git commit && git push`.
12. Report completion, touched terminal states, commit IDs, and blockers.

The total controller delegates. It does not replace maintenance or growth owner SOPs.
