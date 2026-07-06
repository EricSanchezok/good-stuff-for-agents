---
name: catalog-data
description: Owns canonical catalog data for the Skill Intelligence Catalog. Use when creating, updating, validating, formatting, migrating, hashing, indexing, or impact-checking catalog YAML/JSONL records under catalog/. Also use before reading catalog data for automation, before publishing docs from catalog, and whenever a workflow needs stable IDs, schema contracts, atomic writes, generated indexes, or protection against hand-edited catalog drift.
---

# Catalog Data

Use this skill as the only write path for canonical data under `catalog/`.

## Core Rules

- Never hand-write canonical `catalog/**/*.yaml` or JSONL.
- Generate draft JSON first, then call a script in `scripts/`.
- Run `scripts/validate-catalog.mjs --strict` before publishing or committing.
- Keep schema semantics in `references/`; keep deterministic behavior in `scripts/`.
- Treat `catalog/` as the source of truth. README and `docs/` are generated elsewhere by `catalog-publishing`.

## Required References

- Read `references/write-contracts.md` before adding or updating writer scripts.
- Read `references/validation-policy.md` before changing validation behavior.
- Read `references/migration-policy.md` before changing `schema_version`.
- Read `references/identity-rules.md` before changing any ID logic.
- Schema files live under `references/schemas/`.

## Common Commands

```bash
node .synergy/skill/catalog-data/scripts/validate-catalog.mjs --strict
node .synergy/skill/catalog-data/scripts/build-indexes.mjs
node .synergy/skill/catalog-data/scripts/compute-catalog-hash.mjs
node .synergy/skill/catalog-data/scripts/detect-impact.mjs
```

## Handoff Contract

Other project skills decide what should be recorded. This skill decides how it is written, validated, migrated, hashed, and indexed.
