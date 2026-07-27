# Orchestration Boundaries

The total controller may coordinate maintenance, growth, publishing, reports, and authorized git actions. It must not absorb phase ownership.

## Delegate To Maintenance

Use `catalog-maintenance` for validation, migration, approved source sync, indexes, public render checks, status, and maintenance-only reports.

## Delegate To Growth

Use `catalog-growth-ops` for demand scan, discovery planning, source discovery, autonomous activation, extraction, normalization, analysis, relations, pack synthesis, and evaluation.

## Stop Conditions

Stop or block the affected target when:

- validation cannot pass after at most 2 reversible, meaning-preserving structural repair attempts;
- contract preflight fails and one bridge repair does not close the gap;
- the selected target's failure fingerprint (intent + gap set) matches a prior run — skip immediately without spending budget;
- evaluation fails after one post-evaluation repair attempt;
- license is unclear or legally risky;
- source is private, credentialed, or sensitive;
- merge/delete/irreversible curation is required;
- destructive git or force push would be needed;
- unrelated user changes would be committed;
- an external identity action would be required.

A policy or human-decision blocker ends work on that target, not automatically the whole publication effort. Switch to the next ranked target when validation remains healthy and the 2-target run budget has not been exhausted.

## Contract Preflight Gate

Before synthesis writes a candidate and before evaluation scores it, the target's pack contract must pass preflight. Preflight requires:

- defined entry input (what the agent user supplies to start);
- defined terminal outcome (what the pack produces when complete);
- ordered stages with a member skill or documented gap per main-path stage;
- structured adjacent handoffs between consecutive stages;
- conditional branches documented with trigger conditions;
- every main-path trace from entry to terminal is closed.

A target that fails preflight moves to one bridge repair. If it still fails, reject the target and record the failure fingerprint — the set of (intent, stage that gapped, handoff that broke). This fingerprint is compared across runs; matching fingerprints mean the same unresolved problem and the target is skipped.

## Failure Fingerprint Dedup

Every target that fails contract preflight or ends `rejected` leaves a failure fingerprint:

```
{
  "target_id": "...",
  "fingerprint": {
    "intent": "...",
    "gaps": ["stage_x_no_member", "handoff_y_unresolved", ...],
    "run_id": "..."
  }
}
```

Before selecting any target, check prior-run fingerprints. If the intent and gap set match an existing fingerprint exactly, skip the target. The dedup check is performed by the orchestrator; each owner skill only needs to produce the fingerprint when it rejects a target.

## Continue Conditions

Continue when the next action has a clear owner and remains inside the bounded repair budget. A first `needs_work`, missing-evidence result, stale-version finding, renderer failure, or reversible structural validation error must be routed and retried rather than accepted as the final state.

You may continue unaffected deterministic phases when failures are isolated, reported, and validation can still pass.

## Recovery Mode

Enter publication recovery mode when either condition is true:

- 3 completed full nightly runs have produced no new published pack; or
- at least one pack has previously been published and 7 days have elapsed since the latest pack publication.

When the catalog has never published a pack, use the completed-run trigger; a missing publication timestamp does not by itself trigger recovery.

Recovery mode changes work priority, not quality. Prioritize the closest-to-publication target and only perform discovery that directly supplies its missing evidence. Keep the `0.78` publication threshold, license policy, relation evidence rules, and public gates unchanged.
