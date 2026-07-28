# Pack Page Template

A public pack page should read like a friendly catalog agent handing a prepared route to a human visitor. It should include:

1. clear title and first-person lead explaining what the pack helps an agent do;
2. “When I’d reach for it” or equivalent use-case guidance;
3. “The route I built” or equivalent explanation rendered from the Pack v3 DAG in stable topological order, including branch/merge semantics and artifact handoffs where present;
4. member skills with human-facing jobs in the pack;
5. why the combination is trustworthy, using compatibility notes and the independent passing Evaluation v2 record, including its minimum metric when present;
6. freshness, conflict, mitigation, and evaluation-warning notes in human language when relevant;
7. version notes only when they help visitors judge freshness.

Only published Pack v3 records with a matching, passing Evaluation v2 record may produce pack pages. Candidate and rejected packs must not appear in public docs. Publishing must fail closed when the independent evaluation is missing, mismatched, or not passing.

Never render raw empty-field placeholders such as `No route notes recorded`, `No complement evidence recorded`, `Overlaps: —`, or `Conflicts: —`. The Pack v3 DAG is required; do not derive or preserve a legacy stage-based route. If compatibility arrays are empty, use compatibility notes or omit the empty section.
