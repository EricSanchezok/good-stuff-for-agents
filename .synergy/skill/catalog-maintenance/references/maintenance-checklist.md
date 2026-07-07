# Maintenance Checklist

Use this checklist only for deterministic catalog maintenance. If the run needs discovery, curation, semantic analysis, relation review, pack work, or evaluation, hand off to `catalog-growth-ops` or the relevant phase owner.

Run order:

1. Check `git status --short --branch`.
2. Validate catalog strictly.
3. Apply catalog migrations only when schema versions require it.
4. Sync approved `active` and `preview` sources, independently per source.
5. Build indexes.
6. Render public pages from valid catalog data.
7. Run docs drift check.
8. Run public link check.
9. Run public-boundary scan when public pages changed.
10. Report catalog health and source sync results.
11. Commit/push only if the user or approved automation explicitly authorized a maintenance-only git action.

Exit codes: 0 green, 1 non-fatal source failures, 2 fatal invariant failure.

Maintenance never creates new sources, analyzes skills, designs packs, evaluates packs, or resolves curation decisions.
