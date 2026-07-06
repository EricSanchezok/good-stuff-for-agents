# Normalization Rules

- Generate stable source, version, and canonical IDs.
- Preserve existing analysis, curation notes, duplicate resolutions, and pack references.
- Do not guess missing fields.
- Use `unknown` / `unavailable` for unavailable evidence.
- Write records through `catalog-data/scripts/write-skill-record.mjs`.
- Run strict validation after writes.
