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
  "workflow": { "stages": [] },
  "compatibility": { "complements": [], "overlaps": [], "conflicts": [] },
  "evidence": { "analysis_paths": [], "relation_edges": [] },
  "evaluation": { "evaluation_id": null, "score": null, "status": "pending" }
}
```

Every member must include `skill_id`, pinned `version_id`, role, stage, and inclusion reason. Candidate evidence belongs next to the pack; publication happens only after evaluation passes.
