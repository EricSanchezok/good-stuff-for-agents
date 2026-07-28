# Alternative And Conflict Resolution

Resolve overlap and incompatibility before candidate writing. The goal is the smallest DAG that preserves the task's value without concealing a choice the executing agent must make.

## Alternatives

Inspect the Relation v2 `alternatives` pair and its source evidence, then choose a Pack-specific disposition:

- include the preferred skill and explain the exclusion of the other;
- keep the choice contextual and represent the condition explicitly in the graph;
- split the intent into separate Pack candidates when both choices lead to materially different workflows;
- block synthesis when the evidence leaves a behavior-changing choice undecided.

Including both alternatives is acceptable only when their roles are genuinely distinct and that distinction is evidenced. Shared capability alone is not a reason to duplicate members.

## Conflicts

For a `conflicts_with` pair, choose one of four defensible outcomes: exclude one member, isolate the pair behind mutually exclusive conditions, split the design, or block the candidate. Record the relation in `compatibility.conflicts` with the Pack-specific disposition and add mitigation when execution still carries residual risk.

Moving two conflicting skills to different nodes does not resolve the conflict unless the graph proves they cannot execute under the same route or state. A sequencing note is not mitigation when tools, permissions, side effects, or assumptions remain incompatible.

Unresolved material conflicts block candidate writing. Never hide one to improve apparent coverage or publication readiness.
