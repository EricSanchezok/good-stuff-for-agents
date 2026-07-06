---
name: source-discovery
description: Discover and qualify candidate upstream sources for the Skill Intelligence Catalog. Use when asked to find skill sources, expand tracked sources, run nightly discovery, review source candidates, or decide whether a GitHub repo, docs site, marketplace, MCP collection, prompt library, or agent workflow source should enter catalog/sources/candidates.jsonl.
---

# Source Discovery

Discover candidate sources; do not approve them directly into `catalog/sources/registry.yaml` unless a curation policy explicitly allows it.

## Workflow

1. Read `references/source-qualification.md`.
2. Use external research only for source discovery and evidence.
3. Produce draft JSON for each candidate.
4. Write candidates with `catalog-data/scripts/append-source-candidate.mjs`.
5. Write a report under `reports/source-discovery/` when discovery is substantial.

## Hard Rules

- Do not mirror third-party content during discovery.
- Do not create skills or packs from source candidates.
- Record license, activity, parseability, and rejection reasons when known.
