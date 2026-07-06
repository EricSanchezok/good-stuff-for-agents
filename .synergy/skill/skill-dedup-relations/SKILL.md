---
name: skill-dedup-relations
description: Deduplicate and relate cataloged skills. Use when finding exact duplicates, semantic duplicate candidates, variants, overlaps, complements, conflicts, workflow-stage fit, input/output handoffs, clusters, and relation edges for the Skill Intelligence Catalog.
---

# Skill Dedup Relations

Build evidence-backed relationship data.

## Workflow

1. Read `references/dedupe-rules.md`, `references/relation-types.md`, and `references/conflict-detection.md`.
2. Exact duplicates may be auto-aliased with provenance.
3. Fuzzy/semantic duplicates become pending candidates.
4. Write relationship edges with `catalog-data/scripts/append-relation.mjs`.
5. Report unresolved duplicate candidates in `reports/duplicates.md`.

## Hard Rules

- False positive duplicate merges are worse than missed duplicates.
- Every edge needs evidence, weight, source, and timestamp.
- Do not publish packs from relations alone.
