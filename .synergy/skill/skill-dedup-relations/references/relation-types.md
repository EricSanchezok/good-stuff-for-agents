# Relation Types

Allowed canonical relation predicates. Each directly serves a Pack Synthesis decision.

## Predicates

| predicate | pack decision | meaning |
|---|---|---|
| `chains_with` | 排 (ordering) | A's natural output is B's natural input. A → B has strict order. Applies across domains — a scientific-analysis skill can chain into a visualization skill from any source. |
| `strengthens` | 聚 (grouping) | B makes A's output better, more reliable, or more complete. B is not A's downstream — it validates, cross-checks, enhances, or adds quality. Directional. |
| `alternatives` | 替 (selection) | A and B solve the same core task with different methods, platforms, or emphasis. Pack Synthesis chooses one. Does not distinguish between same-source variants and cross-source near-duplicates — both are alternatives. |
| `conflicts_with` | 斥 (exclusion) | A and B cannot coexist in the same pack. Their assumptions, tool chains, or preconditions are incompatible. |

## Removed predicates and their destinations

Do NOT use these. They have been moved to their correct pipeline stages:

| old predicate | new home |
|---|---|
| `same_as` | `skill-normalization` — identity dedup via source_id + path + digest |
| `variant_of` | merged into `alternatives` |
| `fork_of` | `skill-normalization` — source provenance tracking |
| `supersedes` | `skill-normalization` — version_id and version history |
| `overlaps_with` | removed — "looks similar" produces noise edges. Use `alternatives` when the core task is the same. |
| `complements` | split into `chains_with` (strong, ordered) and `strengthens` (quality, directional) |
| `input_enables` | merged into `chains_with` — replace weak "format compatible" evidence with strong "natural next step" evidence |
| `requires_tool` | `skill-deep-analysis` — "tools and permissions" section |
| `fits_workflow_stage` | `skill-deep-analysis` — "where it helps" section |
| `belongs_to_domain` | `skill-deep-analysis` or `skill-normalization` — domain field |

## Edge format

Every edge must include `schema_version`, `subject`, `predicate`, `object`, `weight`, `evidence`, `source`, and `created_at`.

Evidence must cite specific claims from both skills' analysis files. Vague evidence ("looks similar", "same domain", "shared ecosystem") is rejected.
