# Duplicate Resolution

Resolution outcomes:

- `duplicate` — identity overlap confirmed by normalization (source_id + path + digest match); handled in `skill-normalization`.
- `distinct` — not a duplicate; record reason to avoid repeated false positives.
- `blocked` — insufficient evidence or license prevents decision.

Never delete skill records during duplicate resolution. Preserve source skill IDs, version IDs, analysis paths, and pack references.
