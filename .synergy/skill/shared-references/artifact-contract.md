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

A snapshot manifest should contain the upstream ref, checked time, discovered artifacts, artifact digests, and enough URLs or paths for extraction to inspect the source content.

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

- Growth run report: `reports/catalog-growth-ops/<YYYY-MM-DD>-growth.md`

A growth run report should describe discovery targets, sources activated, skills extracted and normalized, analyses completed, relations built, packs synthesized, evaluation results, and next-run priorities.

### Total Run Artifacts

- Total run report: `reports/nightly-catalog-ops/<YYYY-MM-DD>-run.md`

A total run report should summarize maintenance preflight, growth run, final validation/publishing checks, commit/push status, and any policy blockers.
