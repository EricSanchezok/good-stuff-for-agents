# Normalization Quality Gate

A normalized skill record is acceptable when identity and provenance are reliable.

## Required For Write

A normalized skill record must have:

- stable canonical ID;
- source provenance (`source_id`, source path, source URL/ref when available);
- content digest from the snapshot artifact;
- current version ID derived from stable source/content evidence;
- status;
- schema-required arrays/objects present, using empty/unknown values when evidence is absent;
- analysis path placeholder or analysis-needed marker;
- timestamps.

## Sparse Is Allowed

A normalized record should NOT be rejected merely because semantic fields are sparse. Sparse is correct when semantic evidence has not been analyzed yet.

Do not fill capabilities, tools, interfaces, risks, or workflow roles simply to make the record look complete. Completeness without evidence is noise.

## Reject Or Block When

Reject or block when:

- source/path/content_digest cannot be traced;
- identity conflicts with an existing record;
- duplicate/update status is ambiguous;
- source provenance is missing;
- required schema fields cannot be populated even with empty/unknown values.

## Quality Standard

The normalized record should let a downstream agent answer: "Which artifact is this, where did it come from, what version is it, and how do I recover the original content for analysis?"

It does not need to answer: "What is this skill good for?" That question belongs to deep analysis.
