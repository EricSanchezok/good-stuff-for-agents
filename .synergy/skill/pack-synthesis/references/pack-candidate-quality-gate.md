# Pack Candidate Quality Gate

## Contract Preflight Gate (must pass before candidate writing)

Before a candidate is written, the pack contract must pass preflight:

- entry input is defined (concrete type, not "anything");
- terminal outcome is defined (concrete, verifiable end state);
- every main-path stage has a member skill;
- adjacent handoffs between consecutive stages are defined;
- conditional branches have documented trigger conditions and paths;
- every main-path trace from entry to terminal is closed.

A pack that does not pass contract preflight is a gap report, not a candidate. Do not write a candidate for an unclosed contract.

## Candidate Evaluation Gate

After contract preflight passes, a candidate is ready for evaluation only if:

- it has a clear intent and domain;
- all member skill IDs exist in catalog records;
- every member pins the current version ID;
- roles and stages are meaningful and reflect the preflight-validated order;
- evidence references analyses or relation edges;
- high-ranking exclusions are explained;
- conflicts are resolved or explicitly blocking;
- no member is `removed`, `broken`, or `blocked`;
- license uncertainty is surfaced.

If no candidate meets this gate, do not write a filler pack. Before declaring no-op, inspect the highest-ranked intent or existing candidate and identify whether a small analysis, relation, version, member, stage, or conflict repair can make it evaluable within the remaining budget. Route repairable gaps to their owners. Empty publication remains valid only after target ranking and repair eligibility are documented.

## Bridge Repair Limits

For each target:

- one bridge repair is allowed when contract preflight fails (add/replace one member, redesign one stage, or produce one missing piece of evidence);
- one post-evaluation repair is allowed when evaluation returns `needs_work`;
- maximum 2 substantive repair attempts per target total.

Each attempt must materially change the candidate or its evidence. Record the attempt number, change made, score before and after when available, and unresolved blocker. Two failed repairs close the target as rejected; they do not lower the gate.
