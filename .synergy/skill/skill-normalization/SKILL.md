---
name: skill-normalization
description: Normalize extracted skill candidates into canonical Skill Intelligence Catalog skill records. Use when converting candidate artifacts to catalog/skills/records YAML, mapping platform-specific fields, generating stable source_skill_id/version_id/canonical_skill_id, preserving analysis/curation fields, and writing only through catalog-data scripts.
---

# Skill Normalization

Normalize extracted candidates into canonical records.

## Workflow

1. Validate catalog.
2. Read `references/normalization-rules.md` and `references/platform-mapping.md`.
3. Generate stable identity and version fields.
4. Preserve existing analysis, curation notes, duplicate resolutions, and published pack references.
5. Write with `catalog-data/scripts/write-skill-record.mjs`.
6. Validate strictly.

## Hard Rules

- Unknown fields must be `unknown` or `unavailable`; do not guess.
- Do not overwrite analysis or curation fields during source updates.
- Do not write YAML directly.
