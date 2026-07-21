# Orchestration Boundaries

The total controller may coordinate maintenance, growth, publishing, reports, and authorized git actions. It must not absorb phase ownership.

## Delegate To Maintenance

Use `catalog-maintenance` for validation, migration, approved source sync, indexes, public render checks, status, and maintenance-only reports.

## Delegate To Growth

Use `catalog-growth-ops` for demand scan, discovery planning, source discovery, autonomous activation, extraction, normalization, analysis, relations, pack synthesis, and evaluation.

## Stop Conditions

Stop or block the affected target when:

- validation cannot pass after at most 2 reversible, meaning-preserving structural repair attempts;
- license is unclear or legally risky;
- source is private, credentialed, or sensitive;
- merge/delete/irreversible curation is required;
- destructive git or force push would be needed;
- unrelated user changes would be committed;
- an external identity action would be required.

A policy or human-decision blocker ends work on that target, not automatically the whole publication effort. Switch to the next ranked target when validation remains healthy and the 2-target run budget has not been exhausted.

## Continue Conditions

Continue when the next action has a clear owner and remains inside the bounded repair budget. A first `needs_work`, missing-evidence result, stale-version finding, renderer failure, or reversible structural validation error must be routed and retried rather than accepted as the final state.

You may continue unaffected deterministic phases when failures are isolated, reported, and validation can still pass.

## Recovery Mode

Enter publication recovery mode when either condition is true:

- 3 completed full nightly runs have produced no new published pack; or
- at least one pack has previously been published and 7 days have elapsed since the latest pack publication.

When the catalog has never published a pack, use the completed-run trigger; a missing publication timestamp does not by itself trigger recovery.

Recovery mode changes work priority, not quality. Prioritize the closest-to-publication target and only perform discovery that directly supplies its missing evidence. Keep the `0.78` publication threshold, license policy, relation evidence rules, and public gates unchanged.
