# Compatibility Analysis

Compatibility asks a stricter question than whether two skills seem complementary: can the graph move a concrete artifact between them under their documented claims, preconditions, tools, permissions, and failure boundaries?

## Required Transfers

For each required edge, inspect the upstream Analysis v2 `produces` claims and downstream `requires.required` claims. Cite a Relation v2 `chains_with` record that binds the exact producer skill and claim ID to the exact consumer skill and claim ID. Confirm that the relation direction matches `sequential`, `fan_out`, `fan_in`, or `conditional` use in the DAG.

The Pack edge should describe the same artifact in operational language: what is produced and how it is consumed. A relation ID without a resolving claim pair is not handoff evidence. A downstream optional requirement cannot be promoted to a required input merely because the workflow needs it.

## Fan-Out And Fan-In

A fan-out is compatible only when each outgoing branch can consume the artifact or decision it receives. Check every producer/consumer pair separately and retain branch-specific evidence.

A fan-in is compatible only when the receiving node can accept every incoming artifact and has a defined way to combine them. Identify the contribution from each branch, the merge strategy, and any ordering or concurrency constraint. Evidence for one input does not cover its siblings.

## Quality Improvement Is Not Dependency

`strengthens` records a quality gain, review, or corroborating effect. Keep it in `compatibility.strengthens` with a disposition that explains the benefit. Never use it to close a required route, replace a missing consumer requirement, or justify an artifact transfer.

## Preconditions And Warnings

Trace member preconditions into graph entry contracts, node conditions, or upstream preparation. Check refusal claims, tool constraints, permissions, side effects, license limits, and source confidence before combining members.

Known failure warnings remain live through synthesis. Add mitigation where the Pack can reduce risk, then hand the warning claim IDs to evaluation for explicit disposition. Silence is not acceptance.

## Alternatives And Conflicts

Record relevant alternatives and conflicts with their Pack-specific dispositions. Compatibility is not established while a behavior-changing alternative is undecided or an included conflict lacks verified conditional separation or mitigation.

## Freshness

All members pin current versions, and cited analyses and relations must describe those versions and the current graph. Any proof-bound change requires the candidate to be written again so its preflight proof reflects the new evidence set.
