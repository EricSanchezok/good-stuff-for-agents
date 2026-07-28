# Maintenance Checklist

Use this checklist only for deterministic catalog maintenance. If the run needs discovery, curation, semantic analysis, relation review, pack work, or evaluation, hand off to `catalog-growth-ops` or the relevant phase owner.

Run order:

1. Check `git status --short --branch`.
2. Validate the current canonical schemas strictly; legacy records fail rather than migrate in place.
3. Sync approved `active` and `preview` sources, independently per source.
4. Build indexes.
5. Render public pages from valid catalog data.
6. Run docs drift check.
7. Run public link check.
8. Run public-boundary scan when public pages changed.
9. Report catalog health and source sync results.
10. Leave Git unchanged unless a separately trusted controller acts on explicit authorization.

Exit codes: 0 green, 1 non-fatal source failures, 2 fatal invariant failure.

Maintenance never creates new sources, analyzes skills, designs packs, evaluates packs, or resolves curation decisions.
