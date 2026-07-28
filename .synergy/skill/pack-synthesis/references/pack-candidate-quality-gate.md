# Pack Candidate Quality Gate

A semantic draft may reach the canonical Pack writer only when every gate below is satisfied.

## Graph Closure

- `workflow.nodes`, `workflow.edges`, `entry_roots`, and `terminal_sinks` are explicit.
- Node and edge IDs are unique; every edge endpoint exists.
- The graph is acyclic and every node is reachable from at least one entry root.
- Every intended route reaches a declared terminal sink.
- Every included member is assigned to exactly one node, and every assigned member belongs to the Pack.
- Conditional edges state their conditions.
- Sequential transfers state the produced artifact and how it is consumed.
- Fan-out branches and fan-in inputs carry branch-specific artifact and evidence contracts.

## Evidence Closure

- Every required handoff has a Relation v2 `chains_with` exact pair that resolves to the producer's Analysis v2 `produces` claim and the consumer's `requires.required` claim.
- Relation direction agrees with graph direction.
- `strengthens` entries are treated as optional quality improvements, never as required handoffs.
- Every cited analysis and relation ID exists and is relevant to the Pack decision that cites it.
- Each member pins its current version and has an evidence-backed inclusion reason.

## Disposition Closure

- Relevant alternatives have a Pack-specific selection, exclusion, or contextual disposition.
- Relevant conflicts are excluded, conditionally separated, split into another design, or treated as blockers.
- Preconditions are represented in entry contracts, graph conditions, upstream preparation, or a block.
- Refusal and tool constraints remain visible where they affect execution or authorization.
- Material failure warnings are included in the evaluation handoff with their claim IDs; mitigations do not erase them.
- High-ranking excluded skills have concrete reasons.

## Write And Proof Gate

Invoke only `.synergy/skill/catalog-data/scripts/write-pack-record.mjs`. A successful invocation writes the Pack v3 candidate and generates `preflight-proof.json` beside it. Synthesis must not author, copy, or edit the proof.

If any proof-bound Pack field or supporting analysis/relation evidence changes, invoke the canonical writer again. The replacement proof, not the earlier digest, is handed to evaluation.

## Handoff Gate

The candidate is ready for `catalog-evaluation` only when catalog validation succeeds and the handoff includes:

- candidate and proof paths;
- synthesis session ID;
- graph intent and boundary;
- required claim pairs and fan topology evidence;
- alternatives, conflicts, preconditions, warnings, exclusions, and mitigations;
- validation result.

Evaluation must run in a separate session. Synthesis must not score the candidate or supply a publication decision.

If any gate fails, leave a precise gap report and route the missing record, claim, relation, version, or graph repair to its owner. Never write a filler candidate.
