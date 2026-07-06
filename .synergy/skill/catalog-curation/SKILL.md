---
name: catalog-curation
description: Human-triggered correction workflow for the Skill Intelligence Catalog. Use when approving or rejecting source candidates, resolving duplicate candidates, setting license evidence, changing skill/source/pack status, annotating records, approving preview overrides, or handling decisions automation should not make.
---

# Catalog Curation

Use this skill only for explicit human-owned decisions.

## Workflow

1. Read the relevant curation reference.
2. Confirm the target record and intended action.
3. Use `catalog-data` scripts or curation-specific scripts; never hand-edit catalog YAML/JSONL.
4. Validate catalog after changes.
5. Record curation notes and evidence.

## Hard Rules

- Nightly automation must not run curation unless explicitly invoked.
- Do not silently merge fuzzy duplicates.
- Do not infer license approval without evidence.
