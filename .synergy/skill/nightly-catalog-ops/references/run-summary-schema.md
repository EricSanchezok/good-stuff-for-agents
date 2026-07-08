# Run Summary JSON Schema

The nightly catalog ops controller must produce a machine-readable summary JSON before the human-readable Markdown report. This document describes the required schema.

## schema_version

`1` — integer, required top-level field.

## run_id

Format: `run_YYYY-MM-DD-HHmmss`. Example: `run_2026-07-08-031500`.

## authorization

Object with these required fields:

| Field | Type | Description |
| --- | --- | --- |
| `mode` | string | One of: `read_only`, `local_write`, `commit`, `push`, `scheduled_automation`. |
| `commits_allowed` | boolean | Whether commits are authorized for this run. |
| `pushes_allowed` | boolean | Whether pushes are authorized for this run. |
| `trigger` | string | How the run was triggered: `scheduled`, `manual`, `user_request`. |
| `operator` | string | Human or system identity that authorized the run. |

## starting_state

Object with these required fields:

| Field | Type | Description |
| --- | --- | --- |
| `branch` | string | Git branch at run start. |
| `working_tree_clean` | boolean | Whether working tree had no uncommitted changes. |
| `unrelated_changes_exist` | boolean | Whether unrelated user changes were detected. |
| `catalog_counts` | object | Sub-object with `skills`, `sources`, `packs`, `published_packs` integer fields. |

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
- `promoted_published`: `path` must point to the published pack record or rendered public page.
- `deprecated_removed`: must include `policy_citation` referencing the policy or curation authority.

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

Object describing git actions taken. Required fields:

| Field | Type | Description |
| --- | --- | --- |
| `authorization` | string | Authorization mode for git: `read_only`, `local_write`, `commit`, `push`. |
| `execution_model` | string | How git actions were performed: `none`, `controller_committed`, `controller_pushed`. |
| `allowed_paths` | array | Array of repository-relative paths that were allowed for commit. |
| `message` | string | Summary of git actions taken. Must describe actual actions, never placeholder text. |

**Hard rule**: The git section must never contain `"Push: Pending"`, `"Commits: Pending"`, or any `Pending` or `TBD` value. Every field must describe the definitive state after the run. If git actions were not authorized or not performed, describe that as a factual statement (e.g. `"No commits — push not authorized"`).

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
  "schema_version": 1,
  "run_id": "run_2026-07-08-031500",
  "authorization": {
    "mode": "scheduled_automation",
    "commits_allowed": true,
    "pushes_allowed": true,
    "trigger": "scheduled",
    "operator": "nightly-cron"
  },
  "starting_state": {
    "branch": "main",
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
      "object_type": "skill",
      "object_id": "skill_ai_code_review",
      "path": "catalog/skills/records/ai/skill_ai_code_review.yaml",
      "state": "written_updated_validated",
      "owner": "skill-normalization",
      "reason": "Normalized from candidate with updated capabilities and version.",
      "verification": ["npm --prefix .synergy run catalog:validate"]
    }
  ],
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
    "execution_model": "controller_pushed",
    "allowed_paths": ["catalog/", "docs/", "reports/"],
    "message": "Committed 3 files (catalog records, public pages, run report) and pushed to main."
  },
  "blockers": [],
  "next_run_priorities": [
    {
      "priority": 1,
      "object_id": "skill_ai_code_review",
      "action": "Deep analysis needed for newly normalized skill.",
      "owner": "skill-deep-analysis"
    }
  ]
}
```
