# Dedupe Rules

## Identity Classes

- Exact duplicate: same content or same source slot/version under different paths. May be auto-aliased with provenance.
- Semantic duplicate: same task and trigger semantics but different wording or implementation. Requires curation before merge.
- Variant: same family but meaningfully different target platform, tool boundary, or workflow stage.
- Overlap: shared capabilities without being duplicates.

## Merge Policy

False positive merges are worse than missed duplicates. Automation may write duplicate candidates, but only exact duplicates may be auto-aliased.

Preserve:

- source IDs and source skill IDs;
- version IDs;
- provenance paths and refs;
- curation notes;
- published pack references.

Never delete a skill record because it appears duplicated. Mark aliases and relations instead.
