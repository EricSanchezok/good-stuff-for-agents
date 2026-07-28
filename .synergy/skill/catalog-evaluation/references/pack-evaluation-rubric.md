# Pack Evaluation Rubric

Score every dimension from `0.0` to `1.0`. The decision is blocker-first and uses the minimum dimension, not a weighted or arithmetic average.

| Dimension | What the evaluator must establish |
|---|---|
| `relevance` | The Pack solves the stated task for the named user without drifting into adjacent goals. |
| `coverage` | Every necessary route, decision, branch contribution, and terminal outcome is represented. |
| `non_redundancy` | Each member contributes distinct value; alternatives and overlap have explicit dispositions. |
| `workflow_coherence` | Nodes, edges, roots, sinks, conditions, and artifact movement form an understandable acyclic DAG. |
| `compatibility` | Required transfers resolve to exact producer/consumer claims; tools, permissions, formats, and fan merge contracts work together. |
| `conflict_control` | Conflicts, refusals, side effects, and conditional separation are resolved or safely mitigated. |
| `evidence_quality` | Claims and Pack decisions trace to current Analysis v2 and Relation v2 records with no unsupported leap. |
| `actionability` | An agent can execute the graph, branches, conditions, and handoffs without inventing missing behavior. |
| `freshness` | Member pins, candidate content, cited analyses and relations, binding, and proof remain current. |
| `source_quality` | Source provenance, reachability, licensing confidence, stability, and artifact quality support the Pack's claims. |

## Blocker Review Comes First

A blocker produces `rejected` regardless of metric values. Check session isolation and proof freshness first, then graph integrity, required handoffs, fan evidence, preconditions, relation dispositions, warning coverage, member eligibility, and evidence traceability.

Required handoffs need Relation v2 `chains_with` exact pairs: producer skill plus Analysis v2 `produces` claim, consumer skill plus `requires.required` claim, and a direction matching the graph. An optional consumer claim cannot close a required edge.

Fan-out and fan-in are checked pair by pair. Each outgoing branch needs compatible input evidence; each incoming branch needs a named contribution and a receiving merge contract. One relation note cannot prove every branch.

A `strengthens` relation may improve a score when its quality effect is evidenced. It cannot establish required compatibility or close a route.

Relevant alternatives and conflicts need Pack-specific dispositions. Material preconditions must be represented. Every relevant Analysis v2 failure-warning claim needs an evaluation warning with the same claim ID and an allowed disposition.

## Score Anchors

Use these anchors consistently:

- `0.90–1.00`: unusually complete, direct, current evidence with no meaningful ambiguity;
- `0.70–0.89`: publication-ready on this dimension, with only minor non-blocking limitations;
- `0.50–0.69`: credible but materially incomplete; concrete repair is needed;
- `0.00–0.49`: fundamentally weak on this dimension even if no separately recorded blocker exists.

Do not inflate scores to avoid a harsh classification. Record the evidence that controls each score, especially the lowest one.

## Anti-Double-Counting

Evidence can inform several dimensions, but each score note must explain a different judgment. A `chains_with` edge may support graph ordering; compatibility still needs the exact claim pair and artifact contract; evidence quality still depends on the underlying analysis and relation quality. Rephrasing the same edge three times is not three pieces of evidence.

## Decision Rule

1. Any blocker: `rejected`.
2. No blockers and all ten dimensions at least `0.70`: `passed`.
3. No blockers and any dimension below `0.50`: `rejected`.
4. Otherwise, at least one dimension is `0.50–0.69`: `needs_work`.

Write the reviewed metrics, blockers, checked claims, warnings, and proof digest through `.synergy/skill/catalog-data/scripts/write-evaluation.mjs`. The canonical writer computes the decision and writes the separate evaluation record.
