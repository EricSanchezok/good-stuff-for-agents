# Publication Thresholds

- `score >= 0.78` and no blocking conflict: `passed`, eligible for publication.
- `0.60 <= score < 0.78`: `needs_work`, retained as candidate.
- `score < 0.60`: `rejected`, retained with failure reasons.

Additional publication blockers:

- unresolved high-severity conflict;
- missing member version pin;
- missing evidence;
- schema validation failure;
- candidate contains removed, broken, or blocked skills;
- raw mirrored content violates license policy;
- generated docs cannot trace back to catalog records.

Passing evaluation does not itself publish; promotion is performed through catalog-data and publishing scripts. Publication recovery changes target priority and repair effort only. It never lowers the `0.78` threshold or waives blockers.
