---
name: catalog-evaluation
description: Evaluate candidate packs and public-ready catalog outputs. Use when scoring relevance, coverage, non-redundancy, workflow coherence, compatibility, conflict control, evidence quality, actionability, freshness, source quality, docs page readiness, and publication thresholds for the Skill Intelligence Catalog.
---

# Catalog Evaluation SOP

## What You Own

You own evidence-based evaluation of candidate packs and public-ready catalog outputs. You apply rubrics, record scores, failure modes, recommendations, and pass/fail decisions from inspected evidence.

You do not synthesize packs, change member selection, approve curation decisions, or publish pages. You can recommend changes, but the owning skill must implement them.

## When To Use This Skill

Use this skill when:

- a candidate pack needs rubric scoring;
- a public-ready output needs readiness review;
- source quality or docs page quality affects publication;
- a pack candidate should be passed, rejected, or marked needs-work;
- an evaluation record should be written from reviewed scores.

## When Not To Use This Skill

Do not use this skill to create packs; use `pack-synthesis`. Do not promote passing candidates; use `catalog-data` after curation policy allows it. Do not render public docs; use `catalog-publishing`. Do not auto-score from counts alone.

## Inputs You Should Gather First

You should gather:

- candidate pack record;
- member skill records and analysis paths;
- relation edges and conflict notes;
- source records and freshness evidence;
- `references/pack-evaluation-rubric.md`, `references/publication-thresholds.md`, `references/docs-page-rubric.md`, `references/source-quality-rubric.md`, and `references/failure-modes.md`;
- shared `../shared-references/artifact-contract.md` and `../shared-references/script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- agent-authored evaluation draft under `reports/catalog-evaluation/<pack-id>.json`;
- evaluation JSON under `catalog/packs/candidates/<pack-id>/evaluation.json` written through catalog-data;
- a terminal decision: `passed`, `needs_work`, or `rejected`;
- recommendations tied to owning skills and the next terminal-state action, such as promote/publish, repair/re-synthesize, retain as needs-work, reject, or block;
- validation result.

## References To Read

- `references/pack-evaluation-rubric.md` before scoring packs.
- `references/publication-thresholds.md` before assigning pass/fail.
- `references/docs-page-rubric.md` when public page readiness is in scope.
- `references/source-quality-rubric.md` when source evidence affects score.
- `references/failure-modes.md` before writing recommendations.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/write-evaluation-draft.mjs` | Write evaluation output from reviewed rubric draft | Complete evaluation draft or JSON with `evaluations` array | JSON result and evaluation files | Block on missing rubric evidence | strict validation |
| `../catalog-data/scripts/write-evaluation.mjs` | Write one evaluation record | Complete evaluation draft | evaluation JSON | Block on missing pack ID or score | strict validation |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate output | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Load candidate and evidence.** You inspect the pack, member records, analyses, relations, source quality, and any previous evaluations.
2. **Score each rubric dimension.** You assign scores for relevance, coverage, non-redundancy, workflow coherence, compatibility, conflict control, evidence quality, actionability, freshness, and page readiness when relevant.
3. **Write evidence for scores.** You cite the concrete pack member, analysis, relation, or source evidence behind each score. You do not score from member counts alone.
4. **Apply thresholds.** You determine `passed`, `needs_work`, or `rejected` from the configured thresholds and blocking failure modes. Do not leave an evaluation pending when the candidate can be read and scored.
5. **Write recommendations.** You route recommendations to the owning skill: pack design, relations, analysis, source sync, normalization, promotion/publishing, or curation.
6. **Prepare reviewed draft.** You write a complete evaluation draft with metrics, overall score, terminal decision, failure modes, and recommendations.
7. **Call the writer and validate.** You write evaluation output through the helper and run strict validation.

## Quality Bar

Good evaluation is explainable. A reviewer can see why every score was assigned, what evidence is missing, and which owner should fix each failure. Passing packs have no hidden conflicts, no missing evidence, and clear public usefulness.

## Bad Patterns To Avoid

- Do not auto-score from shallow metrics.
- Do not pass a pack to make the catalog look populated.
- Do not ignore relation conflicts or duplicate members.
- Do not evaluate without reading analyses.
- Do not promote or publish from this skill.

## Failure Handling

- If required evidence is missing, mark the candidate needs-work or rejected instead of guessing.
- If thresholds conflict with a user request, follow the threshold and explain the blocker.
- If evaluation writing fails, repair the draft and rerun validation.
- If a candidate cannot be evaluated because it is malformed, return to `pack-synthesis` or `catalog-data`.

## Verification

Run:

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
```

## Handoff

Hand off passing candidates to `catalog-curation` or `catalog-data` promotion according to policy. Hand off failed or needs-work candidates to the owning skill named in recommendations. Include evaluation path, score, threshold decision, failure modes, and validation result.
