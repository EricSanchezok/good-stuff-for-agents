---
name: pack-synthesis
description: Generate candidate skill packs from catalog skill records, analyses, relation graph, domain signals, stale-pack impact signals, and explicit task intent. Use when synthesizing pack candidates, assigning roles/stages, explaining inclusion and exclusion, resolving conflicts, pinning member skill versions, and writing catalog/packs/candidates through catalog-data.
---

# Pack Synthesis SOP

## What You Own

You own the agent design work that creates a coherent candidate pack for a specific task intent. You choose member skills, roles, stages, exclusions, compatibility notes, and evidence based on catalog records, analyses, and relations.

You do not evaluate publication quality, curate approvals, or publish public pages. You do not let a helper select skills or invent inclusion reasons.

## When To Use This Skill

Use this skill when:

- the user asks for a task-shaped skill pack;
- `catalog-growth-ops` supplies a demand-scan or catalog-gap intent during autonomous growth;
- impact detection says a pack may need refresh;
- analyses and relations are ready for a new pack candidate;
- an existing candidate needs member, stage, or compatibility redesign;
- you need to write `catalog/packs/candidates/<pack-id>/pack.yaml`.

## When Not To Use This Skill

Do not use this skill without an explicit intent or evidence base. During autonomous growth, only proceed when a demand-scan or catalog-gap intent is supplied by the orchestrator. Do not evaluate pass/fail status; use `catalog-evaluation`. Do not resolve human-owned curation decisions. Do not publish packs directly; use `catalog-publishing` only after evaluation and promotion.

## Inputs You Should Gather First

You should gather:

- explicit user intent or orchestrator-supplied demand-scan/catalog-gap intent, target user, domain, scope, and exclusions;
- canonical skill records and current version IDs;
- analysis markdown for candidate skills;
- relation edges, conflicts, complements, and duplicates;
- impact reports for stale packs when applicable;
- `references/pack-design-rules.md`, `references/compatibility-analysis.md`, `references/conflict-resolution.md`, `references/pack-output-schema.md`, and `references/pack-candidate-quality-gate.md`;
- shared `artifact-contract.md` and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- agent-authored pack draft under `reports/pack-synthesis/<pack-id>.json`;
- candidate pack record under `catalog/packs/candidates/<pack-id>/pack.yaml` written through catalog-data;
- inclusion and exclusion rationale;
- compatibility summary and unresolved conflicts;
- validation result.

## References To Read

- `references/pack-design-rules.md` before selecting members.
- `references/compatibility-analysis.md` before combining skills.
- `references/conflict-resolution.md` when relations show conflicts.
- `references/pack-output-schema.md` before writing drafts.
- `references/pack-candidate-quality-gate.md` before handoff.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/write-pack-candidate.mjs` | Write candidate pack from reviewed draft | Complete pack draft or JSON object with pack fields | JSON result and pack YAML | Block on missing intent, members, or evidence | strict validation |
| `../catalog-data/scripts/write-pack-record.mjs` | Write one pack record | Complete pack draft | YAML pack record | Block on malformed pack | strict validation |
| `../catalog-data/scripts/detect-impact.mjs` | Report mechanically affected packs | Existing catalog state | impact report | Diagnostic only | inspect output |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate output | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Define intent.** You restate the task the pack should help an agent perform, target domain, expected workflow, and non-goals.
2. **Build candidate pool.** You inspect skill records and analyses that match the intent. You exclude low-confidence, blocked, duplicate, or conflicting skills unless you have a documented reason.
3. **Check relations.** You inspect complements, overlaps, conflicts, and duplicates. You remove redundant members and mark conflicts that require curation.
4. **Design stages.** You assign each member a role and workflow stage. You ensure the pack helps an agent execute a coherent process, not just a list of related skills.
5. **Write inclusion and exclusion reasons.** You explain why each member is included and why plausible alternatives were excluded.
6. **Pin versions.** You use current version IDs so the pack can be reviewed against stable evidence.
7. **Prepare the draft.** You write a complete pack draft with intent, domain, members, excluded skills, workflow, compatibility, evidence, and pending evaluation.
8. **Call the writer.** You write the candidate through the pack helper.
9. **Validate and hand off.** You run validation and hand off to `catalog-evaluation`.

## Quality Bar

A good pack is intent-specific, minimally sufficient, compatible, evidence-backed, and easy for an agent to follow. It has clear stages, no avoidable redundancy, explicit exclusions, and no unresolved conflicts hidden from evaluation.

## Bad Patterns To Avoid

- Do not synthesize a pack without a clear intent.
- Do not let a helper choose skills mechanically.
- Do not include skills just because they share a domain.
- Do not hide conflicts or duplicate candidates.
- Do not create fake packs to populate the catalog.

## Failure Handling

- If fewer than the necessary high-confidence skills exist, report the gap instead of forcing a pack.
- If relation evidence shows unresolved conflict, block or exclude the skill and explain why.
- If member versions are missing, return to `skill-normalization`.
- If validation fails, repair the pack draft and rerun validation.

## Verification

Run:

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
```

If the pack may affect public pages after evaluation, expect publishing checks later.

## Handoff

Hand off to `catalog-evaluation` with pack ID, draft path, candidate pack path, member rationale, exclusions, compatibility notes, unresolved risks, and validation result.
