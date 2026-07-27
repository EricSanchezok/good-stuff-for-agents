# Publication Thresholds

## Prerequisites

Only candidates that pass deterministic workflow preflight and have no structural blockers (stage gap on main path, IO mismatch, unresolved main-path gap, unresolved conflict) may be scored. The controller runs preflight before issuing an evaluation binding; a candidate that fails preflight never receives a binding and cannot enter evaluation.

## Score Thresholds

- `score >= 0.78` and no blocking conflict: `passed`, eligible for publication.
- `0.60 <= score < 0.78`: `needs_work`, retained as candidate.
- `score < 0.60`: `rejected`, retained with failure reasons.

## Structural Blockers (override all score thresholds)

A candidate with any of these is `rejected` regardless of total score:

- `preflight_not_passed` — deterministic workflow preflight failed (binding never issued);
- `stage_gap_on_main_path` — a main-path stage has no member skill;
- `io_mismatch` — adjacent stage input/output formats are incompatible;
- `unresolved_main_path_gap` — a trace from entry to terminal does not close;
- `conflict_unresolved` — included members have an unresolved `conflicts_with` edge.

## Additional Publication Blockers

- unresolved high-severity conflict;
- missing member version pin;
- missing evidence;
- schema validation failure;
- candidate contains removed, broken, or blocked skills;
- raw mirrored content violates license policy;
- generated docs cannot trace back to catalog records.

Passing evaluation does not itself publish; promotion is performed through catalog-data and publishing scripts. Publication recovery changes target priority and repair effort only. It never lowers the `0.78` threshold or waives blockers.
