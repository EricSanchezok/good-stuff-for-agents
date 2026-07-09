---
name: skill-dedup-relations
description: Relate cataloged skills based on deep analysis evidence. Use when analyses are ready and pack synthesis needs chains, strengths, alternatives, or conflicts between skills. Only judges relationships between skills that already have deep analysis — does not re-read source artifacts or re-litigate identity.
---

# Skill Deduplication and Relations SOP

## What You Own

You own reviewed relationship judgments between canonical skills that already have deep analysis. You identify chains (A's natural output feeds B), strengths (B makes A better), alternatives (solve same task differently), and conflicts (incompatible assumptions or tool chains).

You do not re-read source artifacts. You do not re-litigate identity decisions. You do not synthesize packs. You consume deep analysis evidence and produce edges that Pack Synthesis can use for grouping, ordering, selection, and exclusion.

## When To Use This Skill

Use this skill when:

- at least 10 analysis files exist in `catalog/analyses/`;
- new analyses have been added since the last relations review;
- pack synthesis needs chain / strengthen / alternative / conflict evidence;
- existing relation edges need updating after analysis changes.

## When Not To Use This Skill

Do not use this skill when fewer than 10 analyses exist — insufficient evidence for meaningful edges. Do not use it to re-read source artifacts (use `skill-deep-analysis`). Do not use it to re-decide identity (use `skill-normalization`). Do not use it to design packs (use `pack-synthesis` after relations are ready).

## Inputs You Should Gather First

You should gather:

- all analysis markdown files in `catalog/analyses/`;
- canonical skill records for the skills those analyses reference (for routing only — not for semantic evidence);
- existing relation edges in `catalog/relations/`;
- `references/relation-types.md`, `references/dedupe-rules.md`, `references/conflict-detection.md`, and `references/relation-quality-gate.md`;
- shared `artifact-contract.md` and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- relation review report under `reports/skill-relations/<run-id>.md` for non-trivial reviews;
- appended relation edges in `catalog/relations/edges-00000.jsonl` through catalog-data;
- validation result.

## References To Read

- `references/relation-types.md` for the 4 allowed predicates and their pack decisions.
- `references/dedupe-rules.md` for identity vs relations boundary and `alternatives` usage.
- `references/conflict-detection.md` for `conflicts_with` evidence.
- `references/relation-quality-gate.md` before writing any edge.

## Helper Scripts You May Call

| Helper | Purpose | When to use |
|--------|---------|------------|
| `scripts/append-relation-drafts.mjs` | Append reviewed relation edge drafts | After all edges in a batch are reviewed |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate relations and catalog integrity | After writing, before handoff |

## Workflow

### Step 0: Readiness gate

Count analysis files in `catalog/analyses/`. If fewer than 10 exist, stop and report "insufficient analysis evidence for relations — need at least 10 analyzed skills". Do not proceed.

### Step 1: Select scope (autonomous — do not ask the user)

1. List all skills that have an analysis in `catalog/analyses/`. Only these skills are eligible for relations.
2. Group the skills by `source.source_id` from the normalized records (for routing only).
3. Within each source group, read the analysis files for every pair and look for:
   - `chains_with`: one analysis describes producing output that another analysis describes as natural input. Sequential handoff, not just format compatibility.
   - `strengthens`: one analysis describes providing quality validation, cross-checking, or enhancement that another analysis could benefit from.
   - `alternatives`: two analyses describe solving the same core task with different methods or depth.
   - `conflicts_with`: the hidden assumptions or tool requirements described in one analysis contradict those in another.
4. Cross-source: after within-source edges are complete, compare skills across sources using the same evidence rules. Cross-domain edges are expected and encouraged — a scientific analysis skill can chain with a visualization skill from a different source.
5. If no edges have sufficient evidence, report this and hand off. Noise edges are worse than no edges.

### Step 2: Classify and write evidence

For each relationship you find:

1. Name the predicate (`chains_with`, `strengthens`, `alternatives`, `conflicts_with`).
2. Write evidence that cites specific claims from both analysis files. Format: `"<skill-name> analysis: '...'. <skill-name> analysis: '...'. Conclusion: ..."`.
3. Assign weight: 0.9+ for explicit handoff or contradiction, 0.7–0.9 for strong complement with minor inference, 0.5–0.7 for plausible complement needing more evidence.
4. Mark as candidate (do not write) if evidence is below 0.7. Report it as a candidate finding without appending an edge.

### Step 3: Prepare and append edges

Create edge JSON with `subject`, `predicate`, `object`, `weight`, `evidence`, `source`, `schema_version`, and `created_at`. Call `scripts/append-relation-drafts.mjs` only after all edges in the batch are reviewed.

### Step 4: Validate and hand off

Run `npm --prefix .synergy run catalog:validate` and `npm --prefix .synergy run catalog:index`. Report the edge summary to `pack-synthesis` with chains, strengths, alternatives, conflicts, and validation result.

## Quality Bar

Good relation work is sparse, evidence-backed, and useful to Pack Synthesis. Every edge cites specific claims from analysis files. No edges are based on names, shared domains, or shared sources. A single well-evidenced `chains_with` edge is worth more than ten weak edges.

## Bad Patterns To Avoid

- Do not create edges from shared domains or ecosystems. "Both are scientific computing tools" is not evidence.
- Do not create edges from declared_name similarity. "Both mention 'code' in their name" is not evidence.
- Do not create edges without citing at least one specific claim from each skill's analysis.
- Do not create `alternatives` when the core task is different. "Both use Python" does not make them alternatives.
- Do not create `conflicts_with` when there is only a superficial difference. Two skills disagreeing on a style preference is not a conflict.
- Do not re-read source artifacts. The evidence lives in the analysis files. If an analysis is insufficient to determine a relationship, report the gap — do not go back to the original SKILL.md.
- Do not let pack design goals bias relationship labels. Relations are evidence, not marketing.

## Failure Handling

- If analysis evidence is insufficient for a relationship, report it as a candidate finding without writing an edge.
- If a predicate is unclear between `chains_with` and `strengthens`, prefer `chains_with` if there is a sequential handoff, otherwise `strengthens`.
- If validation fails, repair the edge shape and rerun validation.

## Verification

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
```

## Handoff

Hand off to `pack-synthesis` with:

- full relation report;
- chains, strengths, alternatives, conflicts by source group and cross-source;
- edge count and validation result;
- any candidate relationships deferred due to insufficient evidence.
