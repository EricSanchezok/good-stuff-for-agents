---
name: catalog-curation
description: Human-triggered correction workflow for the Skill Intelligence Catalog. Use when approving or rejecting source candidates, resolving duplicate candidates, setting license evidence, changing skill/source/pack status, annotating records, approving preview overrides, or handling decisions automation should not make.
---

# Catalog Curation SOP

## What You Own

You own human-triggered catalog decisions that should not be automated: approvals, rejections, status changes, duplicate resolution, license evidence resolution, preview overrides, annotations, and policy exceptions.

You do not perform broad discovery, sync, extraction, normalization, analysis, relation review, pack design, evaluation, or publishing unless the curation decision explicitly triggers a handoff to those skills.

## When To Use This Skill

Use this skill when:

- a source candidate needs approval or rejection;
- duplicate or merge decisions require human judgment;
- license evidence is ambiguous;
- a skill/source/pack status must change;
- a preview override or publication exception is requested;
- an agent needs a safe way to record a reviewed curation action.

## When Not To Use This Skill

Do not use this skill for deterministic record writes that need no decision; use `catalog-data`. Do not use it to evaluate pack quality; use `catalog-evaluation`. Do not use it to publish pages; use `catalog-publishing`.

## Inputs You Should Gather First

You should gather:

- the explicit user or reviewer decision;
- candidate records, existing canonical records, relation evidence, evaluation output, or license evidence;
- `references/curation-actions.md`, `references/status-policy.md`, `references/duplicate-resolution.md`, and `references/license-resolution.md`;
- shared `artifact-contract.md`, `integration-contract.md`, and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- a curation note or report explaining the decision;
- canonical record updates through catalog-data when supported;
- rejected/blocked reason where applicable;
- validation result;
- a handoff to the next owner.

## References To Read

- `references/curation-actions.md` before choosing an action.
- `references/status-policy.md` before changing statuses.
- `references/duplicate-resolution.md` before merge or duplicate decisions.
- `references/license-resolution.md` before setting license evidence.
- `../shared-references/integration-contract.md` for decision handoff.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/record-curation-action.mjs` | Validate a curation draft and refuse unsupported generic mutation | JSON curation action draft | JSON no-op or explicit refusal unless supported | Block when action lacks reviewed decision | strict validation if records changed |
| `../catalog-data/scripts/write-source-record.mjs` | Write approved source status updates | Complete source record draft | YAML source record | Block on malformed draft | strict validation |
| `../catalog-data/scripts/write-skill-record.mjs` | Write reviewed skill status/curation updates | Complete skill draft | YAML skill record | Block on ambiguous identity | strict validation |
| `../catalog-data/scripts/write-pack-record.mjs` | Write reviewed pack status updates | Complete pack draft | YAML pack record | Block on malformed pack | strict validation |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate output | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Confirm decision authority.** You verify the user or reviewer has actually made the decision. If not, ask for the decision instead of guessing.
2. **Inspect evidence.** You read candidates, records, relations, evaluations, license evidence, and status policy relevant to the decision.
3. **Choose curation action.** You classify the action: approve, reject, block, merge, annotate, license update, status change, preview override, or no-op.
4. **Prepare a reviewed draft.** You capture the decision, evidence, rationale, affected IDs, and rollback notes.
5. **Use narrow writers.** You call catalog-data writers only for the records that need deterministic updates. You do not use a generic mutation tool to alter arbitrary data.
6. **Validate.** You run strict validation after every curation write.
7. **Handoff.** You send approved sources to sync, normalized skills to analysis, passing packs to promotion or publishing, and unresolved issues back to the relevant owner.

## Quality Bar

Good curation is explicit, reversible when possible, and tied to evidence. It records who or what supplied the decision, which IDs changed, and why automated phases were not allowed to decide alone.

## Bad Patterns To Avoid

- Do not approve a candidate without evidence.
- Do not resolve license uncertainty by guessing.
- Do not merge duplicates without human approval.
- Do not mutate unrelated records in the same action.
- Do not bypass validation after curation.

## Failure Handling

- If the decision is unclear, block and ask the user.
- If evidence contradicts the requested action, explain the conflict and ask for confirmation.
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

Your handoff names the decision, affected IDs, changed paths, evidence, validation result, and next owner. If a user decision is still needed, state the exact options and do not proceed.
