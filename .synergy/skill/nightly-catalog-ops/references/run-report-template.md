# Total Run Report Template

Write total run reports under:

```txt
reports/nightly-catalog-ops/<YYYY-MM-DD-HHmmss>-run.md
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
- Pack lifecycle states:
  - no-op:
  - written/updated:
  - evaluated:
  - promotion-ready:
  - promoted/published:
  - needs-work/rejected:
  - deprecated/removed:
  - blocked:

## Publishing and Final Gates
- Render:
- Drift:
- Links:
- Public-boundary scan (`publish:boundary`):
- Final validation:

## Git Actions
- Plan: Describe what should be committed — the finalizer handles the actual commit/push.
- The committed report must never contain `Push: Pending` or `Commits: Pending`. Actual commit SHA and push status are recorded by the git finalizer stdout.

## Blockers and Next-Run Priorities
- Blocker:
- Owner:
- Next action (each must reference a completed terminal state or blocker from this run):

Note: The above structure is for the Markdown report. The machine-readable summary JSON follows `references/run-summary-schema.md` and is the authoritative input for `nightly:report:write` and `nightly:states:check`.
