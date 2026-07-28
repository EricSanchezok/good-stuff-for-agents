# Pack v3 Design Rules

A Pack is a task-shaped DAG that closes from explicit inputs to explicit outcomes. It is not a tag bundle, a popularity list, or a linear order implied by array position.

## The Graph Must Be Executable

Define stable nodes and explicit edges. Identify every valid starting node in `entry_roots` and every valid completion node in `terminal_sinks`. The graph must be acyclic, every node must be reachable from a root, and every intended route must terminate at a sink.

Assign each member once. A node may coordinate several members when the contract calls for it, but no member may float outside the graph or silently perform work in more than one node.

Use topology deliberately:

- `sequential` transfers an artifact from one node to the next;
- `conditional` chooses a route under a stated condition;
- `fan_out` creates independently justified outgoing branches;
- `fan_in` combines named incoming artifacts under a clear merge contract.

Parallel-looking shapes are not enough. Each fan-out branch must have evidence that its consumer can accept the branch artifact. Each fan-in input must have evidence that the receiving node can consume and combine it. Reusing one generic claim for every branch weakens the contract.

## Required Handoffs Are Exact-Pair Claims

Every required producer-to-consumer transfer is grounded in a Relation v2 `chains_with` record. Its producer skill and `produces` claim must match the upstream member; its consumer skill and `requires.required` claim must match the downstream member; and its direction must match the edge topology.

A `strengthens` relation describes improvement, review, or corroboration. It is informational and never a required handoff. If removing a strengthening skill breaks the route, the design needs a valid required chain rather than stronger wording.

## Dispositions Are Part Of The Design

Alternatives and conflicts cannot remain as unexplained graph trivia. Record why an alternative was chosen or excluded. For a conflict, exclude one side, separate the pair under explicit conditions, split the Pack, or block candidate creation.

Analysis claims also need disposition:

- preconditions become entry contracts, node conditions, upstream preparation, or blockers;
- refusal and tool constraints become feasibility or authorization boundaries;
- failure warnings become visible risks, synthesis mitigations where possible, and warning claims handed to evaluation.

## Prefer The Smallest Closed Pack

Include only skills that contribute distinct task value. Pin current versions and explain each inclusion. Explain the exclusion of plausible alternatives, especially those supported by relation evidence.

Two well-supported members are better than a larger redundant graph. A gap report is better than a candidate whose route depends on guesswork.

## Anti-Patterns

Reject designs that rely on domain similarity, hide known conflicts, use optional requirements as mandatory inputs, treat `strengthens` as dependency evidence, leave nodes unreachable, create cycles, omit branch-specific fan evidence, or write a candidate before canonical preflight succeeds.
