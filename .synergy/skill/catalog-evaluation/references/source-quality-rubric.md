# Source Quality Rubric

`source_quality` is a required Pack evaluation dimension, not an optional placement signal. Judge whether the sources behind the included members are strong enough to support the Pack's task claims and continued maintenance.

Inspect:

- license status and whether the catalog's use stays within it;
- current reachability and evidence of active maintenance;
- stable source paths, versions, or snapshots;
- parseable skill artifacts with clear triggers, procedures, inputs, outputs, and constraints;
- provenance sufficient to trace Analysis v2 claims and member versions;
- whether public reuse depends on secrets or private access;
- whether updates can be detected and synchronized deterministically;
- concentration risk when several members depend on one weak or uncertain source.

Unknown licensing may permit metadata-only cataloging under policy, but it lowers this dimension and can block raw mirroring. A human-owned license decision is a blocker routed to `catalog-curation`, not a score the evaluator guesses around.

Use a score of at least `0.70` only when source evidence is current, traceable, and adequate for the Pack's claims. Scores from `0.50` through `0.69` identify repairable weakness; a score below `0.50` rejects the candidate even without another blocker.
