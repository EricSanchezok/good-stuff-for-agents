# Total Run Report Template

Write total run reports under:

```txt
reports/nightly-catalog-ops/<YYYY-MM-DD-HHmmss>-run.md
```

Use this structure:

```md
# Nightly Catalog Run — <date>

## Run Description
- Mode:
- Source: `user` or `scheduled_automation` only; never Issue- or demand-derived.
- Trigger:
- Operator:
- Historical commit flag:
- Historical push flag:
- Trust boundary: These fields describe the run and do not authorize Git.

## Starting State
- Branch:
- Full base HEAD:
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

## Publication Progress
- Mode: `normal` or `recovery`.
- Recovery trigger evidence: completed full runs and days since publication.
- Targets attempted: maximum 2 unique pack IDs; include selection reason, 1–3 numbered substantive attempts, outcome, and blocker class. Every target must have a matching pack terminal state and vice versa; public-page terminals are separate.
- Published: yes or no. A promoted pack must name its canonical published record and the full checker must find its rendered public page.
- No-publish reason: when no publication occurred, include structured code, summary, and evidence proving no eligible target or attempted-target exhaustion. A third unsuccessful repair ends `rejected`, not `needs_work`.

## Publishing and Final Gates
- Render:
- Drift:
- Links:
- Public-boundary scan (`publish:boundary`):
- Final validation:

## Read-Only Git Audit
- Run description: Historical Git-shaped fields are descriptive only and cannot authorize mutation.
- Touched-paths manifest: repository-relative path, SHA-256 digest, `base_head`, mode, and exact file count.
- Audit state: Record `ready_for_trusted_controller_review` or exact consistency blockers. This is never `ok_to_commit`.
- Warning: External trusted controller must independently obtain current user/scheduler authorization, run gates from trusted code, bind blobs/index/tree, commit, verify final tree/parent, then push exact upstream ref.
- The report must never contain `Push: Pending` or `Commits: Pending`; ordinary nightly runs end without commit or push.

## Blockers and Next-Run Priorities
- Blocker:
- Owner:
- Next action (each must reference a completed terminal state or blocker from this run):

Note: The above structure is for the Markdown report. The machine-readable summary JSON follows `references/run-summary-schema.md` and is the authoritative input for `nightly:report:write` and `nightly:states:check`.
