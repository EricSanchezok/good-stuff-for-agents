# Extraction Output Contract

Draft JSON for `append-skill-candidate.mjs`:

```json
{
  "source_id": "src_example_1234abcd",
  "path": "skills/example/SKILL.md",
  "declared_name": "example",
  "format": "synergy_skill",
  "parse_confidence": "high",
  "content_digest": "git_sha1:<40hex>",
  "raw_metadata": {}
}
```

## Evidence Thread Requirements

`source_id` identifies the source record that produced the artifact.

`path` must identify the recoverable artifact, not just the folder. A downstream agent should be able to combine `source_id`, `path`, and the snapshot manifest to find the original content.

`content_digest` must identify the exact upstream artifact deep analysis should read and retain its real algorithm label. A GitHub tree blob OID is `git_sha1:<40hex>` object identity, not a SHA-256 digest of fetched bytes. Claim a byte digest only when those exact bytes were fetched and hashed.

`declared_name` is a source-provided title/name when available. It is not proof of canonical identity.

`format` and `parse_confidence` describe extraction confidence only. They do not mean the skill is valuable, unique, or semantically clear.

`raw_metadata` may include retrieval hints already present in the snapshot/source manifest, but extraction must not invent semantic fields. Use it to preserve explicit upstream metadata, not to smuggle in inferred capabilities, tools, risks, workflow roles, or quality scores.

## What This Contract Does Not Carry

Candidate records are not analysis records. Do not add inferred domain, capability, risk, relation, pack, or quality judgments here. Those belong to normalization only when needed for identity routing, and to deep analysis for real semantic interpretation.
