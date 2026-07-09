# Single Computation Points

Every value in the catalog pipeline is computed exactly once. The stage that computes a value is its Single Computation Point (SCP). All downstream stages consume that value as-is.

If a value is missing, malformed, or inconvenient to consume, return to the SCP owner for repair. Do not work around it by recomputing, reinterpreting, or re-deriving the value downstream.

## SCP Table

| Value | SCP owner | Computation rule | Consumers |
|---|---|---|---|
| `content_digest` | `source-sync` | Computed by `sync-sources.mjs` and written to the snapshot manifest artifact entry | `skill-extraction`, `skill-normalization`, `skill-deep-analysis`, `skill-analyzer` |
| `raw_url` | `source-sync` | Direct-download artifact URL, e.g. `raw.githubusercontent.com/...`, written to the snapshot manifest artifact entry | `skill-deep-analysis`, `skill-analyzer` |
| `license` | `source-sync` | SPDX/evidence recorded from source-level license evidence | `skill-normalization`, downstream catalog consumers |
| `declared_name` | `skill-extraction` | Exact artifact-provided name/title, preserved without trim, slugify, case transform, or semantic cleanup | `skill-normalization` |
| `canonical_name` | `skill-normalization` | Single clean/slugify pass from extraction-provided `declared_name` | `skill-deep-analysis`, relations, packs, publishing |
| `display_name` | `skill-normalization` | Single human-readable name derivation from extraction-provided `declared_name` | `skill-deep-analysis`, relations, packs, publishing |
| `version_id` | `skill-normalization` | Derived from the upstream `content_digest`; no new content hash may be computed | all downstream stages |
| `canonical_skill_id` | `skill-normalization` | Deterministically derived from fixed ordered inputs: `source_id + source.path + declared_name + content_digest` | all downstream stages |
| `source_skill_id` | `skill-normalization` | Deterministically derived from source identity and artifact identity | all downstream stages |
| `status` | `skill-normalization` | Active/preview/deprecated/blocked identity status decision | all downstream stages |

## Violations

These are SCP violations:

- Recomputing `content_digest` in extraction, normalization, deep analysis, a subagent, or validation logic.
- Treating "verification" as permission to compute a competing hash.
- Converting `github.com/.../blob/...` to `raw.githubusercontent.com/...` downstream instead of consuming `raw_url` from sync.
- Re-reading or reinterpreting the source license in normalization or analysis.
- Trimming, slugifying, case-transforming, or otherwise cleaning `declared_name` during extraction.
- Re-deriving `canonical_skill_id`, `canonical_name`, `display_name`, `version_id`, `source_skill_id`, or `status` outside normalization.

## Repair Policy

If a consumer cannot proceed because an SCP value is absent or unusable:

1. Stop at the consumer stage.
2. Record the missing or malformed value.
3. Return to the SCP owner for repair.
4. Do not locally patch the value downstream.

Examples:

- Missing `content_digest` in a snapshot artifact → return to `source-sync`.
- Missing `raw_url` in a snapshot artifact → return to `source-sync`.
- Unclear `license` evidence → return to `source-sync` or source curation.
- Missing `declared_name` in a candidate → return to `skill-extraction`.
- Ambiguous `canonical_skill_id` derivation → return to `skill-normalization`.

## Data Flow

```text
Source Sync (SCP: content_digest, raw_url, license)
  |
  |-- content_digest -------------------------------+
  |-- raw_url ---------------------------------------+
  |-- license ---------------------------------------+
  |                                                  |
  v                                                  |
Skill Extraction (consumer of sync values; SCP: declared_name)
  |
  |-- declared_name (preserved exactly) -------------+
  |-- content_digest (pass-through) -----------------+
  |-- raw_url (pass-through or referenced) ----------+
  |                                                  |
  v                                                  |
Skill Normalization (SCP: canonical identity fields)
  |
  |-- canonical_skill_id ----------------------------+
  |-- canonical_name --------------------------------+
  |-- display_name ----------------------------------+
  |-- version_id ------------------------------------+
  |-- status ----------------------------------------+
  |-- license (mapped from sync, not reinterpreted) -+
  |                                                  |
  v                                                  |
Deep Analysis / skill-analyzer (consumer only)
  |
  |-- reads raw_url from snapshot/dispatch
  |-- uses content_digest directly as source_hash
  |-- does not recompute hash, URL, name, license, or identity
```
