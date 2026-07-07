# Total Run Report Template

Write total run reports under:

```txt
reports/nightly-catalog-ops/<YYYY-MM-DD>-run.md
```

Use this structure:

```md
# Nightly Catalog Run — <date>

## Authorization
- Mode:
- Git allowed:
- Push allowed:

## Starting State
- Branch:
- Working tree:
- Catalog counts:

## Maintenance Preflight
- Validation:
- Migration:
- Approved source sync:
- Index/render/drift/link:

## Growth Summary
- Growth report:
- Demand themes:
- Sources activated/preview/candidate/blocked/rejected:
- Skill records/analyses/relations:
- Pack candidates/evaluations:

## Publishing and Final Gates
- Render:
- Drift:
- Links:
- Public-boundary scan:
- Final validation:

## Git Actions
- Commits:
- Push:
- Skipped files:

## Blockers and Next-Run Priorities
- Blocker:
- Owner:
- Next action:
```
