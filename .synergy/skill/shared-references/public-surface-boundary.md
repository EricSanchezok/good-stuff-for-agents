# Public Surface Boundary

Use this reference whenever you touch `README.md`, `docs/**/*.md`, or the publishing helpers.

## Audience

Public pages are for outside visitors who want to browse useful agent skills, packs, sources, domains, and reports. Write them as catalog pages, not as maintenance notes.

## Allowed Public Content

You may show:

- names and summaries of public catalog entries;
- public status labels;
- human-readable source provenance;
- license information that helps users judge reuse;
- pack composition and use cases;
- domain navigation;
- public report summaries when they are meant for visitors.

## Forbidden Public Content

Do not show internal mechanics, hidden metadata, maintenance instructions, helper names, command names, hashes, private paths, or update machinery. Do not include invisible metadata comments.

## Required Check

After rendering public pages, search `README.md` and `docs/**/*.md` for this pattern:

```text
(catalog-publishing|catalog hash|source_hash|source_record|generated_at|generator|regenerated|automation|nightly|script|scripts|npm|source of truth|Do not edit|deterministic|helper|pipeline|workflow|GENERATED|frontmatter|manifest\.json|sha256|quality gate|Evaluation ID|Analysis paths|Relation edges|Consecutive failures|Last ref)
```

A clean result means there are no matches. If there is a match, rewrite the renderer or page copy and render again.

## Drift and Link Checks

Run the publishing checks after every public surface change. If render succeeds but drift or links fail, fix the rendering logic or source records at the owner layer. Do not hand-edit public pages as a workaround.
