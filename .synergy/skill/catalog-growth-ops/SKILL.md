---
name: catalog-growth-ops
description: Run autonomous Skill Intelligence Catalog growth only. Use when the agent should choose demand-driven discovery targets, discover and activate high-confidence public sources, and drive extraction, normalization, analysis, relations, pack synthesis, and evaluation through owner skills.
---

# Catalog Growth Operations SOP

## Invocation Instructions

Additional user instructions for this invocation:

$ARGUMENTS

Treat these as scope refinements only. They do not override safety boundaries, ownership rules, or quality gates in this skill. If empty, follow the SOP as written.

## What You Own

You own autonomous catalog growth. You decide what the catalog should inspect next, based on catalog gaps, public demand signals, source quality, ecosystem activity, and prior reports. You do not wait for the user to name domains, search targets, or source counts during a normal growth run.

You coordinate growth phases by loading each owning skill and following its SOP. You do not hide semantic decisions in scripts. Scripts only write reviewed drafts, activate reviewed sources, validate records, sync approved sources, or report deterministic status.

## When To Use This Skill

Use this skill when:

- the catalog is empty and needs its first sources;
- source coverage is stale, sparse, or unbalanced;
- a scheduled run needs autonomous discovery and ingestion;
- existing sources produced new snapshots that need extraction and downstream analysis;
- analyzed skills are ready for relation review, pack synthesis, and evaluation;
- `nightly-catalog-ops` delegates the growth portion of the total workflow.

## When Not To Use This Skill

Do not use this skill for maintenance-only巡检; use `catalog-maintenance`. Do not use it for final total scheduling, reporting, commit, and push; use `nightly-catalog-ops`. Do not use it to bypass policy blockers for license, private sources, credentials, sensitive content, merges, deletes, or irreversible decisions.

## Inputs You Should Gather First

You should gather:

- current catalog status and indexes;
- previous growth or nightly reports when present;
- source registry, candidates, state, snapshots, skill candidates, skill records, analyses, relations, packs, and evaluations;
- `references/demand-scan-policy.md`, `references/autonomous-discovery-policy.md`, `references/growth-runbook.md`, `references/source-activation-policy.md`, `references/growth-report-template.md`, and `references/growth-quality-gate.md`;
- shared `../shared-references/integration-contract.md`, `../shared-references/artifact-contract.md`, and `../shared-references/script-policy.md`.

Use one timestamped run ID for the whole growth run, formatted as `run_<YYYY-MM-DD-HHmmss>`. Use the same timestamp for growth report filenames and pass it to candidate writers that accept `--run-id`.

## Outputs You Must Leave Behind

You must leave behind:

- growth report under `reports/catalog-growth-ops/<YYYY-MM-DD-HHmmss>-growth.md` for non-trivial runs;
- discovery reports and candidate drafts when sources are inspected;
- activated source records only when policy passes;
- source snapshots, skill candidates, normalized records, analyses, relation edges, pack candidates, and evaluations when each phase has sufficient evidence;
- a terminal-state decision for every source, skill, relation, pack intent, candidate pack, stale published pack, or impacted pack touched by growth;
- validation and index results;
- clear next-run priorities and blockers.

## References To Read

- `references/demand-scan-policy.md` before choosing discovery themes.
- `references/autonomous-discovery-policy.md` before searching.
- `references/source-activation-policy.md` before activating sources.
- `references/growth-runbook.md` before running phases.
- `references/growth-quality-gate.md` before declaring success.
- `references/growth-report-template.md` before writing reports.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `../source-discovery/scripts/ingest-source-candidates.mjs` | Append reviewed source candidate drafts | Reviewed candidate JSON | candidate JSONL entries | Block on malformed candidate | catalog validation |
| `../catalog-curation/scripts/activate-source-candidates.mjs` | Activate reviewed high-confidence source drafts | Reviewed activation JSON | active/preview source records | Skip/refuse unsafe drafts | catalog validation |
| `../source-sync/scripts/sync-sources.mjs` | Sync active/preview sources | source registry | snapshot manifests and state events | Aggregate per-source failures | catalog validation |
| `../skill-extraction/scripts/write-skill-candidates.mjs` | Write skill candidates from snapshots | snapshot artifacts or latest manifests | candidate JSONL | Aggregate malformed artifacts | catalog validation |
| `../skill-normalization/scripts/write-normalized-skills.mjs` | Write reviewed normalized skill drafts | normalized skill draft JSON | skill YAML records | Block on missing identity/source | catalog validation |
| `../skill-deep-analysis/scripts/write-analysis-drafts.mjs` | Write reviewed analysis drafts | complete analysis draft JSON | analysis markdown | Block on missing sections | catalog validation |
| `../skill-dedup-relations/scripts/append-relation-drafts.mjs` | Append reviewed relation edges | relation draft JSON/JSONL | relation edge JSONL | Block on malformed edges | catalog validation/index |
| `../pack-synthesis/scripts/write-pack-candidate.mjs` | Write reviewed pack candidate | pack draft JSON | candidate pack YAML | Block on missing member evidence | catalog validation |
| `../catalog-evaluation/scripts/write-evaluation-draft.mjs` | Write reviewed evaluation draft | evaluation draft JSON | evaluation JSON | Block on missing rubric evidence | catalog validation |
| `../catalog-data/scripts/detect-impact.mjs` | Detect stale published packs | catalog records | impact report and stale updates | Diagnostic/structural | catalog validation |

## Workflow

1. **Confirm growth-only scope.** You are growing the catalog, not performing a maintenance-only check and not finalizing the total scheduled run.
2. **Assess catalog gaps.** You inspect source count, skill count, domains, stale signals, candidate queues, failed sources, missing analyses, missing relations, and pack coverage.
3. **Scan demand.** You inspect public/community demand signals using the demand scan policy. If the catalog is empty, discovery is mandatory.
4. **Plan a bounded batch.** You choose discovery themes and a source batch without asking the user for targets or counts.
5. **Load `source-discovery`.** You follow its SOP to inspect candidate sources, record evidence, and write candidate drafts/reports.
6. **Apply source activation policy.** You activate only high-confidence public GitHub sources with clear evidence. You leave ambiguous sources as candidates, blocked, rejected, or next-run items.
7. **Load `source-sync`.** You sync active/preview sources and collect snapshot manifests.
8. **Load `skill-extraction`.** You write skill candidates from changed or latest snapshots.
9. **Load `skill-normalization`.** You normalize clear candidates into canonical records and block ambiguous identity cases.
10. **Load `skill-deep-analysis`.** You write analysis for new or changed skills.
11. **Load `skill-dedup-relations`.** You append evidence-backed relation edges and leave merge/delete decisions blocked.
12. **Run impact detection.** You use catalog-data impact checks for stale published packs.
13. **Resolve pack lifecycle work.** For every pack intent, candidate pack, stale published pack, or impacted pack discovered in this run, decide the terminal action for this run: no-op with reason, synthesize/update, evaluate, mark needs-work/rejected, make promotion-ready, or block with owner. Do not leave pack work in raw pending state when an owner skill can continue.
14. **Load `pack-synthesis` when needed.** You choose pack intents from demand scan, catalog gaps, and analyzed compatible skills. You skip only when evidence is insufficient and record a no-op or blocker.
15. **Load `catalog-evaluation` when needed.** You evaluate candidate packs and write reviewed evaluation output. Missing or medium-confidence evidence should produce a `needs_work` evaluation rather than an unevaluated pending state.
16. **Validate and index.** You run catalog validation and index rebuild after writes.
17. **Write growth report.** You record inspected demand, sources, activated records, phase outputs, pack lifecycle terminal states, skipped items, blockers, and next-run priorities.

## Quality Bar

Good growth work adds or advances real catalog evidence without fake filler. It chooses targets from demand and gaps, activates only safe high-confidence sources, produces traceable artifacts, follows each phase skill, validates after writes, and reports what remains blocked.

## Bad Patterns To Avoid

- Do not ask the user where to search during normal autonomous growth.
- Do not write fake sources, skills, analyses, packs, or evaluations.
- Do not activate sources with unclear license or private/credential requirements.
- Do not merge/delete/endorse sources without human-owned curation.
- Do not force packs when there are not enough analyzed compatible skills.
- Do not build a monolithic script for semantic phases.

## Failure Handling

- If public demand signals are sparse, choose conservative discovery themes from catalog gaps and prior reports.
- If source evidence is strong but sync tooling does not support the URL, keep it candidate/blocked with tooling notes.
- If license is unclear, block activation and preserve evidence.
- If downstream phase inputs are absent, skip that phase with a report rather than fabricating artifacts.
- If validation fails, stop and hand off to `catalog-data` with exact errors.

## Verification

Run after growth writes:

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
npm --prefix .synergy run catalog:impact
```

When growth affects public-ready records, final publishing checks are handled by `catalog-maintenance`, `catalog-publishing`, or `nightly-catalog-ops`.

## Handoff

Hand off to `nightly-catalog-ops` for total finalization, publishing checks, commit, and push. Include growth report path, sources inspected/activated/blocked, phase outputs, validation results, and next-run priorities.
