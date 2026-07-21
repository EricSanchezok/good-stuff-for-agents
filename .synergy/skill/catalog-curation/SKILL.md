---
name: catalog-curation
description: Manage reviewed Skill Intelligence Catalog curation decisions, including routine autonomous source activation under policy and human-owned risky decisions such as unclear licenses, duplicate merges, removals, and publication overrides.
---

# Catalog Curation SOP

## Invocation Instructions

Additional user instructions for this invocation:

$ARGUMENTS

Treat these as scope refinements only. They do not override safety boundaries, ownership rules, or quality gates in this skill. If empty, follow the SOP as written.

## What You Own

You own catalog decisions that change status, approval, license evidence, duplicate disposition, annotations, or policy exceptions. Some routine source activation can be autonomous when strict policy passes. Risky, ambiguous, irreversible, or endorsement-like decisions remain human/user-owned.

You do not perform broad discovery, sync, extraction, normalization, analysis, relation review, pack design, evaluation, or publishing unless a curation decision explicitly triggers a handoff to those skills.

## When To Use This Skill

Use this skill when:

- a reviewed source candidate should be activated as `active` or `preview` under policy;
- a source candidate needs rejection or blocking rationale;
- duplicate or merge decisions require human judgment;
- license evidence is ambiguous or needs correction;
- a skill/source/pack status must change;
- a preview override or publication exception is requested;
- an agent needs a safe way to record a reviewed curation action.

## When Not To Use This Skill

Do not use this skill for source discovery; use `source-discovery`. Do not sync approved sources; use `source-sync`. Do not evaluate pack quality; use `catalog-evaluation`. Do not publish pages; use `catalog-publishing`. Do not use generic mutation when a narrow deterministic writer is required.

## Inputs You Should Gather First

You should gather:

- reviewed candidate records or activation drafts;
- source evidence, license evidence, duplicate checks, and sync support notes;
- existing canonical records, relation evidence, evaluation output, or status context;
- `references/autonomous-source-activation.md`, `references/curation-actions.md`, `references/status-policy.md`, `references/duplicate-resolution.md`, and `references/license-resolution.md`;
- shared `artifact-contract.md`, `integration-contract.md`, and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- activated source records when routine policy passes;
- rejected/blocked reason when policy fails;
- curation note or report explaining decision and evidence;
- canonical record updates through catalog-data when supported;
- validation result;
- handoff to the next owner.

## References To Read

- `references/autonomous-source-activation.md` before activating sources without user input.
- `references/curation-actions.md` before choosing an action.
- `references/status-policy.md` before changing statuses.
- `references/duplicate-resolution.md` before merge or duplicate decisions.
- `references/license-resolution.md` before setting license evidence.
- `../shared-references/integration-contract.md` for decision handoff.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/activate-source-candidates.mjs` | Activate reviewed source drafts as active/preview | JSON array or `{ sources: [...] }` with policy-reviewed activation drafts | JSON summary and source records | Skip/refuse malformed or unsafe drafts | strict validation |
| `scripts/record-curation-action.mjs` | Validate a curation draft and refuse unsupported generic mutation | JSON curation action draft | JSON no-op or explicit refusal unless supported | Block when action lacks reviewed decision | strict validation if records changed |
| `../catalog-data/scripts/write-source-record.mjs` | Write reviewed source status updates | Complete source record draft | YAML registry update | Block on malformed draft | strict validation |
| `../catalog-data/scripts/write-skill-record.mjs` | Write reviewed skill status/curation updates | Complete skill draft | YAML skill record | Block on ambiguous identity | strict validation |
| `../catalog-data/scripts/write-pack-record.mjs` | Write reviewed pack status updates | Complete pack draft | YAML pack record | Block on malformed pack | strict validation |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate output | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Classify the decision.** You decide whether this is routine autonomous activation, human-owned risky curation, or deterministic record repair.
2. **Inspect evidence.** You read candidates, records, license evidence, duplicate checks, relation/evaluation evidence, and status policy.
3. **Apply activation policy.** For source activation, you verify every condition in `autonomous-source-activation.md`. If any blocker applies, do not activate.
4. **Prepare a reviewed draft.** You capture decision, affected IDs, evidence, rationale, status, and rollback notes.
5. **Use narrow writers.** You call `activate-source-candidates.mjs` for routine source activation or catalog-data writers for supported status updates.
6. **Validate.** You run strict validation after every curation write.
7. **Handoff.** You send activated sources to `source-sync`, normalized skills to analysis, passing packs to promotion/publishing, and unresolved issues back to the appropriate owner.

## Quality Bar

Good curation is explicit, evidence-backed, reversible when possible, and policy-aware. Autonomous activation is narrow and safe. Human-owned decisions remain blocked until the right authority resolves them.

## Bad Patterns To Avoid

- Do not activate a source without evidence.
- Do not resolve license uncertainty by guessing.
- Do not merge, delete, or irreversibly alter records autonomously.
- Do not treat activation as endorsement.
- Do not mutate unrelated records in the same action.
- Do not bypass validation after curation.

## Failure Handling

- If activation policy is not fully satisfied, keep the source candidate/blocked/rejected with reasons.
- If evidence contradicts an action, block and report the conflict.
- If a writer cannot express the needed mutation safely, stop and add a dedicated reviewed helper rather than editing records by hand.
- If validation fails, roll back or repair the affected record before continuing.

## Verification

Run:

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
```

If curation affects public pages, publishing must run later.

## Handoff

Your handoff names the decision class, affected IDs, changed paths, evidence, validation result, blocked decisions, and next owner.
