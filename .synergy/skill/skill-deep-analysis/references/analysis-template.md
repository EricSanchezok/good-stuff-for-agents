# Analysis Template

Canonical analysis files live in `catalog/analyses/<2-char-prefix>/<skill-id>.md` and are written only through `catalog-data/scripts/write-analysis.mjs`.

Required frontmatter:

```yaml
---
schema_version: 1
skill_id: skl_example_1234abcd
source_hash: sha256:...
analysis_version: 1
confidence: high
updated_at: "2026-07-07T00:00:00.000Z"
---
```

Required sections, in order:

```md
# <Skill Name>

## Core Purpose
## Trigger Semantics
## Capability Breakdown
## Workflow Role
## Inputs / Outputs
## Tool and Permission Profile
## Compatibility Notes
## Conflict Notes
## Dedupe Notes
## Evaluation Hooks
## Evidence and Confidence
```

Each section must distinguish:

- source-supported facts;
- analyst inference;
- missing or ambiguous evidence;
- safety, permission, or side-effect assumptions.

Do not paste large third-party skill bodies unless license policy allows mirroring. Prefer short quoted excerpts, hashes, metadata, and provenance.
