# Migration Policy

Every canonical record has `schema_version`.

- Schema version 1 is the MVP baseline.
- Migrations are owned by `scripts/migrate-catalog.mjs`.
- Migrations must be idempotent.
- Migrations must preserve analysis, curation notes, duplicate resolutions, run history, and published pack evidence.
- Nightly automation runs migration before source sync or publishing.
- Migration failure is a fatal invariant failure.
