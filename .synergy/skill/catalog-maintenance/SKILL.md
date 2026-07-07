---
name: catalog-maintenance
description: "Run deterministic Skill Intelligence Catalog maintenance only: validation, approved-source sync, indexes, public page rendering checks, status reporting, and maintenance reports. Use when you need巡检 without autonomous discovery or semantic growth work."
---

# Catalog Maintenance SOP

## What You Own

You own maintenance-only catalog upkeep. You validate the catalog, run migrations, sync sources that are already active or preview, rebuild indexes, render and check public pages, report health, and identify which owner should handle any non-maintenance follow-up.

You do not discover sources, approve sources, extract skill candidates as a judgment phase, normalize skills, write deep analysis, create relations, synthesize packs, evaluate packs, promote packs, or make curation decisions. Those are growth or phase-owner responsibilities.

## When To Use This Skill

Use this skill when:

- you need a read-only or deterministic health check;
- you need to run `maintenance:run`;
- you need `catalog:status` output;
- approved sources should be synced without discovering new sources;
- public pages need render/drift/link checks from already valid catalog records;
- a total controller needs preflight or final maintenance gates.

## When Not To Use This Skill

Do not use this skill for autonomous catalog growth. Do not use it to research communities, pick new source targets, approve candidates, analyze skills, design packs, or evaluate publication readiness. Use `catalog-growth-ops` for growth-only runs and `nightly-catalog-ops` for the full scheduled controller.

## Inputs You Should Gather First

You should gather:

- current `git status --short --branch`;
- current catalog validation output if already available;
- current source registry and source state;
- `references/maintenance-checklist.md`, `references/failure-handling.md`, `references/permission-boundaries.md`, `references/commit-policy.md`, and `references/push-policy.md`;
- shared `../shared-references/integration-contract.md`, `../shared-references/artifact-contract.md`, and `../shared-references/script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- maintenance status JSON or summary;
- validation/index/render/drift/link results;
- a maintenance report when the run is non-trivial;
- clear handoff to `catalog-growth-ops` when growth is needed;
- no semantic catalog changes unless another owning skill already produced valid records.

## References To Read

- `references/maintenance-checklist.md` before running the maintenance sequence.
- `references/failure-handling.md` before deciding block vs warn-and-skip.
- `references/permission-boundaries.md` before source fetch or git action.
- `references/commit-policy.md` and `references/push-policy.md` only when explicitly authorized to commit or push maintenance-only changes.
- `../shared-references/script-policy.md` before adding or exposing helpers.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/maintenance-check.mjs` | Run deterministic maintenance gates only | Existing catalog and approved active/preview sources | JSON step report with `semantic_phases_run: false` | Block on structural failures; aggregate source sync failures | `npm --prefix .synergy run maintenance:run` |
| `scripts/catalog-status.mjs` | Report validation, index, docs drift, and link health | Existing catalog/indexes/public pages | JSON health report | Diagnostic unless validation/docs fail | `npm --prefix .synergy run catalog:status` |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate catalog | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |
| `../catalog-data/scripts/build-indexes.mjs` | Rebuild indexes | Valid catalog records | index files and manifest | Block on invalid records | `npm --prefix .synergy run catalog:index` |
| `../catalog-publishing/scripts/render-docs.mjs` | Render public pages | Valid catalog and indexes | README/docs pages | Block on render failure | publishing checks |
| `../catalog-publishing/scripts/check-docs-drift.mjs` | Verify rendered pages match expected output | Valid catalog and current public pages | drift report | Block on drift | `npm --prefix .synergy run publish:check` |
| `../catalog-publishing/scripts/check-links.mjs` | Verify public page links | Current public pages | link report | Block on broken links | `npm --prefix .synergy run publish:links` |

## Workflow

1. **Confirm maintenance-only scope.** You state that you are not doing discovery, curation, analysis, pack work, or evaluation. If the user asked for growth or total automation, hand off to `catalog-growth-ops` or `nightly-catalog-ops`.
2. **Check the working tree.** You inspect `git status --short --branch`. Preserve unrelated user changes and avoid committing unless explicitly authorized.
3. **Run strict validation.** You block on structural catalog errors.
4. **Run migrations only when needed.** You apply known schema migrations and validate afterward.
5. **Sync approved sources only.** You may sync `active` and `preview` sources. You do not discover or approve sources.
6. **Rebuild indexes.** You rebuild deterministic indexes from valid catalog records.
7. **Render and check public pages.** You render public pages, run drift and link checks, and run the public-boundary scan when public output changes.
8. **Report health and handoff.** You summarize results and hand any growth need to `catalog-growth-ops`.

## Quality Bar

Good maintenance work is boring, deterministic, and safe. It proves the catalog is structurally healthy, public pages are reproducible, approved sources can be checked, and any semantic follow-up is routed to the right owner without being attempted inside maintenance.

## Bad Patterns To Avoid

- Do not discover new sources from maintenance.
- Do not approve source candidates.
- Do not write skill analyses or relation edges.
- Do not synthesize or evaluate packs.
- Do not hide source sync failures behind a green summary.
- Do not commit unrelated user changes.

## Failure Handling

- If validation fails, stop and hand off to `catalog-data` with exact errors.
- If approved source sync partially fails, report failed source IDs and continue only with successful deterministic outputs when safe.
- If public rendering fails, hand off to `catalog-publishing`.
- If maintenance identifies missing coverage or an empty catalog, hand off to `catalog-growth-ops` rather than running discovery yourself.
- If git status has unrelated changes, do not commit them.

## Verification

Run:

```bash
npm --prefix .synergy run maintenance:run
npm --prefix .synergy run catalog:status
```

For focused checks, run:

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
npm --prefix .synergy run publish:render
npm --prefix .synergy run publish:check
npm --prefix .synergy run publish:links
```

## Handoff

Your handoff names maintenance helpers run, validation status, source sync summary, public page checks, files changed, skipped items, and the next owner. Use `catalog-growth-ops` for autonomous growth needs and `nightly-catalog-ops` for full scheduled operation.
