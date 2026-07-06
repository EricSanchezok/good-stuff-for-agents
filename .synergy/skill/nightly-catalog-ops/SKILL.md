---
name: nightly-catalog-ops
description: Coordinate scheduled Skill Intelligence Catalog maintenance. Use for deterministic maintenance checks, source freshness, validation, reporting, safe git handling when explicitly authorized, and handoffs to project skills for agent-led semantic phases.
---

# Catalog Maintenance Orchestration SOP

## What You Own

You own scheduled or batch coordination for the catalog. You run deterministic maintenance checks, summarize status, coordinate handoffs to project skills, write reports, and commit/push only when explicitly authorized by the user or automation policy.

You do not let a maintenance helper perform discovery, normalization, analysis, relation review, pack synthesis, evaluation, or curation decisions. Those phases remain owned by their project skills.

## When To Use This Skill

Use this skill when:

- a user asks for scheduled or full-catalog maintenance;
- you need a start/end validation sweep;
- you need to coordinate source sync, extraction, analysis, relation review, pack work, evaluation, publishing, and reports;
- you need a safe status report for current catalog health;
- an automation run is authorized to commit and push ordinary updates.

## When Not To Use This Skill

Do not use this skill as a shortcut around phase skills. Do not run semantic phases through a helper. Do not commit or push unless the user or approved automation explicitly authorizes it. Do not send messages or perform external identity actions.

## Inputs You Should Gather First

You should gather:

- explicit run scope and authorization level;
- current git status and remote state;
- validation status;
- `references/nightly-checklist.md`, `references/failure-handling.md`, `references/commit-policy.md`, `references/push-policy.md`, and `references/permission-boundaries.md`;
- shared `integration-contract.md`, `artifact-contract.md`, and `script-policy.md`;
- reports from any phase-specific skills already run.

## Outputs You Must Leave Behind

You must leave behind:

- maintenance status output from deterministic checks;
- run report under `reports/` when the work is non-trivial;
- changed catalog/public files only when owners produced valid outputs;
- validation, render, drift, link, and scan results when publishing occurs;
- git commit and push only when explicitly authorized.

## References To Read

- `references/nightly-checklist.md` before orchestration.
- `references/failure-handling.md` before deciding continue vs stop.
- `references/commit-policy.md` before creating commits.
- `references/push-policy.md` before pushing.
- `references/permission-boundaries.md` before network or external actions.
- `../shared-references/integration-contract.md` for phase handoffs.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/maintenance-check.mjs` | Run validation, migration, source sync, indexing, render, drift, links, and final validation only | Existing catalog and approved source records | JSON step report | Block on structural gate failure; aggregate source sync failures | `npm --prefix .synergy run maintenance:run` |
| `scripts/catalog-status.mjs` | Report catalog counts and health | Existing catalog/indexes | JSON status report | Diagnostic only | inspect output |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate catalog | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |
| `../catalog-publishing/scripts/render-docs.mjs` | Render public pages after owner outputs | Valid catalog | public pages | Block on render failure | publishing checks |

## Workflow

1. **Confirm authorization.** You state what the run may do: read only, write local files, fetch sources, commit, push, or stop before git actions. If authorization is missing, do not commit or push.
2. **Check starting state.** You run git status and strict validation. If the tree has unrelated user changes, you preserve them and scope your edits.
3. **Run deterministic maintenance.** You may run `scripts/maintenance-check.mjs` for structural gates and approved source sync. This helper must not perform semantic phases.
4. **Coordinate semantic phases.** When discovery, extraction, normalization, analysis, relations, pack synthesis, evaluation, or curation is needed, you invoke the owning skill and follow its SOP. You pass artifacts between skills using the shared artifact contract.
5. **Publish only eligible outputs.** After records are valid and eligible, you hand off to `catalog-publishing` or run its checks as part of maintenance.
6. **Write the run report.** You summarize steps, changed paths, failures, skipped items, and next actions.
7. **Handle git safely.** If explicitly authorized, you create commits with the required co-author footer and push normally. You never force push.
8. **End with verification.** You run final validation and publishing checks for any public changes.

## Quality Bar

Good orchestration is transparent. Every semantic decision is owned by a skill, every deterministic helper has a clear output, failures are scoped to the owning phase, and git actions happen only under explicit authorization.

## Bad Patterns To Avoid

- Do not use a single helper to perform the full semantic workflow.
- Do not auto-curate human-owned decisions.
- Do not hide failed phases behind a green maintenance status.
- Do not commit unreviewed unrelated user changes.
- Do not push if authorization is absent or branch state is unsafe.

## Failure Handling

- If validation fails at start, stop and fix structural data before downstream work.
- If source sync partially fails, report failed sources and continue only with successful snapshots.
- If a semantic phase is needed, hand off to the owner skill instead of scripting it.
- If publishing fails, return to `catalog-publishing`.
- If git push fails, report branch/remotes and do not retry destructively.

## Verification

Run the relevant set:

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
npm --prefix .synergy run publish:render
npm --prefix .synergy run publish:check
npm --prefix .synergy run publish:links
npm --prefix .synergy run catalog:status
```

For a full deterministic maintenance pass, run:

```bash
npm --prefix .synergy run maintenance:run
```

## Handoff

Your handoff lists run scope, helpers invoked, project skills invoked, artifacts written, checks passed, failures, skipped records, git actions, and next recommended skill or user decision.
