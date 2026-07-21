# Catalog Artifact Contract

Use this reference to keep cross-skill handoffs stable. You should never leave a downstream agent guessing where evidence or drafts live.

## Discovery Artifacts

- Discovery report: `reports/source-discovery/<run-id>.md`
- Candidate draft before append: `reports/source-discovery/<run-id>-candidates.json`
- Canonical appended candidates: `catalog/sources/candidates.jsonl`

A discovery report should explain why each source is relevant, what evidence was inspected, license evidence, parseability, duplicates considered, and rejection reasons.

## Source Sync Artifacts

- Snapshot manifests: `catalog/sources/snapshots/<source-id>-<ref>.json`
- Source state events: `catalog/sources/state.jsonl`
- Updated source records: `catalog/sources/records/<prefix>/<source-id>.yaml`

A snapshot manifest should contain the pinned upstream commit, checked time, discovered artifacts, strict source-relative paths, canonical raw URLs, and algorithm-correct provenance. GitHub tree metadata is recorded as `git_sha1:<40hex>` object identity; it is not a SHA-256 digest of fetched bytes.

Each artifact carries a deterministic `artifact_binding` with `source_id`, `remote_path`, pinned commit, Git blob OID, canonical raw URL, and nullable canonical skill/output fields. After normalization, the trusted analysis controller must select the artifact from the latest source snapshot only when its `content_digest` exactly equals the normalized skill record's `identity.current_version_id`. The controller binds both values separately: `current_version_id` is the normalized version identity copied from snapshot `content_digest`, while `git_blob_oid` is the algorithm-labeled Git object identity used to verify fetched bytes. It then fills the canonical skill ID and derived output path, wraps the exact binding in a strict run-scoped JSON dispatch envelope, and binds the envelope with `dispatch_digest`. A newer unmatched snapshot requires normalization; it must never fall back to an older artifact.

## Skill Candidate Artifacts

- Candidate JSONL: `catalog/skills/candidates/<run-id>.jsonl`
- Extraction report: `reports/skill-extraction/<run-id>.md`

A candidate is evidence of a parseable skill-like artifact. It is not a canonical skill record and should not include guessed capabilities.

## Normalized Skill Artifacts

- Agent-authored normalized draft: `reports/skill-normalization/<skill-id>.json`
- Canonical skill record: `catalog/skills/records/<prefix>/<skill-id>.yaml`

A normalized draft should include source identity, display name, aliases, source path, version ID, capabilities, interfaces, tool profile, risk, and quality confidence.

## Analysis Artifacts

- Agent-authored analysis draft: `reports/skill-analysis/<skill-id>.json`
- Analysis markdown: `catalog/analyses/<prefix>/<skill-id>.md`

The analysis should include purpose, trigger semantics, capability breakdown, workflow role, inputs/outputs, tool profile, compatibility notes, conflict notes, dedupe notes, evaluation hooks, and evidence confidence.

## Relation Artifacts

- Relation review report: `reports/skill-relations/<run-id>.md`
- Relation edge draft JSONL: `reports/skill-relations/<run-id>-edges.jsonl`
- Canonical relation edges: `catalog/relations/edges-00000.jsonl`

Relation edges must be supported by evidence. Exact duplicates, overlaps, complements, and conflicts should remain distinct.

## Pack Artifacts

- Agent-authored pack draft: `reports/pack-synthesis/<pack-id>.json`
- Candidate pack record: `catalog/packs/candidates/<pack-id>/pack.yaml`

A pack draft should explain intent, domain, member roles, stages, inclusions, exclusions, compatibility, and evidence paths.

## Evaluation Artifacts

- Agent-authored evaluation draft: `reports/catalog-evaluation/<pack-id>.json`
- Candidate evaluation: `catalog/packs/candidates/<pack-id>/evaluation.json`

Evaluation must include rubric scores, evidence for each score, failure modes, recommendations, and pass/fail status.

## Public Artifacts

- Public entry point: `README.md`
- Public pages: `docs/**/*.md`

Public pages must be clean visitor-facing Markdown. They may describe catalog entries and human-readable provenance, but they must not expose internal mechanics or hidden metadata.

## Growth and Total Run Artifacts

### Growth Run Artifacts

- Growth run report: `reports/catalog-growth-ops/<YYYY-MM-DD-HHmmss>-growth.md`

A growth run report should describe discovery targets, sources activated, skills extracted and normalized, analyses completed, relations built, packs synthesized, evaluation results, and next-run priorities.

### Total Run Artifacts

- Total run report: `reports/nightly-catalog-ops/<YYYY-MM-DD-HHmmss>-run.md`

A total run report should summarize maintenance preflight, growth run, final validation/publishing checks, commit/push status, and any policy blockers.
