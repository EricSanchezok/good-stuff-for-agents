---
name: skill-normalization
description: Normalize extracted skill candidates into stable canonical identity records. Use when candidates need deterministic skill IDs, source/version mapping, duplicate/update/block decisions, and minimal schema-valid records before deep analysis. Do not perform deep semantic interpretation here.
---

# Skill Normalization SOP

## What You Own

You own identity, provenance, and version stability.

Your job is to answer: is this candidate a new canonical skill, an update to an existing skill, a duplicate/variant that needs curation, a rejected artifact, or a blocked artifact? You preserve enough source mapping for downstream deep analysis to read the original content.

You do not own the real semantic interpretation of the skill. Do not decide deep capability meaning, workflow value, tool risk, pack fit, final quality, or whether the skill deserves recommendation. Those judgments belong to `skill-deep-analysis` after it reads the original artifact.

## When To Use This Skill

Use this skill when:

- `catalog/skills/candidates/<run-id>.jsonl` contains reviewed candidates ready for identity normalization;
- a candidate needs deterministic source_skill_id, version_id, and canonical_skill_id mapping;
- an existing skill record needs identity-preserving updates after upstream changes;
- candidate duplicates, variants, rejects, or ambiguous identities need to be reported before canonical write.

## When Not To Use This Skill

Do not use this skill to create candidate shells; use `skill-extraction`. Do not write deep analysis sections; use `skill-deep-analysis`. Do not decide relation edges; use `skill-dedup-relations`. Do not approve questionable merges alone; use `catalog-curation`.

Do not use this skill as mini-analysis. If you find yourself deciding what the skill is good for, what hidden assumptions it makes, what risks it carries in practice, or whether it is high quality, stop. That belongs downstream.

## Inputs You Should Gather First

You should gather:

- candidate JSONL path and run ID;
- source records and snapshot manifests;
- existing skill records that may match the same source path, declared name, content digest, or source_skill_id;
- `references/platform-mapping.md`, `references/normalization-rules.md`, and `references/normalization-quality-gate.md`;
- `../catalog-data/references/identity-rules.md` and schema references;
- shared `artifact-contract.md` and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- normalized draft JSON under `reports/skill-normalization/<skill-id>.json` for non-trivial records;
- canonical skill YAML under `catalog/skills/records/<prefix>/<skill-id>.yaml` written through catalog-data;
- blocked/duplicate/rejected report entries when records are not written;
- analysis handoff list with skill IDs, source paths, and content digests;
- validation result.

## References To Read

- `references/platform-mapping.md` for explicit platform metadata mapping only.
- `references/normalization-rules.md` for identity, provenance, and version stability.
- `references/normalization-quality-gate.md` before writing records.
- `../catalog-data/references/identity-rules.md` before creating or changing IDs.
- `../shared-references/artifact-contract.md` for handoff paths.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/write-normalized-skills.mjs` | Write canonical skill records from reviewed normalized drafts | JSON object with `skills` array or single normalized draft | JSON result with written skill IDs | Block on malformed or incomplete drafts | strict validation |
| `../catalog-data/scripts/write-skill-record.mjs` | Write one canonical skill record | Complete normalized skill draft | YAML skill record | Block on ambiguous identity | strict validation |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate output | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Load candidates and evidence.** Read candidate JSONL, source records, snapshot manifests, and existing records. Confirm that every candidate can be traced back to `source_id` + `source.path` + `content_digest`. If that evidence thread is broken, block the candidate and return it to sync/extraction repair.
2. **Resolve identity.** Decide new, update, duplicate-needs-curation, rejected, or blocked using source ID, source path, declared name, content digest, and existing records. Do not use filename alone. Do not silently merge possible duplicates.
3. **Create minimal canonical record.** Fill stable ID, display/canonical name from explicit metadata, source mapping, version/content digest, status, and schema-required empty/unknown fields. Keep the record schema-valid without pretending to understand the skill deeply.
4. **Avoid semantic inflation.** Leave capabilities, interfaces, tools, and risk empty/unknown unless the candidate explicitly states them. Do not infer from title, filename, source popularity, or your guess about the domain.
5. **Write records through helper.** Use existing writer scripts only after the identity decision is clear and the draft preserves source provenance and content digest.
6. **Validate.** Run strict validation and fix structural failures without weakening identity requirements.
7. **Hand off to deep analysis.** Provide skill IDs plus source paths/content digests. State identity uncertainties, duplicate suspicions, rejected candidates, and blocked candidates. Deep analysis must be able to recover the original artifact from your handoff.

## Quality Bar

Good normalization preserves stable identity, records source evidence, avoids guessed semantic inflation, and makes downstream analysis possible. Existing records are updated without losing curation notes, analysis references, aliases, duplicate resolutions, pack references, or stable IDs.

A normalized record is allowed to be semantically sparse. Sparse is honest when deep analysis has not happened yet. A richly filled record based on guesses is worse than a minimal record with a perfect evidence thread.

## Bad Patterns To Avoid

- Do not derive canonical identity from filename alone.
- Do not treat normalization as mini-analysis.
- Do not fill capability/tool/risk fields because downstream wants richer records.
- Do not infer semantic meaning from source popularity, folder naming, or vague descriptions.
- Do not summarize away the source content; deep analysis must read the original artifact.
- Do not block clear identity records just because semantic quality is unknown.
- Do not overwrite existing analysis or curation data accidentally.
- Do not silently merge possible duplicates.
- Do not fill empty capabilities to make a skill look useful.

## Failure Handling

- If identity is ambiguous, block the candidate and hand off to `catalog-curation` with the exact ambiguity.
- If source path or content digest is missing, return to `source-sync` or `skill-extraction` rather than guessing.
- If source license or source record context is missing, return to source activation/sync owners.
- If a draft fails validation, repair the draft rather than weakening the schema.
- If only some candidates are ready, write ready identity records and report blocked/deferred ones with explicit reasons.

## Verification

Run:

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
```

If you added or changed public-eligible records, expect `catalog-publishing` to render later.

## Handoff

Hand off to `skill-deep-analysis` with skill IDs, source paths, content digests, version IDs, blocked candidates, duplicate/update concerns, identity uncertainties, and validation result.

Make clear that the normalized record is a routing/identity artifact. It is not the semantic source of truth for the skill.
