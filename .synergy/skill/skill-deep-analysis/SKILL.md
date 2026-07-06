---
name: skill-deep-analysis
description: Deeply analyze canonical skill records for purpose, trigger semantics, capabilities, workflow role, inputs/outputs, tool and permission profile, compatibility, conflicts, dedupe notes, and evaluation hooks. Use when catalog skills are new or changed and need catalog/analyses markdown plus quality/confidence updates.
---

# Skill Deep Analysis SOP

## What You Own

You own the evidence-based analysis that explains what a canonical skill does, when an agent should load it, what inputs and outputs it expects, which tools and permissions it uses, what risks it creates, and how it should be evaluated or related to other skills.

You do not own extraction, canonical identity creation, relation edge writing, pack synthesis, or publication decisions. Your analysis informs those phases.

## When To Use This Skill

Use this skill when:

- a new or changed canonical skill lacks current analysis;
- trigger semantics, capability boundaries, tool risk, or workflow role need evidence;
- pack synthesis needs analysis paths and evaluation hooks;
- relation review needs dedupe or compatibility notes.

## When Not To Use This Skill

Do not use this skill to invent missing upstream evidence. Do not normalize IDs; use `skill-normalization`. Do not append relation edges; use `skill-dedup-relations`. Do not score a pack; use `catalog-evaluation`.

## Inputs You Should Gather First

You should gather:

- canonical skill records;
- upstream artifact content or snapshot URLs when available;
- existing analysis markdown;
- `references/analysis-template.md`, `references/analysis-rubric.md`, `references/capability-taxonomy.md`, and `references/tool-risk-taxonomy.md`;
- relation records for context;
- shared `artifact-contract.md` and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- agent-authored analysis draft JSON under `reports/skill-analysis/<skill-id>.json` for substantial analysis;
- analysis markdown under `catalog/analyses/<prefix>/<skill-id>.md` written through catalog-data;
- confidence notes and evidence gaps;
- validation result.

## References To Read

- `references/analysis-template.md` before structuring sections.
- `references/analysis-rubric.md` before assigning confidence.
- `references/capability-taxonomy.md` before naming domains or capabilities.
- `references/tool-risk-taxonomy.md` before describing side effects.
- `../shared-references/artifact-contract.md` for output paths.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/write-analysis-drafts.mjs` | Write analysis markdown from reviewed analysis drafts | JSON object with `analyses` array or one analysis draft | JSON result with analysis paths and hashes | Block on missing skill ID or sections | strict validation |
| `../catalog-data/scripts/write-analysis.mjs` | Write one analysis markdown file | Complete analysis draft | markdown analysis file and hash JSON | Block on malformed draft | strict validation |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate analysis metadata and catalog | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Select skills.** You choose skill IDs based on new records, changed version IDs, stale analysis, or downstream request.
2. **Inspect evidence.** You read the skill record and upstream artifact content when available. You do not rely only on the display name.
3. **Analyze purpose and triggers.** You describe the task the skill owns, explicit triggers, non-triggers, and where it fits in a workflow.
4. **Analyze capability and interfaces.** You identify domains, task types, workflow stages, inputs, outputs, handoff outputs, and tool requirements.
5. **Analyze risk and compatibility.** You note side effects, permissions, external actions, security concerns, overlaps, complements, conflicts, and dedupe hints.
6. **Assign confidence.** You lower confidence for missing source content, unclear triggers, unknown license, or unverified tool behavior.
7. **Write reviewed draft.** You create a complete analysis draft with section text.
8. **Call the writer and validate.** You write analysis markdown through the helper and run strict validation.

## Quality Bar

Good analysis is specific, evidence-backed, and useful to downstream agents. It tells an agent when to load the skill, how to use it well, where it can fail, and what evidence supports the confidence level.

## Bad Patterns To Avoid

- Do not write boilerplate analysis for every skill.
- Do not inflate confidence to support a pack.
- Do not claim compatibility without relation evidence.
- Do not ignore tool permissions or external-action risks.
- Do not replace detailed analysis with taxonomy labels only.

## Failure Handling

- If upstream content is unavailable, write a low-confidence analysis only if existing records provide enough evidence; otherwise block.
- If a skill record is malformed, return to `skill-normalization` or `catalog-data`.
- If a tool risk is unclear, mark it as unresolved and hand off for review.
- If analysis writing fails, repair the draft and rerun validation.

## Verification

Run:

```bash
npm --prefix .synergy run catalog:validate
```

When analysis affects packs or public pages, also run:

```bash
npm --prefix .synergy run catalog:index
```

## Handoff

Hand off to `skill-dedup-relations` with skill IDs, analysis paths, dedupe notes, compatibility notes, conflicts, confidence levels, and validation result.
