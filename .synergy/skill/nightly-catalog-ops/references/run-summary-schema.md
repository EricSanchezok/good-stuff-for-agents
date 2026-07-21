# Run Summary JSON Schema

The nightly catalog ops controller must produce a machine-readable summary JSON before the human-readable Markdown report. This document describes the required schema.

## schema_version

`2` for newly written summaries. Schema version 2 requires `publication_progress`. Historical schema-version-1 summaries remain checkable without that field, but the report writer rejects new version-1 output so the current contract cannot be bypassed.

## run_id

Format: `run_YYYY-MM-DD-HHmmss`. Example: `run_2026-07-08-031500`.

## authorization

Object with these required fields:

| Field | Type | Description |
| --- | --- | --- |
| `mode` | string | One of: `read_only`, `local_write`, `commit`, `push`, `scheduled_automation`. |
| `commits_allowed` | boolean | Historical run-description flag retained for report and publication-flow compatibility; not Git authorization. |
| `pushes_allowed` | boolean | Historical run-description flag retained for report compatibility; not Git authorization. |
| `trigger` | string | How the run was described as triggered: `scheduled`, `manual`, `user_request`. |
| `operator` | string | Historical human or system identity recorded for the run. It must not be Issue- or demand-derived. |
| `source` | string | Historical run-description origin: `user` or `scheduled_automation`. GitHub Issues and demand content are never accepted values and never authorize Git. |

Schema version 2 validates all six fields and their types. These fields are historical run description used by reporting and publication-flow validation; they are not Git authorization and cannot be made authoritative by workspace JSON. Authorization flags must match `mode`: `read_only` and `local_write` require both booleans false; `commit` requires commits true and pushes false; `push` and `scheduled_automation` require both booleans true. `scheduled_automation` source requires trigger `scheduled`; `user` source requires `manual` or `user_request`. Missing or non-boolean flags are invalid and cannot disable downstream promotion enforcement. GitHub Issues, demand data, summaries, manifests, and agents never authorize commit or push.

## touched_paths_manifest

Schema version 2 requires two top-level fields that bind the read-only audit description to the exact manifest bytes:

| Field | Type | Description |
| --- | --- | --- |
| `touched_paths_manifest` | string | Canonical workspace-relative path to the run's touched-paths JSON manifest. |
| `touched_paths_manifest_sha256` | string | Lowercase 64-character SHA-256 digest of the exact manifest bytes. |

The manifest uses schema version 1 and contains `run_id`, `mode` (`ordinary` or `implementation`), full `base_head`, historical run-description `source` and `operator`, and an exact `paths` array. The manifest `run_id`, source, and operator must match the summary. `git.allowed_paths` must equal the manifest set exactly, and the read-only audit rejects changed or staged files outside the manifest and manifest entries with no current change. The summary and manifest are not authorization artifacts.

## starting_state

Object with these required fields:

| Field | Type | Description |
| --- | --- | --- |
| `branch` | string | Git branch at run start. |
| `head` | string | Full lowercase Git object ID for the run base. It must match manifest `base_head`, current `HEAD`, and optional audit `--expected-head`. |
| `working_tree_clean` | boolean | Whether working tree had no uncommitted changes. |
| `unrelated_changes_exist` | boolean | Whether unrelated user changes were detected. |
| `catalog_counts` | object | Sub-object with `skills`, `sources`, `packs`, `published_packs` non-negative integer fields. |

Schema version 2 requires every listed field with the declared type. `head` must be a full 40- or 64-character lowercase object ID to prevent replay against another base. In particular, `published_packs` cannot be omitted or represented by a string because it determines whether the 7-day recovery trigger applies.

## maintenance_preflight

Object with these required fields:

| Field | Type | Description |
| --- | --- | --- |
| `ok` | boolean | Whether preflight passed without blocking errors. |
| `steps` | array | Array of step objects, each with `name` (string), `ok` (boolean), and optional `error` (string). |
| `validation` | object | Must include `ok` (boolean) and `errors` (array of strings). |
| `git_clean_before_growth` | boolean | Whether git was clean entering growth phase. |

## growth

Object with these required fields:

| Field | Type | Description |
| --- | --- | --- |
| `ok` | boolean | Whether growth phase completed without blocking errors. |
| `growth_report` | string or null | Path to the growth run report, or null if growth was skipped. |
| `objects_touched` | object | Sub-object with counts: `sources_discovered`, `sources_activated`, `skills_extracted`, `skills_normalized`, `analyses_written`, `relations_written`, `packs_synthesized`, `packs_evaluated`. All integers. |

## terminal_states

Array of objects. Every catalog object touched by the run must have exactly one terminal-state item. Shape:

| Field | Type | Description |
| --- | --- | --- |
| `object_type` | string | One of: `source`, `skill`, `analysis`, `relation`, `pack`, `index`, `report`, `public_page`. |
| `object_id` | string | Canonical ID of the affected object. |
| `path` | string | Repository-relative path to the affected artifact. |
| `state` | string | Terminal state enum: `no_op`, `written_updated_validated`, `evaluated`, `promotion_ready`, `promoted_published`, `deprecated_removed`, `blocked`. |
| `owner` | string | Skill or role responsible for this object's state (e.g. `catalog-maintenance`, `catalog-growth-ops`, `catalog-evaluation`). |
| `reason` | string | Human-readable explanation of why this state was reached. |
| `verification` | array or null | Array of verification command strings run, or null if none applicable. |

### Per-state field requirements

- `blocked`: must include `reason`, `owner`, and a `blocked_reason` field with the exact blocking cause.
- `no_op`: `reason` must prove that no eligible action existed for this run.
- `written_updated_validated`: `verification` must be a non-empty array with at least one verification command string.
- `evaluated`: must include an `evaluation_outcome` field set to `passed`, `needs_work`, or `rejected`.
- `promotion_ready`: must include the `next_action` field naming the promoter skill.
- `promoted_published`: requires a non-empty publishing-check `verification` array. For `object_type: pack`, `path` must be the canonical record `catalog/packs/published/<object_id>/pack.yaml`; the full report checker also requires that record to parse as the same published pack and that `docs/packs/<domain-slug>/<object_id>.md` exists. A separate `public_page` terminal may point to the rendered page and does not become a pack target.
- `deprecated_removed`: must include `policy_citation` referencing the policy or curation authority.

## publication_progress

Required object proving deterministic publication progress for the run. The catalog publication threshold remains `0.78`; this section records bounded execution and does not change scoring.

| Field | Type | Description |
| --- | --- | --- |
| `mode` | string | `normal` or `recovery`. |
| `published` | boolean | Whether this run published a target. |
| `recovery_trigger` | object | Required trigger evidence with `completed_full_runs_since_publication` (non-negative integer), `days_since_publication` (non-negative number), and `evidence` (non-empty string). |
| `targets_attempted` | array | Ordered targets selected in this run; maximum 2. |
| `no_publish_reason` | object or null | Must be null when published; required structured proof when no publication occurred. |

`mode` must be `recovery` when either applicable trigger threshold is met: at least 3 completed full runs since publication, or at least 7 days since publication when the catalog has previously published a pack. Before the first publication, elapsed days alone do not trigger recovery. A recovery mode without an applicable threshold is invalid. The validator trusts the recorded trigger evidence and does not scan run history.

Each `targets_attempted` item has this shape:

| Field | Type | Description |
| --- | --- | --- |
| `object_id` | string | Candidate target ID. |
| `selection_reason` | string | Evidence-backed reason this target was selected. |
| `attempts` | array | One to 3 substantive repair attempts, ordered and numbered from 1. |
| `outcome` | string | `needs_work`, `blocked`, `rejected`, `promotion_ready`, or `promoted_published`. |
| `blocker_class` | string or null | Blocking class, or null. `policy` and `human_decision` are the only classes that permit early `needs_work`. |

Each attempt contains `attempt` (its 1-based sequence integer), `outcome` (`needs_work`, `blocked`, `rejected`, `passed`, `promotion_ready`, or `promoted_published`), and non-empty `evidence`.

`needs_work` is only an early terminal outcome when `blocker_class` is `policy` or `human_decision`. If the third substantive repair remains unsuccessful, the third attempt, target outcome, and matching pack terminal `evaluation_outcome` must all be `rejected`. At most 2 targets and at most 3 attempts per target are valid.

When `published` is false, `no_publish_reason` is required with:

| Field | Type | Description |
| --- | --- | --- |
| `code` | string | `no_eligible_targets`, `targets_exhausted`, or `blocked`. |
| `summary` | string | Non-empty explanation of why publication did not occur. |
| `evidence` | array | Non-empty array of non-empty evidence strings proving selection or exhaustion. |

No attempted targets requires `no_eligible_targets`; attempted targets cannot use that code and must end early `needs_work`, `blocked`, or `rejected`. Attempted target IDs and `object_type: pack` terminal-state IDs must match in both directions, including unpublished runs, and each target outcome must match the pack terminal state. `public_page` terminals are excluded from this pack target set. A `promoted_published` pack terminal state requires `published: true`, and `published: true` requires both a `promoted_published` target outcome and pack terminal state. A passing or promotion-ready pack/target cannot remain unpublished when `authorization.commits_allowed` is true.

## publishing_final_gates

Object with these required fields:

| Field | Type | Description |
| --- | --- | --- |
| `ok` | boolean | Whether final publishing gates passed. |
| `render` | object | `{ ok: boolean, pages_written: integer }`. |
| `drift` | object | `{ ok: boolean }`. |
| `links` | object | `{ ok: boolean }`. |
| `boundary` | object | `{ ok: boolean, issues: array }`. |
| `final_validation` | object | `{ ok: boolean, errors: array }`. |

## git

Object preserving the run's historical Git description. It does not authorize or perform Git actions. Required fields:

| Field | Type | Description |
| --- | --- | --- |
| `authorization` | string | Historical run-description mode: `read_only`, `local_write`, `commit`, `push`. It cannot authorize Git. |
| `execution_model` | string | Historical execution description: `none`, `controller_committed`, `controller_pushed`. Ordinary nightly runs use `none`. |
| `allowed_paths` | array | Exact repository-relative path set described by the touched-paths manifest for audit review. |
| `message` | string | Factual run description. It must never claim that the repository audit performed commit or push. |

**Hard rule**: The git section must never contain `"Push: Pending"`, `"Commits: Pending"`, or any `Pending` or `TBD` value. Every field must describe the definitive repository-skill state after the run. Ordinary nightly runs end with `execution_model: "none"` and a factual statement that no Git mutation occurred. Any later commit or push belongs to an external trusted controller and is not authorized by this summary.

## blockers

Array of blocker objects. Each blocker:

| Field | Type | Description |
| --- | --- | --- |
| `type` | string | `validation`, `evidence`, `policy`, `license`, `user_authority`, `tooling`, `integration`. |
| `object_id` | string or null | Affected object ID, or null if system-level. |
| `description` | string | What is blocked and why. |
| `owner` | string | Skill or role that must resolve the block. |
| `next_action` | string | Concrete next step the owner must take. |

## next_run_priorities

Array of priority objects for the next run:

| Field | Type | Description |
| --- | --- | --- |
| `priority` | integer | 1 is highest. |
| `object_id` | string | ID of the object needing attention. Must exist in `terminal_states` from this run. |
| `action` | string | Recommended action for the next run. |
| `owner` | string | Skill that should handle it. |

## Full example

```json
{
  "schema_version": 2,
  "run_id": "run_2026-07-08-031500",
  "authorization": {
    "mode": "scheduled_automation",
    "commits_allowed": true,
    "pushes_allowed": true,
    "trigger": "scheduled",
    "operator": "nightly-cron",
    "source": "scheduled_automation"
  },
  "touched_paths_manifest": "reports/nightly-catalog-ops/2026-07-08-031500-touched-paths.json",
  "touched_paths_manifest_sha256": "9b6f196a6fdc5480e1c49be7076ca7d8239999dc9de691d781283035344af253",
  "starting_state": {
    "branch": "main",
    "head": "0123456789abcdef0123456789abcdef01234567",
    "working_tree_clean": true,
    "unrelated_changes_exist": false,
    "catalog_counts": {
      "skills": 12,
      "sources": 5,
      "packs": 3,
      "published_packs": 1
    }
  },
  "maintenance_preflight": {
    "ok": true,
    "steps": [
      { "name": "validate-start", "ok": true },
      { "name": "migrate", "ok": true }
    ],
    "validation": { "ok": true, "errors": [] },
    "git_clean_before_growth": true
  },
  "growth": {
    "ok": true,
    "growth_report": "reports/catalog-growth-ops/2026-07-08-031500-growth.md",
    "objects_touched": {
      "sources_discovered": 3,
      "sources_activated": 1,
      "skills_extracted": 2,
      "skills_normalized": 2,
      "analyses_written": 1,
      "relations_written": 3,
      "packs_synthesized": 1,
      "packs_evaluated": 1
    }
  },
  "terminal_states": [
    {
      "object_type": "source",
      "object_id": "src_openai_cookbook",
      "path": "catalog/sources/registry.yaml",
      "state": "no_op",
      "owner": "source-sync",
      "reason": "Source already at latest snapshot; no new artifacts found since last sync.",
      "verification": null
    },
    {
      "object_type": "pack",
      "object_id": "pack_ai_code_review",
      "path": "catalog/packs/published/pack_ai_code_review/pack.yaml",
      "state": "promoted_published",
      "owner": "catalog-publishing",
      "reason": "Evaluation passed at or above 0.78 and the pack was promoted and rendered.",
      "verification": ["npm --prefix .synergy run publish:check"]
    }
  ],
  "publication_progress": {
    "mode": "normal",
    "published": true,
    "recovery_trigger": {
      "completed_full_runs_since_publication": 1,
      "days_since_publication": 2,
      "evidence": "The previous publication is recorded in run_2026-07-06-031500."
    },
    "targets_attempted": [
      {
        "object_id": "pack_ai_code_review",
        "selection_reason": "Highest-ranked eligible candidate with complete evidence.",
        "attempts": [
          {
            "attempt": 1,
            "outcome": "promoted_published",
            "evidence": "Evaluation passed at 0.82; promotion and publication checks passed."
          }
        ],
        "outcome": "promoted_published",
        "blocker_class": null
      }
    ],
    "no_publish_reason": null
  },
  "publishing_final_gates": {
    "ok": true,
    "render": { "ok": true, "pages_written": 4 },
    "drift": { "ok": true },
    "links": { "ok": true },
    "boundary": { "ok": true, "issues": [] },
    "final_validation": { "ok": true, "errors": [] }
  },
  "git": {
    "authorization": "push",
    "execution_model": "none",
    "allowed_paths": [
      "catalog/packs/published/pack_ai_code_review/pack.yaml",
      "docs/packs/code-review/pack_ai_code_review.md",
      "reports/nightly-catalog-ops/2026-07-08-031500-run.md",
      "reports/nightly-catalog-ops/2026-07-08-031500-summary.json",
      "reports/nightly-catalog-ops/2026-07-08-031500-touched-paths.json"
    ],
    "message": "No Git mutation was performed; the exact manifested paths are prepared for read-only trusted-controller review."
  },
  "blockers": [],
  "next_run_priorities": [
    {
      "priority": 1,
      "object_id": "pack_ai_code_review",
      "action": "Recheck the published pack after any member or evidence change.",
      "owner": "catalog-evaluation"
    }
  ]
}
```
