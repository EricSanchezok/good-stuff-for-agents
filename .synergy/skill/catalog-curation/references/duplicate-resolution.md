# Duplicate Resolution

Resolution outcomes:

- `same_as` — approved logical duplicate; keep aliases and provenance.
- `variant_of` — related variant; keep separate canonical skill IDs.
- `distinct` — not a duplicate; record reason to avoid repeated false positives.
- `blocked` — insufficient evidence or license prevents decision.

Never delete skill records during duplicate resolution. Preserve source skill IDs, version IDs, analysis paths, and pack references.
