---
name: nightly-catalog-ops
description: "Coordinate the full autonomous Skill Intelligence Catalog run: maintenance preflight, growth, publishing, reporting, and authorized git handling. Use for scheduled or one-shot total catalog operation."
---

# Nightly Catalog Total Controller SOP

## What You Own

You own the full scheduled/autonomous catalog operation. You do not perform every phase yourself; you load the owner skill for each layer, enforce ordering, integrate results, write the total run report, and handle authorized commit/push.

You coordinate `catalog-maintenance` for deterministic health gates and `catalog-growth-ops` for autonomous growth. You keep phase-specific judgment in the phase skills and keep scripts deterministic.

## When To Use This Skill

Use this skill when:

- a scheduled catalog run should perform both upkeep and growth;
- the user asks to run the whole catalog workflow;
- a run should publish public pages after growth and maintenance gates;
- authorized automation should commit and push ordinary catalog/docs/report changes;
- you need one controller to summarize all maintenance and growth outcomes.

## When Not To Use This Skill

Do not use this skill for maintenance-only巡检; load `catalog-maintenance`. Do not use it for growth-only work; load `catalog-growth-ops`. Do not use it to bypass license, privacy, destructive git, external identity, or unrelated-change boundaries.

## Inputs You Should Gather First

You should gather:

- current git branch, remote, and working tree status;
- authorization mode: read-only, local-write, commit, push, or scheduled automation;
- latest maintenance, growth, and nightly reports when present;
- current pack lifecycle state: candidate, evaluated, stale/impacted, published, blocked, or no-op;
- `references/nightly-runbook.md`, `references/orchestration-boundaries.md`, `references/run-report-template.md`, and `references/git-automation-policy.md`;
- shared `../shared-references/integration-contract.md`, `../shared-references/artifact-contract.md`, and `../shared-references/script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- total run report under `reports/nightly-catalog-ops/<YYYY-MM-DD>-run.md` for non-trivial runs;
- maintenance preflight and final check results;
- growth report reference and summary;
- public publishing results when public pages changed;
- commit/push summary when authorized;
- explicit blockers and next owner when the run cannot finish.

## References To Read

- `references/nightly-runbook.md` before running the total sequence.
- `references/orchestration-boundaries.md` before deciding whether to continue or stop.
- `references/run-report-template.md` before writing the total report.
- `references/git-automation-policy.md` before committing or pushing.
- `../shared-references/integration-contract.md` for cross-skill handoffs.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `../catalog-maintenance/scripts/maintenance-check.mjs` | Run deterministic maintenance gates | Existing catalog and approved sources | JSON step report | Block on structural failure | `npm --prefix .synergy run maintenance:run` |
| `../catalog-maintenance/scripts/catalog-status.mjs` | Report catalog health | Existing catalog/indexes/public pages | JSON status report | Diagnostic or block on failed gates | `npm --prefix .synergy run catalog:status` |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate catalog | Existing catalog | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |
| `../catalog-data/scripts/promote-pack-candidates.mjs` | Promote passing candidate packs | Candidate pack records with passing evaluations | published pack records | Promote only records that satisfy policy | validation and publishing checks |
| `../catalog-publishing/scripts/render-docs.mjs` | Render public pages after owner outputs | Valid catalog | README/docs pages | Block on render failure | publishing checks |

## Workflow

1. **Confirm total-run authorization.** You identify whether the run may write files, commit, and push. Scheduled automation or explicit user instruction can authorize ordinary commits/pushes; otherwise stop before git actions.
2. **Load `catalog-maintenance` for preflight.** You run or follow maintenance preflight: git status, validation, migration, source sync for approved sources, index/render/check gates as appropriate.
3. **Load `catalog-growth-ops`.** You run autonomous growth: demand scan, source discovery, activation, sync, extraction, normalization, analysis, relations, pack lifecycle work, evaluation, and growth report.
4. **Resolve touched pack lifecycle states.** After growth returns, inspect candidate, changed, stale, impacted, and published packs touched by this run. Continue with the owning skill when the next step is available and no blocker exists. Passing candidates should be promoted through catalog-data and rendered by publishing; needs-work/rejected packs keep evaluation reasons; stale/impacted packs are updated, re-evaluated, re-published, marked no-op, or blocked with owner and reason.
5. **Load `catalog-maintenance` for final gates.** You rerun validation, indexing, public rendering, drift, links, status, and public-boundary scan.
6. **Load `catalog-publishing` when public output needs focused repair.** You keep public docs visitor-facing and never hand-edit generated public sections as a workaround.
7. **Write total run report.** You summarize maintenance, growth, publishing, touched objects and their terminal states, skipped phases, blockers, verification, and git actions.
8. **Commit and push only when authorized.** You inspect status/diff, exclude unrelated user changes, commit with the required co-author footer, and push normally. Never force push.
9. **Handoff or stop.** If the run is blocked, state the owner and exact next action. If complete, state the terminal states reached, commit/push state, and next-run priorities.

## Quality Bar

A good total run is coherent and auditable. Maintenance proves the repo is healthy, growth advances evidence when possible, publishing remains clean, reports explain decisions, and git actions are safe and authorized.

## Bad Patterns To Avoid

- Do not duplicate `catalog-growth-ops` phase instructions inside this skill.
- Do not make maintenance scripts perform growth work.
- Do not hide failed growth behind passing maintenance.
- Do not commit unrelated files.
- Do not force push or use destructive git.
- Do not ask the user for routine discovery targets during an authorized full run; growth owns that decision.

## Failure Handling

- If maintenance preflight fails, stop and hand off to `catalog-maintenance` or `catalog-data`.
- If growth hits policy blockers, record them and continue unaffected safe phases only when validation can still pass.
- If publishing checks fail, hand off to `catalog-publishing` and rerun final gates after fixes.
- If git is unsafe, skip commit/push and report the exact branch/status reason.
- If unrelated user changes exist, do not include them in commits.

## Verification

Run the total final gate set:

```bash
npm --prefix .synergy run check
npm --prefix .synergy run maintenance:run
npm --prefix .synergy run catalog:status
```

Also run the public-boundary scan from `../shared-references/public-surface-boundary.md` whenever public pages change.

## Handoff

Your final handoff lists maintenance results, growth results, public page results, report paths, validation commands, commits, push state, blockers, and next-run priorities.
