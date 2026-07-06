---
name: pack-synthesis
description: Generate candidate skill packs from catalog skill records, analyses, relation graph, domain signals, stale-pack impact signals, and explicit task intent. Use when synthesizing pack candidates, assigning roles/stages, explaining inclusion and exclusion, resolving conflicts, pinning member skill versions, and writing catalog/packs/candidates through catalog-data.
---

# Pack Synthesis

Packs are generated outputs, not hand-authored seed content.

## Workflow

1. Validate catalog and read current indexes.
2. Read `references/pack-design-rules.md`, `references/compatibility-analysis.md`, and `references/conflict-resolution.md`.
3. Retrieve candidate skills from records, analyses, and relation edges.
4. Build a task-shaped workflow with 3–15 skills when appropriate.
5. Pin each member's skill version.
6. Record inclusion reasons, exclusion reasons, conflicts, and evidence.
7. Write candidate pack with `catalog-data/scripts/write-pack-record.mjs`.

## Hard Rules

- Do not create fake demonstration packs.
- Do not publish candidates directly.
- Do not include weakly related skills just to increase pack size.
