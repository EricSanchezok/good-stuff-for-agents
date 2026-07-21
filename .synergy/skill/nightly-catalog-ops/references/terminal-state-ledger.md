# Terminal State Ledger

Every catalog object touched during a nightly run must reach a **terminal state** for that run. This document defines the state machine, validation rules, and invariant constraints.

## State Enum

| State | Meaning |
| --- | --- |
| `no_op` | Object was inspected but not changed. No affected inputs, no sufficient evidence, or no eligible action existed. |
| `written_updated_validated` | Canonical record, analysis, relation, index, report, or public page was written or updated and validated. |
| `evaluated` | Pack or public-readiness review produced a scored outcome with evidence. |
| `promotion_ready` | Evaluation passed; the next deterministic promotion step is available. |
| `promoted_published` | Passing pack or public record was promoted through catalog-data and rendered through publishing. |
| `deprecated_removed` | Status was changed to deprecated or removed under policy and curation authority. |
| `blocked` | Next action is blocked by missing evidence, unsafe policy, user-owned authority, unavailable tooling, or failing validation. |

## Invariants

### Every Touched Object Requires a Terminal State

Every object that the run inspected, wrote, evaluated, promoted, or skipped must have exactly one entry in the `terminal_states` array. Objects touched indirectly (e.g. indexes regenerated as a side effect) count as touched if their content changed.

### no_op

`no_op` is valid only when the object was explicitly inspected and no action was eligible. The `reason` field must prove that no eligible action existed — a bare `"No changes"` without context is insufficient. Acceptable reasons describe what was checked and why the object was unchanged (e.g. `"Source already at latest snapshot and no downstream artifacts changed"`).

### written_updated_validated

This state requires at least one verification command in the `verification` array. The verification must be a command that was actually run against the written artifact. Acceptable commands include `catalog:validate`, `maintenance:run`, `catalog:index`, or `publish:render` with relevant arguments.

### evaluated

Evaluated items must include an `evaluation_outcome` field set to exactly one of: `passed`, `needs_work`, or `rejected`. The `reason` field should reference the evaluation artifact path and key scores.

### promotion_ready

`promotion_ready` cannot be a final state for a full nightly run when promotion is available. If evaluation passed and the controller has authorization, it must proceed to `promoted_published`. `promotion_ready` is only valid as a terminal state when:
- The run is authorized only for `read_only` or `local_write` modes without commit/push.
- A downstream skill is needed that was explicitly not loaded for this run.

When `commits_allowed` is true, any passing evaluation or `promotion_ready` candidate must continue to `promoted_published`; stopping unpublished is a validation error.

### promoted_published

`promoted_published` requires evidence: for a pack, `path` must be `catalog/packs/published/<object_id>/pack.yaml`, that record must identify the same published pack, and the renderer-defined page `docs/packs/<domain-slug>/<object_id>.md` must exist. The `verification` array must include at least one publishing check command. Terminal-only validation checks the summary contract without reading disk; the full report checker verifies both artifacts. A separate `public_page` terminal may record the rendered page and is excluded from pack target ID comparison. Any promoted pack requires `publication_progress.published: true`; a published run must identify the corresponding target with outcome `promoted_published`.

### Publication Progress Bounds

Every newly written schema-version-2 summary must include `publication_progress`; historical version-1 summaries remain checkable. A run may attempt at most 2 publication targets and at most 3 substantive repairs per target. `needs_work` is only an early terminal outcome when `blocker_class` is `policy` or `human_decision`; a target still unsuccessful after the third substantive repair must end `rejected`, with the third attempt, target outcome, and pack terminal evaluation outcome aligned.

Recovery mode is required when the summary records either 3 completed full runs since the last publication or, when `starting_state.catalog_counts.published_packs` is positive, 7 days since the last publication. Schema-version-2 summaries must provide all non-negative integer catalog counts so this trigger cannot be bypassed. The summary carries the trigger evidence; validators do not scan historical reports.

A run that publishes nothing must record structured `no_publish_reason` proof. With no attempted targets, it must prove no eligible targets existed. With attempted targets, each target must end as early policy/human-decision `needs_work`, `blocked`, or `rejected`, and the reason must prove target selection and exhaustion. Attempted target IDs and pack terminal IDs must match in both directions, and each target outcome must agree with its pack terminal state; non-pack terminals do not participate in this set.

### deprecated_removed

`deprecated_removed` requires a `policy_citation` field referencing the policy or curation decision that authorized the status change. This is only valid when curation authority has explicitly approved the change. The nightly controller cannot autonomously deprecate or remove.

### blocked

`blocked` items must include:
- `owner`: the skill or role that must resolve the block.
- `reason`: why the block occurred.
- `blocked_reason`: a concrete description of what is preventing progress.
- `next_action`: an exact step the owner must take.

A `blocked` state without these fields is a schema violation.

## Next-Run Priorities

### Priority Objects Must Exist in Terminal States

Every entry in `next_run_priorities` must reference an `object_id` that appears in the current run's `terminal_states` array. Priority items cannot introduce new objects that were not touched by this run.

For blocked objects: the priority's `action` should align with the blocker's `next_action`. The priority's `owner` should match the blocker's `owner`.

### Priority Ordering

Priority 1 is highest. If no items need attention in the next run, the array may be empty (but must still be present).

## State Cycle Constraints

During a single run, an object may only transition forward through states:

```
no_op → (terminal)
written_updated_validated → evaluated → promotion_ready → promoted_published → (terminal)
                                                        → deprecated_removed → (terminal)
any → blocked → (terminal)
```

An object cannot be both `no_op` and `promoted_published` in the same run. An object cannot start in one lane and end in another without going through each intermediate state.

## Verification Rules Summary

| State | Requires |
| --- | --- |
| `no_op` | `reason` with proof of ineligibility |
| `written_updated_validated` | `verification` array with ≥ 1 command |
| `evaluated` | `evaluation_outcome` ∈ {passed, needs_work, rejected} |
| `promotion_ready` | Cannot be terminal when `commits_allowed` is true |
| `promoted_published` | Published artifact must exist at `path` |
| `deprecated_removed` | `policy_citation` required |
| `blocked` | `blocked_reason`, `owner`, `next_action` required |
