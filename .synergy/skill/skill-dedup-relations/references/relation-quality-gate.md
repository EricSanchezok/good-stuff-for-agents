# Relation Quality Gate

Before writing relation edges:

- subject and object must be valid catalog skill IDs
- predicate must be one of: `chains_with`, `strengthens`, `alternatives`, `conflicts_with`
- weight must be a number from 0 to 1
- evidence must cite specific claims from both skills' analysis files — not names, domains, or shared ecosystems
- source must identify the producer (`skill-dedup-relations`, `catalog-curation`, or a run ID)
- if evidence is only "looks similar", "same domain", or "shared source", reject the edge

Reject edges with evidence that is:

- based on skill names or declared_name similarity
- based on shared source_id or ecosystem
- generic ("both help with X" without citing which analysis section says what)
- derived from normalized record metadata rather than analysis content

Prefer fewer high-quality edges over dense noisy graphs. A single well-evidenced `chains_with` edge is worth more than ten `overlaps_with` edges (which no longer exist in the predicate set).
