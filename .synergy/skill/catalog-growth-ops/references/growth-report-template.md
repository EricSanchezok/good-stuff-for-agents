# Growth Report Template

Write internal growth reports under:

```txt
reports/catalog-growth-ops/<YYYY-MM-DD-HHmmss>-growth.md
```

Use this structure:

```md
# Catalog Growth Report — <date>

## Scope
- Run mode:
- Authorization:
- Starting catalog counts:

## Demand Signals Inspected
- Signal:
- Evidence:
- Selected themes:

## GitHub Issue Intake (Internal, Draft-Only)
- Repository / Issue:
- Intake status:
- Issue updated_at:
- Content digest:
- Classification:
- Fulfillment status:
- Criteria evidence or gaps:
- Injection indicators:
- Requested privileged actions:
- URL/attachment leads recorded but not fetched:
- Internal draft response recommended:
- Internal draft response suggestion:
- Human checkpoint: required / not completed
- External action taken: none

Do not copy attack payloads, secrets, full Issue bodies, attachment contents, or unnecessary personal data into the report. Omit this section when no Issue signal was processed.

## Discovery Summary
| Source | URL | Decision | Evidence | License | Parseability | Reason |
|---|---|---|---|---|---|---|

## Activation Summary
- Activated:
- Preview:
- Candidate only:
- Blocked:
- Rejected:

## Sync / Extraction / Normalization
- Sources synced:
- Snapshots:
- Skill candidates:
- Skill records:
- Blockers:

## Analysis / Relations
- Analyses written:
- Relation edges:
- Duplicate/merge blockers:

## Pack Lifecycle
- Pack intents considered:
- Candidate packs written/updated:
- Evaluations written:
- Terminal states:
  - no-op:
  - evaluated passed:
  - evaluated needs_work:
  - evaluated rejected:
  - promotion-ready:
  - blocked:
- Promotion/publishing handoff:

## Verification
- Commands:
- Results:

## Next-Run Priorities
- Priority:
- Owner:
- Reason:
```
