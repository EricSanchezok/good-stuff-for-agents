# Evaluation Failure Modes

Record blockers before score findings. Every finding names the owner and one change that can be verified on the next independent evaluation.

## Blockers

| Code | Owner | Meaning |
|---|---|---|
| `missing_session_ids` | orchestrator | Synthesis or evaluation session identity is absent. |
| `same_session` | orchestrator | The same session attempted synthesis and evaluation. |
| `missing_proof` | `pack-synthesis` | Candidate-time `preflight-proof.json` or its digest is absent. |
| `stale_proof` | `pack-synthesis` | Candidate, evidence, binding, evaluation digest, and existing proof no longer agree. |
| `dag_invalid` | `pack-synthesis` | The workflow is cyclic, unreachable, malformed, or cannot close at a terminal sink. |
| `required_handoff_unbound` | `pack-synthesis` or `skill-dedup-relations` | A required edge lacks a Relation v2 exact pair backed by producer and consumer claims. |
| `required_input_mislabeled_optional` | `skill-deep-analysis` or `skill-dedup-relations` | A handoff treats an Analysis v2 optional requirement as mandatory. |
| `fan_evidence_incomplete` | `pack-synthesis` | A fan-out branch or fan-in contribution lacks its own compatible artifact evidence. |
| `strengthens_used_as_handoff` | `pack-synthesis` | Optional strengthening evidence is being used to close a required route. |
| `precondition_unmet` | `pack-synthesis` | A material precondition, refusal boundary, tool constraint, or permission requirement is not represented or satisfied. |
| `alternative_not_disposed` | `pack-synthesis` or `skill-dedup-relations` | A behavior-changing alternative has no Pack-specific decision. |
| `conflict_unresolved` | `pack-synthesis` | Included members retain an unresolved material conflict. |
| `failure_warning_not_disposed` | `catalog-evaluation` | An Analysis v2 failure-warning claim has no evaluation warning with the same claim ID and an explicit disposition. |
| `member_ineligible` | `skill-normalization` or `source-sync` | A member is missing, blocked, removed, broken, or no longer pinned to its current version. |
| `evidence_missing` | evidence owner | A required analysis, relation, source fact, or claim cannot be resolved from canonical records. |
| `policy_blocked` | `catalog-curation` | Publication depends on a human-owned license, curation, or policy decision. |

Any blocker produces `rejected`. Do not convert a blocker into a low metric to keep the candidate alive.

## Score Findings

When there are no blockers, score findings determine whether the candidate passes, needs work, or is rejected:

- a dimension from `0.50` through `0.69` produces `needs_work` unless another dimension is lower;
- any dimension below `0.50` produces `rejected`;
- every dimension at least `0.70` produces `passed`.

Useful stable findings include `intent_too_broad`, `coverage_thin`, `skill_overlap`, `workflow_unclear`, `compatibility_weak`, `conflict_control_weak`, `weak_evidence`, `poor_actionability`, `stale_context`, and `poor_source_quality`.

## Recommendation Contract

For each blocker or score finding, record:

- the stable code or affected metric;
- the owning skill;
- the concrete evidence that supports the finding;
- whether the repair belongs to the current orchestration window, a later run, a human decision, or a fundamental redesign;
- one specific action whose completion can be checked.

“Improve evidence” is not actionable. Name the missing claim pair, graph branch, alternative disposition, warning claim, member pin, source fact, or proof refresh required.
