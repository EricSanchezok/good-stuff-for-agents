---
name: pack-synthesis
description: Generate candidate skill packs from catalog skill records, analyses, relation graph, domain signals, stale-pack impact signals, and explicit task intent. Use when synthesizing pack candidates, assigning roles/stages, explaining inclusion and exclusion, resolving conflicts, pinning member skill versions, and writing catalog/packs/candidates through catalog-data.
---

# Pack Synthesis SOP

## What You Own

You own the agent design work that creates a coherent candidate pack for a specific task intent. You choose member skills, roles, stages, exclusions, compatibility notes, and evidence based on catalog records, analyses, and relations.

You also own intent discovery. If the orchestrator has not supplied an explicit intent, scan the relation graph yourself. Any `chains_with` or `strengthens` edge between two analyzed skills is a latent pack intent — it means two skills have a chemical reason to work together. Surface these as pack intents rather than waiting to be told what to build.

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

Do not use this skill without an evidence base. Do not evaluate pass/fail status; use `catalog-evaluation`. Do not resolve human-owned curation decisions. Do not publish packs directly; use `catalog-publishing` only after evaluation and promotion.

## Inputs You Should Gather First

You should gather:

- explicit user intent or orchestrator-supplied demand-scan/catalog-gap intent, target user, domain, scope, and exclusions;
- canonical skill records and current version IDs;
- analysis markdown for candidate skills;
- relation edges (`chains_with`, `strengthens`, `alternatives`, `conflicts_with`);
- impact reports for stale packs when applicable;
- `references/pack-design-rules.md`, `references/compatibility-analysis.md`, `references/conflict-resolution.md`, `references/pack-output-schema.md`, and `references/pack-candidate-quality-gate.md`;
- shared `artifact-contract.md` and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- agent-authored pack draft under `reports/pack-synthesis/<pack-id>.json`;
- candidate pack record under `catalog/packs/candidates/<pack-id>/pack.yaml` written through catalog-data;
- inclusion and exclusion rationale;
- structured workflow stages with descriptions and member skill IDs where available;
- compatibility summary, chains/strengthens/alternatives/conflicts/unresolved evidence, and no public-facing placeholder fields;
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

### Step 0: Discover intents

Before waiting for the orchestrator to hand you an intent, check whether the catalog already has enough evidence to form one.

1. Read `catalog/relations/edges-00000.jsonl`. Every `chains_with` edge and every `strengthens` edge is a latent pack intent — two skills that have a chemical reason to work together.
2. For each edge, ask: could these two skills anchor a meaningful pack? If yes, create an intent from it. The intent is the task the pack would help an agent perform: the skill at the tail of a `chains_with` edge defines the goal, and the edge itself defines the route.
3. Merge adjacent edges into a single intent when they form a continuous workflow. For example, if A chains-with B and B chains-with C, the intent is "A → B → C" as one pack, not three separate intents.

If no edges exist yet and no orchestrator intent is supplied, that is a genuine no-op — report it and move on. But do not skip step 0 just because the orchestrator didn't hand you an explicit intent. The relation graph is your intent.

### Step 1: Define intent. You restate the task the pack should help an agent perform, target domain, expected workflow, and non-goals.
2. **Build candidate pool.** You inspect skill records and analyses that match the intent. You exclude low-confidence, blocked, duplicate, or conflicting skills unless you have a documented reason.
3. **Check relations.** You inspect the relation graph for `chains_with` (sequential handoffs), `strengthens` (quality gates), `alternatives` (choose one), and `conflicts_with` (cannot coexist). You remove redundant members when an `alternatives` edge indicates a better fit, and mark `conflicts_with` pairs for resolution.
4. **Design stages.** You assign each member a role and workflow stage. You ensure the pack helps an agent execute a coherent process, not just a list of related skills.
5. **Write inclusion and exclusion reasons.** You explain why each member is included and why plausible alternatives were excluded.
6. **Pin versions.** You use current version IDs so the pack can be reviewed against stable evidence.
7. **Prepare the draft.** You write a complete pack draft with intent, domain, members, excluded skills, structured `workflow.stages`, compatibility notes/evidence arrays, evidence, and pending evaluation. Do not submit a plain string workflow or shallow compatibility placeholders; publishing uses this data to explain the pack to human visitors.
8. **Call the writer.** You write the candidate through the pack helper.
9. **Validate and hand off.** You run validation and hand off to `catalog-evaluation`.

## Quality Bar

A good pack is intent-specific, minimally sufficient, compatible, evidence-backed, and easy for an agent to follow. It has clear stages, no avoidable redundancy, explicit exclusions, and no unresolved conflicts hidden from evaluation.

## Bad Patterns To Avoid

- Do not synthesize a pack without a clear intent.
- Do not let a helper choose skills mechanically.
- Do not include skills just because they share a domain.
- Do not hide conflicts or duplicate candidates.
- Do not write shallow public-facing placeholders; provide structured workflow and compatibility evidence instead.
- Do not create fake packs to populate the catalog.

## Failure Handling

- A pack must have at least 2 skills connected by at least one relation edge (`chains_with`, `strengthens`, or `alternatives`). Fewer than this is not a pack — report the gap instead.
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

After evaluation, re-ingest the result: if `catalog-evaluation` returns `needs_work`, adjust the pack (replace members, redesign stages, resolve conflicts) and resubmit to evaluation. If `rejected`, record the rejection reason and archive — do not resubmit. If `passed`, hand off to `catalog-publishing`. A `needs_work` pack that has been resubmitted 3 times without passing should be marked as rejected with a note explaining why repeated attempts failed.
