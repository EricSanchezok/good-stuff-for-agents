---
name: skill-dedup-relations
description: Deduplicate and relate cataloged skills. Use when finding exact duplicates, semantic duplicate candidates, variants, overlaps, complements, conflicts, workflow-stage fit, input/output handoffs, clusters, and relation edges for the Skill Intelligence Catalog.
---

# Skill Deduplication and Relations SOP

## What You Own

You own reviewed relationship judgments between canonical skills. You identify exact duplicates, likely duplicate candidates, variants, overlaps, complements, conflicts, workflow-stage fit, and handoff relationships from records and analysis evidence.

You do not normalize canonical records, write deep analysis, synthesize packs, or approve destructive merges. You append evidence-backed relation edges and hand human-owned decisions to curation.

## When To Use This Skill

Use this skill when:

- new or changed skill analyses need relation review;
- duplicate candidates must be identified before pack synthesis;
- pack synthesis needs complement, overlap, or conflict evidence;
- a user asks whether two skills should coexist;
- relation edges need to be appended from reviewed evidence.

## When Not To Use This Skill

Do not use this skill to create skill records; use `skill-normalization`. Do not analyze raw upstream skill content from scratch; use `skill-deep-analysis`. Do not merge or delete records without curation. Do not design packs; use `pack-synthesis` after relations are ready.

## Inputs You Should Gather First

You should gather:

- canonical skill records;
- analysis markdown paths and summaries;
- existing relation edges;
- `references/relation-types.md`, `references/dedupe-rules.md`, `references/conflict-detection.md`, and `references/relation-quality-gate.md`;
- shared `artifact-contract.md` and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- relation review report under `reports/skill-relations/<run-id>.md` for non-trivial reviews;
- relation edge draft JSONL under `reports/skill-relations/<run-id>-edges.jsonl` when batching;
- appended relation edges in `catalog/relations/edges-00000.jsonl` through catalog-data;
- curation blockers for merges, deletions, or unresolved duplicates;
- validation result.

## References To Read

- `references/relation-types.md` before choosing predicates.
- `references/dedupe-rules.md` before labeling duplicates.
- `references/conflict-detection.md` before writing conflicts.
- `references/relation-quality-gate.md` before appending edges.
- `../shared-references/artifact-contract.md` for edge draft paths.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/append-relation-drafts.mjs` | Append reviewed relation edge drafts | JSON object with `relations` array or JSONL file path | JSON result with appended edges | Block on malformed edge; aggregate per batch when possible | strict validation |
| `../catalog-data/scripts/append-relation.mjs` | Append one reviewed relation edge | Complete relation draft | JSONL edge | Block on missing endpoints | strict validation |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate relations and catalog | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Choose relation scope.** You select skill IDs or changed analyses. You avoid reviewing the whole catalog unless requested.
2. **Read evidence.** You inspect both skill records and analyses. You compare purpose, triggers, workflow stage, inputs, outputs, tools, and risks.
3. **Classify relationship.** You choose exact duplicate, duplicate candidate, variant, overlap, complement, conflict, prerequisite, follows, or unrelated. You keep exact duplicates distinct from likely duplicates.
4. **Write evidence.** You document the concrete evidence: shared trigger, incompatible side effect, same source identity, output-to-input handoff, or stage complement.
5. **Prepare edge drafts.** You create relation JSON with subject, predicate, object, weight, evidence, and source.
6. **Append reviewed edges.** You call the relation helper only after the relationship is reviewed.
7. **Block human decisions.** You send merge/delete/approval questions to `catalog-curation` instead of making irreversible changes.
8. **Validate and report.** You run strict validation and summarize relation changes.

## Quality Bar

Good relation work is sparse, evidence-backed, and useful to pack synthesis. It avoids noisy overlap edges, names conflicts clearly, and marks unresolved duplicate candidates for curation.

## Bad Patterns To Avoid

- Do not create relation edges from shared domains alone.
- Do not merge records during relation review.
- Do not write low-evidence conflict claims.
- Do not duplicate existing edges with reversed endpoints unless the predicate requires direction.
- Do not let pack goals bias relation labels.

## Failure Handling

- If evidence is insufficient, report a candidate relationship without appending an edge.
- If relation type is unclear, use the reference taxonomy or block for review.
- If an edge duplicates an existing one, skip it and report the existing edge.
- If validation fails, repair the edge shape and rerun validation.

## Verification

Run:

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
```

## Handoff

Hand off to `pack-synthesis` with relation report path, appended edge summary, unresolved duplicate/merge questions, conflicts, complements, and validation result.
