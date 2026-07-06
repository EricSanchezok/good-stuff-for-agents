---
name: catalog-publishing
description: Publish validated Skill Intelligence Catalog records into generated README and docs pages. Use when rendering README/docs from catalog, creating generated banners/frontmatter, building pack/skill/source/domain index pages, checking docs drift, checking links, and ensuring candidate packs are never published without evaluation approval.
---

# Catalog Publishing

Render public surfaces from validated catalog records.

## Workflow

1. Run `catalog-data/scripts/validate-catalog.mjs --strict`.
2. Run `catalog-data/scripts/build-indexes.mjs`.
3. Read `references/readme-generation-rules.md` and page templates.
4. Render README and docs with `scripts/render-docs.mjs`.
5. Run `scripts/check-docs-drift.mjs` and `scripts/check-links.mjs`.

## Hard Rules

- Do not validate schemas here; call `catalog-data`.
- Do not publish failed candidates.
- Every generated page must have a generated banner and frontmatter.
- Rendering must be idempotent.
