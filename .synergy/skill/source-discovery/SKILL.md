---
name: source-discovery
description: Discover and qualify candidate upstream sources for the Skill Intelligence Catalog. Use when you need to find, review, approve, reject, or prepare source candidates before catalog-data writes. Accepts user-provided goals or orchestrator-provided discovery briefs from catalog-growth-ops.

# Source Discovery SOP

## What You Own

You own the agent judgment that decides whether an upstream repository, docs site, marketplace, library, prompt collection, or agent workflow source is worth tracking as a catalog source candidate.

You do not own source syncing, skill extraction, canonical source writes after approval, or public publishing. You prepare evidence-rich candidate drafts and call deterministic writers only after you have made and documented the qualification decision.

## When To Use This Skill

Use this skill when you are asked to:

- find new sources for the catalog;
- review a GitHub repo, docs site, marketplace, MCP collection, or prompt library as a possible source;
- expand tracked source coverage for a domain;
- decide whether a source candidate should be approved, rejected, or blocked;
- prepare candidate records for `catalog/sources/candidates.jsonl`.

## When Not To Use This Skill

Do not use this skill to sync approved sources; use `source-sync`. Do not extract skill artifacts; use `skill-extraction`. Do not normalize canonical skill records; use `skill-normalization`. Do not curate final source approval if the decision requires human approval; use `catalog-curation`.

## Inputs You Should Gather First

You should gather:

- the discovery brief from the user or orchestrator, target domains, exclusions, and quality threshold;
- when called by `catalog-growth-ops`, use the growth policy (`../catalog-growth-ops/references/autonomous-discovery-policy.md`) and demand scan instead of asking the user for target domains or counts;
- existing source records and candidates to avoid duplicates;
- `references/discovery-channels.md`, `references/source-qualification.md`, and `references/candidate-record-format.md`;
- shared references: `../shared-references/artifact-contract.md`, `../shared-references/integration-contract.md`, and `../shared-references/script-policy.md`;
- source URLs, license pages, evidence links, file trees, docs pages, and examples of skill-like content.

## Outputs You Must Leave Behind

You must leave behind:

- a discovery report under `reports/source-discovery/<run-id>.md` when the task is non-trivial;
- candidate draft JSON under `reports/source-discovery/<run-id>-candidates.json` when writing candidates;
- appended source candidate records via `catalog-data/scripts/append-source-candidate.mjs` or the owner-local ingest helper;
- explicit rejection or blocked reasons for sources you inspected but did not write.

## References To Read

- `references/discovery-channels.md` to choose search surfaces.
- `references/source-qualification.md` to judge relevance, freshness, license evidence, and parseability.
- `references/candidate-record-format.md` before preparing candidate JSON.
- `../shared-references/script-policy.md` before running any helper.
- `../shared-references/artifact-contract.md` before handoff.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/ingest-source-candidates.mjs` | Append reviewed candidate drafts | JSON object with `sources` array or array of reviewed candidates | JSON result with appended count and records | Block on malformed candidates | `npm --prefix .synergy run catalog:validate` |
| `../catalog-data/scripts/append-source-candidate.mjs` | Append one reviewed candidate | Complete source candidate draft on stdin or `--input` | JSONL candidate entry | Block on missing name, URL, or evidence shape | strict validation |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate catalog after append | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Define the search target.** You restate the domain, source types, freshness needs, license constraints, and whether the caller wants breadth or a small qualified set. When called autonomously by `catalog-growth-ops`, use the orchestrator-supplied discovery brief and growth policy instead of asking the user.
2. **Check existing records first.** You inspect current sources and candidates so you do not re-add duplicates. If a source already exists, you report its status instead of appending a duplicate.
3. **Search deliberately.** You use appropriate discovery channels and record what you searched. You prefer official repos, docs, widely used libraries, maintained skill collections, and sources with clear license evidence.
4. **Inspect evidence.** For each promising source, you verify that it contains skill-like artifacts or agent-operational content. You record URLs, file paths, update signals, license evidence, and parseability.
5. **Classify each source.** You mark each inspected source as candidate, rejected, or blocked. Candidate means evidence is sufficient. Rejected means evidence is insufficient or out of scope. Blocked means a user or license decision is needed.
6. **Write a draft.** You create `reports/source-discovery/<run-id>-candidates.json` with only reviewed candidates. You do not include speculative sources.
7. **Call the writer.** You append candidates through `scripts/ingest-source-candidates.mjs` or the catalog-data append helper.
8. **Validate and report.** You run strict validation and write a report naming candidates, rejected sources, blockers, helper calls, and next step.

## Quality Bar

A good discovery result has strong evidence for each candidate, no duplicates, clear license status, parseability notes, and rejection reasons. Another agent should be able to inspect your report and understand why each source entered or did not enter the candidate queue.

## Bad Patterns To Avoid

- Do not treat a pasted list as discovered evidence.
- Do not add a source because it sounds relevant without inspecting content.
- Do not guess license status.
- Do not append rejected or blocked sources as candidates.
- Do not run a helper as a substitute for source qualification.

## Failure Handling

- If search results are sparse, report search terms and gaps instead of fabricating candidates.
- If license evidence is unclear, block the source for curation.
- If a source duplicates an existing record, note the existing ID and stop.
- If the append helper fails, fix the draft shape and rerun validation.
- If the user asks for sources outside current policy, ask for a decision before writing candidates.

## Verification

Run:

```bash
npm --prefix .synergy run catalog:validate
```

If you changed source candidates in a way that may affect downstream work, also run:

```bash
npm --prefix .synergy run catalog:index
```

## Handoff

Hand off to `catalog-curation` for approval decisions or `source-sync` for approved active/preview sources. Include the discovery report path, candidate draft path, appended candidate IDs if available, rejected sources, blockers, and validation result.
