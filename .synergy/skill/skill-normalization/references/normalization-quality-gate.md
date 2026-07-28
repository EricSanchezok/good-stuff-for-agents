# Normalization Quality Gate

A normalized skill record is acceptable when identity and provenance are reliable.

## Required For Write

A normalized skill record must have:

- stable canonical ID;
- source provenance (`source_id`, source path, source URL/ref from pinned snapshot binding, NOT from registry current ref);
- content digest from the snapshot artifact;
- current version ID derived from stable source/content evidence;
- status;
- schema-required arrays/objects present, using empty/unknown values when evidence is absent;
- analysis path placeholder or analysis-needed marker;
- timestamps.

## Provenance Chain (v2)

Every candidate must carry a `provenance` object built during extraction from the exact pinned snapshot artifact. Normalization prepare resolves this provenance against the canonical `catalog/sources/snapshots/` manifests. The resolution must be exact: `source_id`, `remote_path`, pinned commit, blob digest/OID, URLs, and `content_digest` all match. Registry current ref alone is insufficient.

If no exact snapshot match exists or multiple conflicting matches exist, the candidate is placed in `provenance_blocked` with a deterministic reason and no identity decision is made.

Authoritative snapshot manifests used are bound into `input_bindings` via `snapshot_manifests_digest`; `loadWorkload` rechecks those hashes at finalize. Same-count snapshot edits or candidate provenance edits after prepare fail TOCTOU.

`buildNewDraft`/`buildUpdateDraft` use the candidate's exact pinned snapshot provenance for `source.upstream_ref` and source URL/path. License and status still map from the approved registry. Deep analysis can recover the exact artifact from the pinned provenance.

## Sparse Is Allowed

A normalized record should NOT be rejected merely because semantic fields are sparse. Sparse is correct when semantic evidence has not been analyzed yet.

Do not fill capabilities, tools, interfaces, risks, or workflow roles simply to make the record look complete. Completeness without evidence is noise.

## Reject Or Block When

Reject or block when:

- source/path/content_digest cannot be traced;
- provenance is missing, inconsistent, or does not resolve to exactly one snapshot manifest;
- identity conflicts with an existing record;
- duplicate/update status is ambiguous;
- source provenance is missing;
- required schema fields cannot be populated even with empty/unknown values.

## Quality Standard

The normalized record should let a downstream agent answer: "Which artifact is this, where did it come from, what version is it, and how do I recover the original content for analysis?"

It does not need to answer: "What is this skill good for?" That question belongs to deep analysis.
