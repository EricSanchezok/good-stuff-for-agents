---
name: source-sync
description: Synchronize approved upstream sources in the Skill Intelligence Catalog. Use for nightly source freshness checks, git/HTTP source sync, source state logging, license storage policy, source deletion/private-source handling, and preparing changed source snapshots for skill extraction.
---

# Source Sync

Sync only approved sources from `catalog/sources/registry.yaml`.

## Workflow

1. Validate catalog with `catalog-data`.
2. Read `references/sync-strategies.md` and `references/source-deletion-policy.md`.
3. Check freshness before fetching heavy content.
4. Process each source independently with retries.
5. Append source state with `catalog-data/scripts/append-source-state.mjs`.
6. Preserve or update source/skill status according to deletion and license policies.

## Hard Rules

- Do not let one source failure corrupt or block the whole catalog.
- Do not mirror raw third-party content unless license policy allows it.
- Unknown license blocks raw mirroring but not metadata cataloging.
