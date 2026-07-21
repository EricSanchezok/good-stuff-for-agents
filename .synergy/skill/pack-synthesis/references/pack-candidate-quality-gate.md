# Pack Candidate Quality Gate

A candidate is ready for evaluation only if:

- it has a clear intent and domain;
- all member skill IDs exist in catalog records;
- every member pins the current version ID;
- roles and stages are meaningful;
- evidence references analyses or relation edges;
- high-ranking exclusions are explained;
- conflicts are resolved or explicitly blocking;
- no member is `removed`, `broken`, or `blocked`;
- license uncertainty is surfaced.

If no candidate meets this gate, do not write a filler pack. Before declaring no-op, inspect the highest-ranked intent or existing candidate and identify whether a small analysis, relation, version, member, stage, or conflict repair can make it evaluable within the remaining budget. Route repairable gaps to their owners. Empty publication remains valid only after target ranking and repair eligibility are documented.

For repeated evaluation, each attempt must materially change the candidate or its evidence. Record the attempt number, change made, score before and after when available, and unresolved blocker. Three substantive failed attempts close the target as rejected; they do not lower the gate.
