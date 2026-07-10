---
name: skill-extraction
description: Extract skill-like artifacts from synced source content for the Skill Intelligence Catalog. Use when processing changed source snapshots, finding SKILL.md files, parsing supported skill formats, identifying reusable prompt/workflow artifacts, or writing evidence-preserving catalog/skills/candidates/<run-id>.jsonl entries through deterministic helpers.
---

# Skill Extraction SOP

## What You Own

You own artifact-level evidence preservation. You turn synced source artifacts into candidate records that point back to the original content. You identify parseable or plausibly reusable skill-like artifacts and write candidate shells with source IDs, paths, declared names, formats, digests, parse confidence, and raw metadata.

You preserve `content_digest` and `declared_name` exactly as provided by the snapshot manifest/artifact. You do not recompute, trim, transform, or reinterpret these values. Extraction is the consumer of sync's SCP values; it is not a computation stage for hash, URL, or license.

You do not decide whether the skill is good, important, unique enough, pack-worthy, semantically rich, or worth recommending. You do not decide final canonical identity, capability taxonomy, deep analysis, duplicate status, relation edges, or pack membership. Those decisions happen downstream.

## When To Use This Skill

Use this skill when:

- source snapshots changed and need candidate extraction;
- you need to scan manifests for `SKILL.md`, skill folders, prompt workflows, README/doc workflow sections, or supported agent instruction formats;
- you need to write `catalog/skills/candidates/<run-id>.jsonl`;
- an upstream source has artifacts that should be preserved and triaged before normalization.

## When Not To Use This Skill

Do not use this skill to discover sources; use `source-discovery`. Do not fetch source metadata; use `source-sync`. Do not create canonical skill records; use `skill-normalization`. Do not write analysis prose; use `skill-deep-analysis`.

Do not shrink broad discovery back to standard SKILL.md only. If the synced source contains semi-structured or promising-unstructured workflow content with enough procedure for a downstream agent to judge, extract it as a candidate rather than filtering it out prematurely.

## Inputs You Should Gather First

You should gather:

- snapshot manifests from `catalog/sources/snapshots/`;
- retrieval/provenance locations for artifacts when present in the snapshot;
- source records and sync state;
- extraction run ID;
- `references/supported-formats.md`, `references/extraction-rules.md`, and `references/extraction-output-contract.md`;
- shared `artifact-contract.md` and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- candidate JSONL under `catalog/skills/candidates/<run-id>.jsonl`;
- an extraction report under `reports/skill-extraction/<run-id>.md` for non-trivial runs;
- a list of skipped artifacts with reasons;
- evidence-preservation notes for any artifact whose original content cannot be recovered cleanly;
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

1. **Choose the run scope.** You select a run ID and source scope. You prefer changed snapshots from the latest sync when available. Keep extraction to ≤50 candidates per run — if a source would produce more, split across multiple runs.
2. **Read supported formats and extraction rules.** You inspect format rules before classifying artifacts. You treat parseable presence as candidate evidence, not as proof of quality.
3. **Inspect manifests.** You review snapshot artifacts for supported filenames, folder conventions, declared names, metadata, content digests, and retrieval locations.
4. **Prepare candidate shells.** Preserve source ID, source-relative path, declared name/title, format, parse confidence, `content_digest`, and raw metadata. Preserve `content_digest` from the snapshot artifact. Do not compute a new hash. If the snapshot lacks a `content_digest`, block and return to sync. Preserve enough information for normalization to identify the artifact and for deep analysis to recover the original content. Do not infer domains, capabilities, tools, risks, workflow role, final canonical names, or quality.
5. **Call the writer.** You run `scripts/write-skill-candidates.mjs` or the catalog-data append helper.
6. **Record skips.** You document unsupported formats, missing digests, unrecoverable artifacts, duplicate artifacts, and low-confidence parse cases.
7. **Validate and hand off.** You run strict validation and pass candidate JSONL to `skill-normalization` with source IDs, skipped artifacts, parse confidence notes, and evidence-preservation issues.

## Quality Bar

Good extraction is faithful to upstream evidence. It captures every parseable or plausibly reusable artifact, skips unsupported artifacts with reasons, avoids semantic guesses, and leaves candidates in a format normalization can consume.

Good extraction keeps the semantic aperture wide. If a source has a semi-structured workflow that clearly describes reusable agent behavior, extract it as a candidate even if it is not a perfect SKILL.md file. Let normalization resolve identity and deep analysis judge value.

## Bad Patterns To Avoid

- Do not create canonical skill records from extraction.
- Do not fill capability arrays during extraction.
- Do not trim, slugify, or case-transform `declared_name`. Preserve the exact string from the artifact.
- Do not compute a new hash when `content_digest` is already present in the snapshot.
- Do not infer tool/risk/workflow role from titles or filenames.
- Do not use a filename as proof of semantic identity.
- Do not discard skipped artifacts silently.
- Do not reject semi-structured workflow content just because it is not a standard skill folder.
- Do not rerun extraction with the same run ID unless you intend to append to that run file.

## Failure Handling

- If no snapshots exist, block and request `source-sync` first.
- If a snapshot lacks artifact digests, block for sync repair. Do not compute a fallback digest in extraction.
- If an artifact is malformed but still recoverable, skip it with a reason or mark low parse confidence rather than guessing.
- If an artifact cannot be recovered from the snapshot/source evidence, report the evidence gap and hand back to `source-sync`.
- If validation fails, repair candidate shape before normalization.

## Verification

Run:

```bash
npm --prefix .synergy run skill:write-candidates -- --run-id <run-id>
npm --prefix .synergy run catalog:validate
```

If you used direct catalog-data append calls, still run strict validation afterward.

## Handoff

Hand off to `skill-normalization` with the run ID, candidate JSONL path, source IDs, skipped artifacts, parse confidence notes, evidence-preservation notes, and validation result.
