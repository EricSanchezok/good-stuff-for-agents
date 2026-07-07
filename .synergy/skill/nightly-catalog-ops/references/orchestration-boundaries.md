# Orchestration Boundaries

The total controller may coordinate maintenance, growth, publishing, reports, and authorized git actions. It must not absorb phase ownership.

## Delegate To Maintenance

Use `catalog-maintenance` for validation, migration, approved source sync, indexes, public render checks, status, and maintenance-only reports.

## Delegate To Growth

Use `catalog-growth-ops` for demand scan, discovery planning, source discovery, autonomous activation, extraction, normalization, analysis, relations, pack synthesis, and evaluation.

## Stop Conditions

Stop or block when:

- validation cannot pass;
- license is unclear or legally risky;
- source is private, credentialed, or sensitive;
- merge/delete/irreversible curation is required;
- destructive git or force push would be needed;
- unrelated user changes would be committed;
- an external identity action would be required.

## Continue Conditions

You may continue unaffected deterministic phases when failures are isolated, reported, and validation can still pass.
