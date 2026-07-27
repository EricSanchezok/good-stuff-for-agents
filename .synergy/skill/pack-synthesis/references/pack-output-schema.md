# Pack Output Schema

Candidate packs are written through `catalog-data/scripts/write-pack-record.mjs` into `catalog/packs/candidates/<pack-id>/pack.yaml`.

## Schema version

All pack records use `schema_version: 2`.

## Minimum draft shape

```json
{
  "pack_id": "pack_example_1234abcd",
  "name": "Example Pack",
  "intent": "Task this pack supports",
  "domain": "example-domain",
  "created_by_run": "run_...",
  "version": "0.1.0",
  "members": [
    {
      "skill_id": "skl_example_a",
      "version_id": "sha256:abc123...",
      "role": "planner",
      "stage": "stage-1",
      "inclusion_reason": "Provides task planning capability"
    },
    {
      "skill_id": "skl_example_b",
      "version_id": "sha256:def456...",
      "role": "executor",
      "stage": "stage-2",
      "inclusion_reason": "Carries out generated plan"
    }
  ],
  "excluded": [],
  "workflow": {
    "summary": "Plan then execute the requested task.",
    "entry": {
      "description": "User provides a task description as natural language.",
      "input_contract": "A string containing the task to perform."
    },
    "terminal": {
      "description": "The task is completed and results are returned.",
      "output_contract": "A structured result with status, output, and any artifacts produced."
    },
    "stages": [
      {
        "stage_id": "stage-1",
        "name": "Plan",
        "description": "Decompose the task into steps.",
        "member_ids": ["skl_example_a"],
        "handoffs": [
          {
            "from_stage": "stage-1",
            "from_skill": "skl_example_a",
            "to_stage": "stage-2",
            "to_skill": "skl_example_b",
            "produced_artifact": "A plan document with ordered steps.",
            "consumed_as": "The plan to execute step by step."
          }
        ]
      },
      {
        "stage_id": "stage-2",
        "name": "Execute",
        "description": "Run each step from the plan.",
        "member_ids": ["skl_example_b"],
        "handoffs": []
      }
    ],
    "branches": []
  },
  "compatibility": {
    "notes": "Both skills operate on plain text and produce structured output.",
    "chains": [],
    "strengthens": [],
    "alternatives": [],
    "conflicts": [],
    "unresolved": []
  },
  "evidence": { "analysis_paths": [], "relation_edges": [] },
  "evaluation": { "evaluation_id": null, "score": null, "status": "pending" }
}
```

## Workflow contract fields

- `workflow.entry` — `{description, input_contract}`. Non-empty, non-placeholder.
- `workflow.terminal` — `{description, output_contract}`. Non-empty, non-placeholder.
- `workflow.stages[]` — ordered stages, each with:
  - `stage_id` — stable string identifier.
  - `name` — human-readable stage name.
  - `description` — what happens in this stage. Non-empty, non-placeholder.
  - `member_ids[]` — non-empty array of skill IDs from pack `members`.
  - `handoffs[]` — handoffs owned by this stage (where handoff's `from_stage === this stage_id`).
- `workflow.handoffs[]` items — `{from_stage, from_skill, to_stage, to_skill, produced_artifact, consumed_as}`. All fields non-empty, non-placeholder. Handoffs must be stored in the stage whose `stage_id` equals `from_stage`.
- `workflow.branches[]` — optional conditional branches. Each `{condition, description, from_stage, to_stage}`. All fields non-empty, non-placeholder. Stage endpoints must exist.

## Compatibility fields

- `notes` — human-readable summary string.
- `chains`, `strengthens`, `alternatives`, `conflicts`, `unresolved` — arrays of structured evidence objects.
- `unresolved` non-empty blocks candidate preflight (stable reason code: `compatibility_unresolved`).

## Preflight enforcement

Preflight is deterministic and computed at runtime — it is never authored or persisted as a boolean field. It runs at:

1. **Candidate write** — `write-pack-candidate.mjs` runs preflight before spawning the record writer.
2. **Evaluation binding** — `createEvaluationBinding` rejects preflight-failed candidates.
3. **Promotion eligibility** — `packPromotionIneligibilityReasons` appends preflight errors (defense-in-depth).
4. **Catalog validation** — `validateCatalog` runs preflight on both candidate and published packs.

## Controller-owned fields

Candidate drafts must not include controlled fields: `status` (except `candidate`), `record_bucket`, `published_at`, `output_path`, `expected_path`, `destination`, or any `promot`-prefixed field.
