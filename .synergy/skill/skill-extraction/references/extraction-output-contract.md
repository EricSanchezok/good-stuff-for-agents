# Extraction Output Contract

Draft JSON for `append-skill-candidate.mjs`:

```json
{
  "source_id": "src_example_1234abcd",
  "path": "skills/example/SKILL.md",
  "declared_name": "example",
  "format": "synergy_skill",
  "parse_confidence": "high",
  "content_digest": "sha256:...",
  "raw_metadata": {}
}
```

## Evidence Thread Requirements

`source_id` identifies the source record that produced the artifact.

`path` must identify the recoverable artifact, not just the folder. A downstream agent should be able to combine `source_id`, `path`, and the snapshot manifest to find the original content.

`content_digest` must match the exact content deep analysis should read. If the digest is computed from different content than the artifact an analyst will read, the evidence thread is broken.

`declared_name` is a source-provided title/name when available. It is not proof of canonical identity.

`format` and `parse_confidence` describe extraction confidence only. They do not mean the skill is valuable, unique, or semantically clear.

`raw_metadata` may include retrieval hints already present in the snapshot/source manifest, but extraction must not invent semantic fields. Use it to preserve explicit upstream metadata, not to smuggle in inferred capabilities, tools, risks, workflow roles, or quality scores.

## What This Contract Does Not Carry

Candidate records are not analysis records. Do not add inferred domain, capability, risk, relation, pack, or quality judgments here. Those belong to normalization only when needed for identity routing, and to deep analysis for real semantic interpretation.
