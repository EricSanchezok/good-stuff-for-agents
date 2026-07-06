# Status Policy

## Skill Status

- `candidate` — extracted but not normalized/analyzed.
- `active` — usable for synthesis.
- `preview` — publicly visible with low confidence or incomplete evidence.
- `deprecated` — retained but not recommended.
- `removed` — upstream removed/private; keep tombstone.
- `broken` — parser/schema failure.
- `blocked` — license, safety, or permission issue.

## Pack Status

- `candidate` — generated but not passed.
- `rejected` — evaluated below threshold.
- `published` — passed and public.
- `stale` — member version changed or source removed.
- `superseded` — replaced by newer pack.
- `archived` — historical, not recommended.

Status changes must include evidence and should trigger validation, index rebuild, and docs render.
