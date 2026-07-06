---
name: nightly-catalog-ops
description: Run the daily Skill Intelligence Catalog automation. Use for full nightly maintenance: strict validation, migration, source discovery/sync, extraction, normalization, deep analysis, dedupe and relation updates, stale pack impact detection, candidate pack synthesis, evaluation, publishing, reporting, and safe git commit/push with required synergy-agent co-author footer.
---

# Nightly Catalog Ops

Coordinate the full automation chain.

## Workflow

1. Read `references/nightly-checklist.md`.
2. Start and end with `catalog-data validate --strict`.
3. Process sources independently; retry transient failures.
4. Run each domain skill only for relevant changed inputs.
5. Publish only evaluated passing outputs.
6. Commit only meaningful changes and include the required co-author footer.

## Hard Rules

- No destructive git operations or force push.
- No secrets, global config writes, messages, emails, or external identity actions.
- Candidate packs never enter docs.
- Fatal invariant failures exit with code 2 and no publish.
