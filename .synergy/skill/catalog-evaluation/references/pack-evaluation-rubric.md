# Pack Evaluation Rubric

Score each metric from 0.0 to 1.0, then compute the weighted score. All metrics are scored independently — evidence used in one dimension must not be double-counted in another without distinct, dimension-specific justification.

| Metric | Weight | Meaning |
| --- | ---: | --- |
| relevance | 0.16 | Fits the stated task intent. |
| coverage | 0.12 | Covers necessary workflow stages. |
| non_redundancy | 0.12 | Avoids unnecessary overlap. |
| workflow_coherence | 0.14 | Has clear ordering and handoffs. |
| compatibility | 0.12 | Tools, inputs, outputs, and permissions work together. |
| conflict_control | 0.10 | Conflicts are absent or resolved. |
| evidence_quality | 0.10 | Claims trace to records, analyses, and relation edges. |
| actionability | 0.08 | Agent can use the pack without guessing. |
| freshness | 0.06 | Member versions and source state are current. |

## Blocking Checks (run before scoring)

These checks evaluate structural integrity. If any fails, the candidate is rejected regardless of total score — no weight can compensate for a broken contract.

| Check | Condition | Failure Mode |
| --- | --- | --- |
| Workflow preflight | Controller runs deterministic preflight and evaluation binding exists only on success | `preflight_not_passed` — fundamental, reject immediately |
| Stage gap on main path | Every main-path stage has a member or documented, verifiable gap | `stage_gap_on_main_path` — fundamental, blocking |
| Input-output mismatch | Every adjacent stage handoff defines input/output compatibility | `io_mismatch` — fundamental, blocking |
| Unresolved main-path gap | Every trace from entry to terminal is closed | `unresolved_main_path_gap` — fundamental, blocking |
| Relation edge conflicts | No unresolved `conflicts_with` edges between included members | `conflict_unresolved` — blocking |

## Anti-Double-Counting Rule

The same relation edge (e.g., a single `chains_with` edge between skill A and skill B) must not independently increase scores in `compatibility`, `workflow_coherence`, and `evidence_quality` without distinct justification per dimension. Specifically:

- If an edge is cited as evidence for `workflow_coherence` (it defines the sequential order), it may contribute to that one dimension at face value.
- To also contribute to `compatibility`, the evaluation must reference additional evidence from the skill analyses showing compatible tool inputs/outputs — not just the relation edge.
- To also contribute to `evidence_quality`, the evaluation must reference the underlying analysis quality or source quality — not just the relation edge.
- Re-quoting the same edge body in three dimensions with different labels is invalid.

The final score must be recorded in `evaluation.json` through `catalog-data/scripts/write-evaluation.mjs`.
