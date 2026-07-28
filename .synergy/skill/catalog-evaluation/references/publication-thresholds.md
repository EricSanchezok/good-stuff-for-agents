# Publication Thresholds

Publication eligibility is decided by a blocker-first MIN gate. A strong average cannot compensate for a blocker or a weak dimension.

## Preconditions For Evaluation

The candidate must be Pack v3, have a candidate-time `preflight-proof.json`, and be reviewed in a session distinct from synthesis. The canonical Evaluation writer creates a binding to the current candidate hash and existing proof digest.

Evaluation verifies that proof and binding are fresh. It does not generate, replace, or edit the proof. A missing, mismatched, or stale proof is a blocker. If proof-bound candidate content or cited evidence changed, synthesis must write the candidate again before evaluation restarts.

## Decision Order

Apply these rules in order:

| Condition | Decision |
|---|---|
| One or more blockers | `rejected` |
| No blockers and every required dimension is `>= 0.70` | `passed` |
| No blockers and any required dimension is `< 0.50` | `rejected` |
| No blockers, no dimension is `< 0.50`, and at least one is `0.50–0.69` | `needs_work` |

All ten dimensions are required: relevance, coverage, non-redundancy, workflow coherence, compatibility, conflict control, evidence quality, actionability, freshness, and source quality. Missing dimensions make the draft invalid.

## Blocking Conditions

Blockers include, but are not limited to:

- missing or equal synthesis and evaluation session IDs;
- missing or stale candidate proof or binding;
- malformed, cyclic, unreachable, or unclosed DAG routes;
- a required transfer without an exact-pair claim-backed `chains_with` relation;
- a required consumer input represented only as optional;
- unsupported fan-out or fan-in branch contracts;
- `strengthens` used as required dependency evidence;
- unmet material preconditions or authorization constraints;
- undisposed alternatives or conflicts that change execution;
- a failure warning without an evaluation warning disposition;
- missing, ineligible, or stale-pinned members;
- missing canonical evidence, schema failure, or a human-owned policy block.

## After A Passing Decision

Passing evaluation makes a candidate eligible for the separate curation, promotion, and publishing flow. It does not publish the Pack.

Promotion verifies that the passed evaluation still refers to the same candidate proof digest and that member eligibility remains current. It does not create a new proof. Any candidate change returns the Pack to synthesis and independent evaluation; operational pressure never lowers the gate.
