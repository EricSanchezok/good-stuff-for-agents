---
name: skill-extraction
description: Extract skill-like artifacts from synced source content for the Skill Intelligence Catalog. Use when processing changed source snapshots, finding SKILL.md files, parsing supported skill formats, identifying reusable prompt/workflow artifacts, or writing catalog/skills/candidates/<run-id>.jsonl through deterministic helpers.
---

# Skill Extraction SOP

## What You Own

You own the evidence-preserving step that turns synced source artifacts into skill candidate records. You identify parseable skill-like artifacts and write candidate shells with source IDs, paths, declared names, formats, digests, and raw metadata.

You do not decide final canonical identity, capability taxonomy, deep analysis, duplicate status, relation edges, or pack membership. Those decisions happen downstream.

## When To Use This Skill

Use this skill when:

- source snapshots changed and need candidate extraction;
- you need to scan manifests for `SKILL.md`, skill folders, prompt workflows, or supported agent instruction formats;
- you need to write `catalog/skills/candidates/<run-id>.jsonl`;
- an upstream source has artifacts that should be triaged before normalization.

## When Not To Use This Skill

Do not use this skill to discover sources; use `source-discovery`. Do not fetch source metadata; use `source-sync`. Do not create canonical skill records; use `skill-normalization`. Do not write analysis prose; use `skill-deep-analysis`.

## Inputs You Should Gather First

You should gather:

- snapshot manifests from `catalog/sources/snapshots/`;
- source records and sync state;
- extraction run ID;
- `references/supported-formats.md`, `references/extraction-rules.md`, and `references/extraction-output-contract.md`;
- shared `artifact-contract.md` and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- candidate JSONL under `catalog/skills/candidates/<run-id>.jsonl`;
- an extraction report under `reports/skill-extraction/<run-id>.md` for non-trivial runs;
- a list of skipped artifacts with reasons;
- validation result.

## References To Read

- `references/supported-formats.md` to identify parseable artifact types.
- `references/extraction-rules.md` to decide candidate vs skip.
- `references/extraction-output-contract.md` before writing candidate fields.
- `../shared-references/artifact-contract.md` before handoff.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/write-skill-candidates.mjs` | Append candidate shells from explicit artifacts or latest snapshots | `--run-id`, optional `--source-id`, or JSON with `artifacts` | JSON result and candidate JSONL entries | Aggregate partial success only for malformed artifacts when reported | strict validation |
| `../catalog-data/scripts/append-skill-candidate.mjs` | Append one candidate shell | Complete candidate draft | JSONL candidate | Block on missing source/path/digest | strict validation |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate candidate output | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Choose the run scope.** You select a run ID and source scope. You prefer changed snapshots from the latest sync when available.
2. **Read supported formats.** You inspect format rules before classifying artifacts. You treat parseable presence as candidate evidence, not as proof of quality.
3. **Inspect manifests.** You review snapshot artifacts for supported filenames, folder conventions, declared names, metadata, and content digests.
4. **Prepare candidate shells.** You preserve source ID, path, declared name, format, confidence, digest, and raw metadata. You do not infer domains, tools, risk, workflow roles, or final canonical names.
5. **Call the writer.** You run `scripts/write-skill-candidates.mjs` or the catalog-data append helper.
6. **Record skips.** You document unsupported formats, missing digests, duplicate artifacts, and low-confidence parse cases.
7. **Validate and hand off.** You run strict validation and pass candidate JSONL to `skill-normalization`.

## Quality Bar

Good extraction is faithful to upstream evidence. It captures every parseable artifact, skips unsupported artifacts with reasons, avoids semantic guesses, and leaves candidates in a format normalization can consume.

## Bad Patterns To Avoid

- Do not create canonical skill records from extraction.
- Do not fill capability arrays during extraction.
- Do not use a filename as proof of semantic identity.
- Do not discard skipped artifacts silently.
- Do not rerun extraction with the same run ID unless you intend to append to that run file.

## Failure Handling

- If no snapshots exist, block and request `source-sync` first.
- If a snapshot lacks artifact digests, compute deterministic digests only from manifest content or block for sync repair.
- If an artifact is malformed, skip it with a reason and continue only when the helper reports partial success clearly.
- If validation fails, repair candidate shape before normalization.

## Verification

Run:

```bash
npm --prefix .synergy run skill:write-candidates -- --run-id <run-id>
npm --prefix .synergy run catalog:validate
```

If you used direct catalog-data append calls, still run strict validation afterward.

## Handoff

Hand off to `skill-normalization` with the run ID, candidate JSONL path, source IDs, skipped artifacts, confidence notes, and validation result.
