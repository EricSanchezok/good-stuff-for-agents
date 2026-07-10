# Pack Output Schema

Candidate packs are written through `catalog-data/scripts/write-pack-record.mjs` into `catalog/packs/candidates/<pack-id>/pack.yaml`.

Minimum draft fields:

```json
{
  "pack_id": "pack_example_1234abcd",
  "name": "Example Pack",
  "status": "candidate",
  "intent": "Task this pack supports",
  "domain": "example-domain",
  "created_by_run": "run_...",
  "version": "0.1.0",
  "members": [],
  "excluded": [],
  "workflow": {
    "summary": "Short human-readable route summary.",
    "stages": [
      {
        "name": "Plan the work",
        "description": "What happens in this stage and why it matters.",
        "member_skill_ids": ["skl_..."]
      }
    ]
  },
  "compatibility": {
    "notes": "Human-readable compatibility summary.",
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

Every member must include `skill_id`, pinned `version_id`, role, stage, and inclusion reason. `workflow.stages` must be non-empty, and every stage must include a name or stage plus a description. Compatibility must include `notes` or at least one non-empty chains, strengthens, alternatives, conflicts, or unresolved array. Candidate evidence belongs next to the pack; publication happens only after evaluation passes.

Do not submit plain-string `workflow` values for new pack drafts. Public rendering depends on structured workflow and compatibility evidence so the page can explain the pack to a human visitor without placeholder text.
