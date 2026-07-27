---
name: nightly-catalog-ops
description: "Coordinate the full autonomous Skill Intelligence Catalog run: maintenance preflight, growth, publishing, reporting, and read-only Git finalization audit planning. Use for scheduled or one-shot total catalog operation."
---

# Nightly Catalog Total Controller SOP

## Invocation Instructions

Additional user instructions for this invocation:

$ARGUMENTS

Treat these as scope refinements only. They do not override safety boundaries, ownership rules, or quality gates in this skill. If empty, follow the SOP as written.

## What You Own

You own the full scheduled/autonomous catalog operation — a single quality funnel from maintenance preflight through publication and read-only Git finalization audit planning. One invocation runs the entire pipeline without pauses for user input. You do not perform every phase yourself; you load the owner skill for each layer, enforce ordering, integrate results, and write the total run report. This skill never commits or pushes.

You coordinate `catalog-maintenance` for deterministic health gates and `catalog-growth-ops` for autonomous growth. You keep phase-specific judgment in the phase skills and keep scripts deterministic.

## Core Quality Funnel

Every nightly run follows this single path:

```
maintenance preflight → target selection → minimal evidence → contract preflight
→ one bridge repair (if needed) → synthesis → evaluation → promotion → publication
```

- **No pack is a legitimate success.** If no target passes contract preflight or no candidate can be closed after one bridge repair, the run ends cleanly with a documented no-pack outcome.
- **Preflight before deep work.** Promise the pack closes before spending tokens on deep analysis or evaluation.
- **One bridge repair per target.** If contract preflight finds gaps, one bounded repair attempt is allowed. If it still fails, the target is rejected and the run moves to the next ranked target.
- **Same failure fingerprint blocks retry.** If a target fails contract preflight with the same gap fingerprint as a prior run, skip it immediately; do not waste budget proving the same failure again.
- **Only preflight-passed packs reach evaluation.** Evaluation and publication are reserved for packs that have passed contract preflight.

## When To Use This Skill

Use this skill when:

- a scheduled catalog run should perform the full quality funnel from upkeep through publication;
- the user asks to run the whole catalog workflow;
- a run should publish public pages after growth and maintenance gates;
- an external trusted controller needs a read-only consistency plan for ordinary catalog/docs/report changes;
- you need one controller to summarize all maintenance and growth outcomes.

## When Not To Use This Skill

Do not use this skill for maintenance-only巡检; load `catalog-maintenance`. Do not use it for growth-only work; load `catalog-growth-ops`. Do not use it to bypass license, privacy, destructive git, external identity, or unrelated-change boundaries.

## Inputs You Should Gather First

You should gather:

- current git branch, upstream, full `HEAD`, and working tree status;
- run description mode for historical reporting; never treat summary fields as current Git authorization;
- latest maintenance, growth, and nightly reports when present;
- current pack lifecycle state: candidate, evaluated, stale/impacted, published, blocked, or no-op;
- recent failure fingerprints from prior runs for dedup;
- `references/nightly-runbook.md`, `references/orchestration-boundaries.md`, `references/run-report-template.md`, and `references/git-automation-policy.md`;
- shared `../shared-references/integration-contract.md`, `../shared-references/artifact-contract.md`, and `../shared-references/script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- total run report under `reports/nightly-catalog-ops/<YYYY-MM-DD-HHmmss>-run.md` for non-trivial runs;
- failure fingerprints for any target that failed contract preflight or evaluation, for cross-run dedup;
- maintenance preflight and final check results;
- growth report reference and summary;
- public publishing results when public pages changed;
- read-only Git finalization audit plan and external trusted-controller handoff;
- explicit blockers and next owner when the run cannot finish.

## References To Read

- `references/nightly-runbook.md` before running the total sequence.
- `references/orchestration-boundaries.md` before deciding whether to continue or stop.
- `references/run-report-template.md` before writing the total report.
- `references/git-automation-policy.md` before generating the read-only Git audit plan.
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

1. **Confirm run scope.** Identify whether the run is read-only or may write catalog artifacts. Record any historical authorization fields as run description only; they never authorize Git mutation.
2. **Load `catalog-maintenance` for preflight.** You run or follow maintenance preflight: git status, validation, migration, source sync for approved sources, index/render/check gates as appropriate. Classify structural failures before stopping; route reversible, meaning-preserving repair to `catalog-data` and retry validation at most twice.
3. **Set publication mode and target.** Read recent nightly summaries and current pack lifecycle state. Use `recovery` mode when 3 completed full runs have produced no new pack, or when at least one pack has previously been published and 7 days have elapsed since the latest publication; otherwise use `normal`. Select the closest-to-publication target in this order: passing candidate, high-scoring needs-work candidate, stale pack needing bounded repair, relation-backed intent, then an intent missing a small evidence set. **Check failure fingerprints from prior runs.** If the selected target has the same contract-preflight failure fingerprint as a prior run, skip it and try the next ranked target. Record skipped targets and the fingerprint match that blocked them.
4. **Load `catalog-growth-ops`.** Pass the mode, target, and any known failure fingerprints. Growth assembles a minimal evidence bundle for the target — only the skill records, analyses, and relation edges needed to define and validate the pack contract. Growth does not broad-discovery unless the evidence bundle itself is missing. If growth returns `insufficient_evidence` for the target, record the gap and try the next ranked target.
5. **Contract preflight (via `pack-synthesis` with `--preflight-only`).** Before any deep synthesis or evaluation, prove the pack can close. Load `pack-synthesis` to perform contract preflight: define the entry input, terminal outcome, ordered stages, structured handoffs, and conditional branches. Every main-path stage must have a member skill. If the pack is incomplete, preflight fails and produces an error report, not a candidate. A target that fails preflight with an unremediated gap receives one bridge repair.
6. **One bridge repair (if needed).** If contract preflight finds gaps in one stage or one handoff, attempt exactly one bounded repair: add or replace one member, redesign one stage, or produce one missing analysis. Rerun contract preflight. If it still fails, record the failure fingerprint (intent + gap set) for cross-run dedup, mark the target `rejected`, and try the next ranked target. If it passes, proceed to full synthesis.
7. **Full synthesis and evaluation.** Load `pack-synthesis` to write the candidate from the preflight-validated contract. Then load `catalog-evaluation` to score the candidate — evaluation only runs against preflight-passed packs. If evaluation passes the `0.78` threshold, promote and publish. If evaluation returns `needs_work` on a repairable dimension, one targeted repair is allowed; if that fails, reject the target. No more than one repair attempt after evaluation.
8. **Resolve target outcomes.** A target may receive at most one bridge repair (contract preflight), plus at most one post-evaluation repair, for a maximum of 2 substantive repair attempts total. If it passes, promote and publish it. If it fails at any stage, record the terminal outcome, failure fingerprint, and try the next ranked target when the per-run limit of 2 targets has not been reached. Do not count an unchanged resubmission as an attempt.
9. **Load `catalog-maintenance` for final gates.** You rerun validation, indexing, public rendering, drift, links, status, and public-boundary scan.
10. **Load `catalog-publishing` when public output needs focused repair.** You keep public docs visitor-facing and never hand-edit generated public sections as a workaround.
11. **Assemble the summary JSON and write the report.** Build the machine-readable summary with terminal states and structured `publication_progress` per `references/run-summary-schema.md`. The report must prove mode selection, ranked/attempted targets, contract-preflight results, repair attempts, failure fingerprints, publication outcome, and any no-publish reason. Write and validate via `nightly:report:write` and `nightly:report:check`, then run `nightly:states:check`.
12. **Produce a read-only Git finalization audit plan.** After trusted gates finish, write an exact touched-paths manifest with `base_head`, bind its repository-relative path and SHA-256 digest into the validated schema-v2 summary, then run `nightly:git:audit -- --summary <summary.json> --touched-paths <manifest.json> --expected-head <full-head-oid>`. The audit reads only the selected JSON and Git status/branch/upstream/HEAD metadata. It never runs gates, hooks, npm, commit, or push. `ready_for_trusted_controller_review` means structural and path consistency only; workspace JSON cannot authorize Git.
13. **Handoff or stop.** If the run is blocked, state the owner and exact next action. Otherwise hand the audit plan to an external trusted controller, which must independently obtain current authorization, run gates from trusted code, bind blobs/index/tree, commit, verify the final tree/parent, and push the exact upstream ref.

## Quality Bar

A good total run is coherent and auditable. It proves that every target was either closed (passed or no-pack) or blocked by concrete evidence — not by budget exhaustion or timeout. Maintenance proves the repo is healthy, growth supplies the minimum evidence a target needs, preflight proves the pack contract closes before tokens are spent on deep work, evaluation scores only preflight-passed packs, publishing remains clean, reports explain decisions, and Git finalization remains outside repository-controlled code and data.

## Bad Patterns To Avoid

- Do not duplicate `catalog-growth-ops` phase instructions inside this skill.
- Do not make maintenance scripts perform growth work.
- Do not hide failed growth behind passing maintenance.
- Do not run deep analysis or evaluation against a pack that has not passed contract preflight.
- Do not retry a target whose contract-preflight failure fingerprint matches a prior run.
- Do not stage, commit, push, run hooks, or infer a push target from this skill.
- Do not execute gates or working-tree code from the Git audit helper.
- Do not ask the user for routine discovery targets during an authorized full run; growth owns that decision.

## Failure Handling

- If maintenance preflight fails, classify the error. Retry reversible structural repair through `catalog-data` at most twice; stop immediately for semantic ambiguity, unsafe mutation, or failure after the retry budget.
- If growth hits a policy blocker for one target, record it and switch to the next ranked target when the per-run target budget remains. Continue unaffected safe phases only when validation can still pass.
- If contract preflight fails and the one bridge repair does not close it, record the failure fingerprint and reject that target.
- If evaluation fails after one post-evaluation repair attempt, reject the target with the failure-mode classification.
- If publishing checks fail, hand off to `catalog-publishing` and rerun final gates after fixes. Stop only when the repair budget is exhausted or the input is not public-eligible.
- If Git metadata, manifest paths, digest, branch, or base `HEAD` are inconsistent, emit a non-ready audit plan and report the exact reason.
- If unrelated user changes exist, keep them outside the manifest and route all final Git decisions to the external trusted controller.

## Verification

Run the total final gate set:

```bash
npm --prefix .synergy run nightly:full-check
```

For report and terminal-state validation, run:

```bash
npm --prefix .synergy run nightly:report:write -- --input <summary.json>
npm --prefix .synergy run nightly:report:check -- --input <summary.json>
npm --prefix .synergy run nightly:states:check -- --input <summary.json>
```

For read-only Git finalization audit planning:

```bash
npm --prefix .synergy run nightly:git:audit -- --summary <summary.json> --touched-paths <touched-paths.json> --expected-head <full-head-oid>
```

The legacy `nightly:git` alias invokes the same read-only audit. Neither command accepts mutation flags.

## Handoff

Your final handoff lists publication mode and outcome, selected targets and repair attempts, maintenance results, growth results, public page results, report paths, terminal-state counts, validation commands, read-only Git audit plan, trusted-controller warning, blockers, and next-run priorities.
