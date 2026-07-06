---
name: catalog-publishing
description: Publish validated Skill Intelligence Catalog records into clean public README and docs pages. Use when rendering visitor-facing catalog pages, checking page drift, checking links, and ensuring only approved catalog records appear publicly.
---

# Catalog Publishing SOP

## What You Own

You own the transformation from validated catalog records into clean public Markdown pages under `README.md` and `docs/**/*.md`. You enforce the public boundary: visitors should see catalog entries, navigation, provenance, status, and use cases, not internal maintenance mechanics.

You do not decide whether a source, skill, pack, or evaluation is good enough. You render records that are already eligible and block when public pages would leak internal details.

## When To Use This Skill

Use this skill when:

- catalog records changed and public pages need refresh;
- drift checks fail;
- link checks fail;
- public copy must be adjusted for clarity;
- a candidate pack has been promoted and should appear publicly;
- the public-boundary scan reports forbidden visitor-facing content.

## When Not To Use This Skill

Do not use this skill to create catalog records, evaluate candidates, approve packs, or edit canonical data. Do not hand-edit generated public pages as a workaround. Fix records or rendering logic, then render again.

## Inputs You Should Gather First

You should gather:

- validated catalog records and indexes;
- pack evaluation status and promotion state;
- existing public pages;
- `references/docs-structure.md`, `references/readme-generation-rules.md`, `references/pack-page-template.md`, `references/skill-page-template.md`, `references/source-page-template.md`, `references/domain-page-template.md`, and `references/publishing-quality-gate.md`;
- shared `public-surface-boundary.md`, `artifact-contract.md`, and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- refreshed `README.md` and `docs/**/*.md` pages;
- render output summary;
- drift check result;
- link check result;
- public-boundary scan result;
- no hidden metadata in public Markdown.

## References To Read

- `../shared-references/public-surface-boundary.md` before any public copy change.
- `references/readme-generation-rules.md` before changing README rendering.
- `references/docs-structure.md` before changing page paths.
- page template references before changing pack, skill, source, or domain pages.
- `references/publishing-quality-gate.md` before declaring done.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/render-docs.mjs` | Render all public pages from catalog model | Valid catalog and indexes | written README/docs pages and JSON summary | Block on render failure | `npm --prefix .synergy run publish:render` |
| `scripts/check-docs-drift.mjs` | Compare working public pages to expected render | Valid catalog and current pages | JSON drift report | Block on drift | `npm --prefix .synergy run publish:check` |
| `scripts/check-links.mjs` | Check local links in expected public pages | Existing public pages | JSON link report | Block on broken links | `npm --prefix .synergy run publish:links` |
| `../catalog-data/scripts/build-indexes.mjs` | Rebuild indexes before rendering | Valid catalog records | index files | Block on invalid records | `npm --prefix .synergy run catalog:index` |

## Workflow

1. **Confirm eligibility.** You verify that catalog records are valid and public-eligible. You do not publish rejected or unevaluated candidate packs.
2. **Read the public boundary.** You check that intended copy is visitor-facing and does not expose internal mechanics, hidden metadata, helper names, hashes, maintenance instructions, or private paths.
3. **Render from data.** You run the renderer instead of hand-editing pages. If public copy is wrong, change rendering logic or source records at the owner layer.
4. **Check drift.** You run the drift check. If drift remains, render again or fix the renderer.
5. **Check links.** You run link checks and repair broken relative paths or rendering assumptions.
6. **Scan public pages.** You search public pages with the concrete pattern in `../shared-references/public-surface-boundary.md`. Any match is a blocker.
7. **Report public result.** You summarize changed public pages, checks, and any records excluded by eligibility.

## Quality Bar

Good publishing output is clean, useful, reproducible, and public-safe. Visitors can browse entries without seeing internal maintenance details. The renderer, drift check, link check, and boundary scan all pass.

## Bad Patterns To Avoid

- Do not hand-edit public pages to bypass drift.
- Do not expose hidden metadata, hashes, helper names, internal paths, or maintenance instructions.
- Do not publish candidate or failed packs.
- Do not weaken public copy into vague placeholders when catalog data exists.
- Do not let link checks silently ignore expected pages.

## Failure Handling

- If render fails, fix the renderer or invalid input records.
- If drift fails, rerender and compare expected paths.
- If links fail, fix relative links in rendering logic.
- If boundary scan fails, rewrite copy or rendering logic and rerun all publishing checks.
- If a record is not eligible for public display, exclude it and report why.

## Verification

Run:

```bash
npm --prefix .synergy run catalog:index
npm --prefix .synergy run publish:render
npm --prefix .synergy run publish:check
npm --prefix .synergy run publish:links
```

Then run the public-boundary scan from `../shared-references/public-surface-boundary.md` against `README.md` and `docs/**/*.md`.

## Handoff

Hand off with a list of public pages written, checks passed, boundary scan result, excluded records, and any upstream data issues that require `catalog-data`, `catalog-evaluation`, or `catalog-curation`.
