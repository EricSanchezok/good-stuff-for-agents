# Pack Evaluation Rubric

Score each metric from 0.0 to 1.0, then compute the weighted score.

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

The final score must be recorded in `evaluation.json` through `catalog-data/scripts/write-evaluation.mjs`.
