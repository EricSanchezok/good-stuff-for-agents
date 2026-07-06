---
name: catalog-evaluation
description: Evaluate candidate packs and public-ready catalog outputs. Use when scoring relevance, coverage, non-redundancy, workflow coherence, compatibility, conflict control, evidence quality, actionability, freshness, source quality, docs page readiness, and publication thresholds for the Skill Intelligence Catalog.
---

# Catalog Evaluation

Evaluate quality; do not validate schema. Schema validation belongs to `catalog-data`.

## Workflow

1. Read `references/pack-evaluation-rubric.md` and `references/publication-thresholds.md`.
2. Score candidate outputs.
3. Write evaluation JSON with `catalog-data/scripts/write-evaluation.mjs`.
4. Only scores >= 0.78 are eligible for publishing.
5. Record failure modes for tuning.

## Hard Rules

- Low-scoring candidates stay in `catalog/packs/candidates/` or become rejected.
- Evaluation evidence must be traceable.
- Do not render public docs.
