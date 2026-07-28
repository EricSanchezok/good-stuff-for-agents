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
  "provenance": { ... }
}
```

## Evidence Thread Requirements

`source_id` identifies the source record that produced the artifact.

`path` must identify the recoverable artifact, not just the folder. A downstream agent should be able to combine `source_id`, `path`, and the snapshot manifest to find the original content.

`content_digest` must identify the exact upstream artifact deep analysis should read and retain its real algorithm label. A GitHub tree blob OID is `git_sha1:<40hex>` object identity, not a SHA-256 digest of fetched bytes. Claim a byte digest only when those exact bytes were fetched and hashed.

`declared_name` is a source-provided title/name when available. It is not proof of canonical identity.

`format` and `parse_confidence` describe extraction confidence only. They do not mean the skill is valuable, unique, or semantically clear.

`provenance` is a bounded canonical object built from the exact pinned snapshot artifact. It must be present on every new candidate. Candidates without `provenance` are rejected by normalization.

## Provenance Shape

```json
{
  "artifact_binding": {
    "source_id": "src_...",
    "remote_path": "skills/example/SKILL.md",
    "pinned_commit": "1f630fdf9259cec4a14913127dfd7c3b69ef72eb",
    "git_blob_oid": "git_sha1:634f6fa42e4e697fa6afd293acd7fb8246574876",
    "raw_url": "https://raw.githubusercontent.com/owner/repo/<commit>/skills/example/SKILL.md"
  },
  "upstream_ref": "1f630fdf9259cec4a14913127dfd7c3b69ef72eb",
  "url": "https://github.com/owner/repo/blob/<commit>/skills/example/SKILL.md",
  "raw_url": "https://raw.githubusercontent.com/owner/repo/<commit>/skills/example/SKILL.md",
  "git_blob_oid": "git_sha1:634f6fa42e4e697fa6afd293acd7fb8246574876",
  "size": 19769
}
```

### Allowed keys

- **Provenance top-level**: `artifact_binding`, `upstream_ref`, `url`, `raw_url`, `git_blob_oid`, `size`
- **artifact_binding**: `source_id`, `remote_path`, `pinned_commit`, `git_blob_oid`, `raw_url`

All other keys are forbidden. Values must not contain control characters, absolute paths, or `..` segments.

### Construction rules

- Extracted from `artifact.artifact_binding` and artifact-level fields.
- The binding must be validated for consistency with the source artifact (source_id, path, upstream_ref, git_blob_oid all match).
- Missing or inconsistent `artifact_binding` is skipped — no fallback digest or guessed ref.
- Arbitrary input is never allowed to add paths/commands to provenance.

## What This Contract Does Not Carry

Candidate records are not analysis records. Do not add inferred domain, capability, risk, relation, pack, or quality judgments here. Those belong to normalization only when needed for identity routing, and to deep analysis for real semantic interpretation.
