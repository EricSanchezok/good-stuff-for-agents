---
name: skill-normalization
description: Normalize extracted skill candidates into canonical Skill Intelligence Catalog skill records. Use when converting candidate artifacts to catalog/skills/records YAML, mapping platform-specific fields, generating stable source_skill_id/version_id/canonical_skill_id, preserving analysis/curation fields, and writing only through catalog-data scripts.
---

# Skill Normalization SOP

## What You Own

You own the agent judgment that turns extracted candidates into canonical skill records with stable identity, source mapping, interfaces, tool profile, risk profile, and initial quality confidence.

You do not own upstream extraction, deep qualitative analysis, relation decisions, pack design, or final publication. You write canonical records only from reviewed normalized drafts.

## When To Use This Skill

Use this skill when:

- `catalog/skills/candidates/<run-id>.jsonl` contains reviewed candidates ready for canonical records;
- a platform-specific skill format needs mapping into the catalog schema;
- an existing skill record needs identity-preserving updates after upstream changes;
- candidate duplicates need to be blocked for curation before canonical write.

## When Not To Use This Skill

Do not use this skill to create candidate shells; use `skill-extraction`. Do not write deep analysis sections; use `skill-deep-analysis`. Do not decide relation edges; use `skill-dedup-relations`. Do not approve questionable merges alone; use `catalog-curation`.

## Inputs You Should Gather First

You should gather:

- candidate JSONL path and run ID;
- source records and snapshot manifests;
- existing skill records that may match the same source path, declared name, or digest;
- `references/platform-mapping.md`, `references/normalization-rules.md`, and `references/normalization-quality-gate.md`;
- `../catalog-data/references/identity-rules.md` and schema references;
- shared `artifact-contract.md` and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- normalized draft JSON under `reports/skill-normalization/<skill-id>.json` for non-trivial records;
- canonical skill YAML under `catalog/skills/records/<prefix>/<skill-id>.yaml` written through catalog-data;
- blocked/duplicate report entries when records are not written;
- validation result.

## References To Read

- `references/platform-mapping.md` to map upstream fields.
- `references/normalization-rules.md` for canonical names, aliases, and identity preservation.
- `references/normalization-quality-gate.md` before writing active records.
- `../catalog-data/references/identity-rules.md` before creating or changing IDs.
- `../shared-references/artifact-contract.md` for handoff paths.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/write-normalized-skills.mjs` | Write canonical skill records from reviewed normalized drafts | JSON object with `skills` array or single normalized draft | JSON result with written skill IDs | Block on malformed or incomplete drafts | strict validation |
| `../catalog-data/scripts/write-skill-record.mjs` | Write one canonical skill record | Complete normalized skill draft | YAML skill record | Block on ambiguous identity | strict validation |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate output | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Load candidates, source snapshots, and existing records.** You compare candidate IDs, source paths, declared names, content digests, and aliases against existing records. You MUST load the snapshot manifest from `catalog/sources/snapshots/<source-id>-<ref>.json` and map each candidate's `source.path` to its `content_digest` in the snapshot's `artifacts` array. This digest becomes `identity.content_digest` in the normalized draft.
2. **Resolve identity.** You decide whether each candidate is a new skill, an update to an existing skill, a duplicate needing curation, or a rejected candidate. You document the evidence. Every normalized draft MUST include `identity.content_digest` from the snapshot artifact so `write-skill-record.mjs` can compute a stable version hash. Do not supply `v_placeholder` or a guessed version ID.
3. **Map fields.** You translate platform metadata into canonical name, display name, source, version, capabilities, interfaces, tools, risk, and quality confidence. You leave unknown fields empty or low-confidence rather than guessing.
4. **Prepare reviewed drafts.** You write draft JSON for records you are ready to create or update. Each draft MUST include `source.source_id`, `source.path`, and `identity.content_digest`. You include identity reasoning in curation notes when helpful.
5. **Call the writer.** You run `scripts/write-normalized-skills.mjs` or `write-skill-record.mjs` for each complete draft.
6. **Validate.** You run strict validation and fix structural failures.
7. **Prepare analysis handoff.** You list records that need deep analysis and any identity questions that remain.

## Quality Bar

Good normalization preserves stable identity, records source evidence, avoids guessed capability inflation, and makes downstream analysis possible. Existing records are updated without losing curation notes, analysis references, aliases, or stable IDs.

## Bad Patterns To Avoid

- Do not derive canonical identity from filename alone.
- Do not mark a record active when evidence is too weak.
- Do not overwrite existing analysis or curation data accidentally.
- Do not silently merge possible duplicates.
- Do not fill empty capabilities to make a skill look useful.

## Failure Handling

- If identity is ambiguous, block the candidate and hand off to `catalog-curation`.
- If source license or path is missing, return to `source-sync` or `skill-extraction`.
- If a draft fails validation, repair the draft rather than weakening the schema.
- If only some candidates are ready, write ready records and report blocked ones.

## Verification

Run:

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
```

If you added or changed public-eligible records, expect `catalog-publishing` to render later.

## Handoff

Hand off to `skill-deep-analysis` with skill IDs, source paths, version IDs, blocked candidates, identity concerns, and validation result.
