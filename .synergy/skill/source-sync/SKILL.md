---
name: source-sync
description: Synchronize approved upstream sources in the Skill Intelligence Catalog. Use for source freshness checks, deterministic source snapshots, state logging, license storage policy, source deletion/private-source handling, and preserving recoverable artifact evidence for skill extraction and deep analysis.
---

# Source Sync SOP

## Invocation Instructions

Additional user instructions for this invocation:

$ARGUMENTS

Treat these as scope refinements only. They do not override safety boundaries, ownership rules, or quality gates in this skill. If empty, follow the SOP as written.

## What You Own

You own deterministic synchronization for sources that are already approved as active or preview. You fetch upstream metadata, write snapshot manifests, update source state, and report failures without deciding whether new sources should exist.

You also own evidence preservation. A successful sync does not merely prove that a source exists; it leaves enough artifact evidence for extraction and deep analysis to recover what was actually read upstream.

You are the SCP for `content_digest`, `raw_url`, and license evidence. No downstream stage may recompute or reinterpret these values. If a downstream stage cannot consume them as-is, the bug is in sync, not downstream.

You do not discover new sources, approve source candidates, interpret skill usefulness, rank artifacts, or normalize skill records. You produce source snapshots that `skill-extraction` can consume and `skill-deep-analysis` can later trace back to original artifact content.

## When To Use This Skill

Use this skill when you need to:

- refresh approved source records;
- create or update `catalog/sources/snapshots/**` manifests;
- record source state events;
- check whether upstream refs changed;
- handle unavailable, deleted, private, or unsupported sources;
- prepare artifact manifests and recoverable content evidence for extraction and analysis.

## When Not To Use This Skill

Do not use this skill for candidate discovery; use `source-discovery`. Do not approve or reject candidates; use `catalog-curation`. Do not parse artifacts into skill candidates; use `skill-extraction`. Do not publish public pages; use `catalog-publishing` after downstream records are ready.

Do not use sync as semantic filtering. If a source is approved and safe to fetch, your job is to preserve evidence, not to decide whether the artifacts are good skills.

## Inputs You Should Gather First

You should gather:

- approved source records from `catalog/sources/records/**` or the current source registry;
- source state history from `catalog/sources/state.jsonl`;
- `references/sync-strategies.md`, `references/source-state-format.md`, `references/license-storage-policy.md`, and `references/source-deletion-policy.md`;
- shared `artifact-contract.md` and `script-policy.md`;
- network credentials or rate-limit constraints if the source requires them.

## Outputs You Must Leave Behind

You must leave behind:

- snapshot manifests under `catalog/sources/snapshots/` for successful syncs;
- enough artifact evidence for downstream agents to recover original content: source-relative path, `content_digest`, `raw_url`, retrieval location, and provenance;
- source state events for success, skipped, or failed sources;
- updated source records when last checked, last success, or upstream ref changes;
- a summary of synced, skipped, and failed sources;
- validation output.

## References To Read

- `references/sync-strategies.md` before choosing fetch behavior.
- `references/source-state-format.md` before writing state events.
- `references/license-storage-policy.md` before preserving license evidence.
- `references/source-deletion-policy.md` when a source disappears or becomes private.
- `../shared-references/artifact-contract.md` for snapshot handoff shape.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/sync-sources.mjs` | Fetch approved source metadata and write snapshots/state | Existing active/preview source records | JSON summary, snapshot manifests, state events, updated source records | Aggregate partial success per source | `npm --prefix .synergy run catalog:validate` |
| `../catalog-data/scripts/append-source-state.mjs` | Append one source state event | Complete state draft | JSONL event | Warn and continue for per-source failures | strict validation |
| `../catalog-data/scripts/write-source-record.mjs` | Update deterministic source state fields | Complete source record draft | YAML source record | Block on malformed source record | strict validation |

## Workflow

1. **Select sources.** You inspect approved active/preview source records and decide the sync scope. You skip rejected or candidate sources and record why.
2. **Check policy.** You read sync and deletion policies before fetching. If a source is private, deleted, or unsupported, you record a state event instead of forcing a fetch.
3. **Run deterministic sync.** You call `scripts/sync-sources.mjs` for supported sources. The helper may fetch upstream metadata and write snapshot manifests, but it must not decide whether artifacts are useful skills.
4. **Inspect artifact evidence.** You review the JSON summary, snapshot paths, state events, and artifact entries. Confirm that potentially skill-like artifacts have source-relative paths, `content_digest`, `raw_url`, and a retrieval location or provenance trail that will allow extraction and deep analysis to recover the original content. For each artifact, compute and store `raw_url` — the direct-download URL (for example, `raw.githubusercontent.com/...`). The `url` field (GitHub blob URL) is for human browsing; the `raw_url` field is for machine consumption. Both are required.
5. **Classify sync failures only.** You distinguish transient fetch errors from policy blockers. You do not classify artifact quality, domain value, or skill usefulness.
6. **Validate records.** You run strict validation. If validation fails, you fix source state or source record shape.
7. **Prepare extraction handoff.** You list changed snapshot manifests, source IDs, artifact counts, and any evidence-preservation gaps for `skill-extraction`.

## Quality Bar

Good sync work is reproducible, source-scoped, and explicit about failures. Every active source has either a current snapshot/state event or a clear reason it was skipped.

A good snapshot manifest tells downstream agents not only what changed, but where each artifact's original content can be recovered. If deep analysis cannot find the original artifact from your sync output, the sync handoff is incomplete.

## Bad Patterns To Avoid

- Do not sync unapproved candidates.
- Do not treat fetch failures as source rejection decisions.
- Do not rewrite license evidence without proof.
- Do not parse, rank, summarize, or semantically judge skills inside sync.
- Do not let sync become semantic filtering; preserve evidence, do not judge usefulness.
- Do not produce artifacts without a `raw_url`. A GitHub blob URL alone is not consumable by downstream fetch.
- Do not produce digest-only snapshots when downstream analysis needs readable artifacts.
- Do not produce license evidence that requires reinterpretation. Use SPDX identifiers where possible.
- Do not collapse multiple artifacts into a source-level summary.
- Do not hide partial failures behind an overall success message.

## Failure Handling

- If a source URL is unsupported, append an error state and report the unsupported type.
- If a network request fails, record the source failure and continue with other sources.
- If a source is deleted or private, follow deletion policy and do not remove records without curation.
- If an artifact cannot be preserved in a recoverable form, report the evidence gap rather than pretending the snapshot is complete.
- If validation fails, repair state record shape before continuing downstream.

## Verification

Run:

```bash
npm --prefix .synergy run source:sync
npm --prefix .synergy run catalog:validate
```

If snapshot changes should feed extraction, also run:

```bash
npm --prefix .synergy run catalog:index
```

## Handoff

Hand off to `skill-extraction` with snapshot manifest paths, source IDs, artifact counts, failed sources, validation result, and any artifact evidence gaps. If a source needs approval, deletion, or license judgment, hand off to `catalog-curation` instead.
