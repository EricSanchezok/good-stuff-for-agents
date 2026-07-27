# Evaluation Failure Modes

## Structural Blockers (cannot be offset by score)

These failures are fundamental — no weight on any rubric dimension can compensate for them. A candidate with any structural blocker is `rejected` regardless of total score.

| Failure Mode | Owner | Description |
| --- | --- | --- |
| `preflight_not_passed` | `pack-synthesis` | Candidate failed deterministic workflow preflight. The controller runs preflight before issuing an evaluation binding; no binding exists for a preflight-failed candidate. |
| `stage_gap_on_main_path` | `pack-synthesis` | A main-path stage has no member skill and no documented, verifiable handoff that fills the gap. |
| `io_mismatch` | `pack-synthesis` | Adjacent stages have incompatible output→input formats and the handoff does not document a conversion. |
| `unresolved_main_path_gap` | `pack-synthesis` | At least one trace from entry to terminal does not reach a verified terminal outcome. |
| `conflict_unresolved` | `pack-synthesis` | Included members have an unresolved `conflicts_with` edge. |

## Scorable Failure Modes

These failures affect scores and can produce `needs_work` or `rejected` depending on severity.

| Failure Mode | Owner | Description |
| --- | --- | --- |
| `intent_too_broad` | `pack-synthesis` | Task intent is too broad to define a coherent workflow. |
| `skill_overlap` | `pack-synthesis` | Multiple skills cover the same stage without a documented reason. |
| `missing_workflow_stage` | `pack-synthesis` | A necessary workflow stage is absent (non-main-path). |
| `stale_member_version` | `skill-normalization` or `source-sync` | A member's pinned version is not current. |
| `weak_evidence` | `skill-deep-analysis` or `skill-dedup-relations` | Claims in the candidate are not traceable to analysis or relation evidence. |
| `license_concentration` | `source-discovery` or `catalog-curation` | Unknown-license skills form too large a proportion of the pack. |
| `poor_source_quality` | `source-discovery` | Member skills come from low-quality or inactive sources. |
| `page_not_traceable` | `catalog-publishing` | Generated public page cannot be traced back to catalog records. |
| `manual_creation` | `pack-synthesis` | Candidate appears hand-crafted rather than synthesized from catalog evidence. |

Every failure mode in evaluation output must include:

- `failure_mode` — stable concise identifier from the tables above;
- `owner` — the skill responsible for the next change;
- `repairability` — `this_run`, `next_run`, `policy_blocked`, `human_decision`, or `fundamental` (structural blockers are always `fundamental`);
- `blocking` — whether it blocks publication (structural blockers are always blocking);
- `recommended_action` — one concrete change that can be verified on reevaluation.

A `needs_work` result should be executable by its owners. Do not return vague advice such as "improve evidence." State which analysis, relation, member, stage, version, conflict, or source fact must change. Evaluation classifies and routes repairs; it never lowers the publication threshold.
