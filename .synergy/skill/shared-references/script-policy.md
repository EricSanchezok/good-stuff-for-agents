# Deterministic Helper Policy

Use this policy before you add, run, rename, or expose any helper.

## What Helpers May Do

A helper may:

- validate catalog records;
- format catalog records;
- migrate known schema shapes;
- compute hashes and indexes;
- detect mechanical impact from changed records;
- fetch approved source metadata and write snapshots;
- append or write records from complete agent-authored drafts;
- render public pages from eligible records;
- check drift and links;
- report deterministic status.

## What Helpers Must Not Do

A helper must not:

- discover sources by pretending a supplied list is a discovered result;
- infer semantic skill capabilities without an agent-authored draft;
- normalize identities by guessing from a filename alone;
- write deep analysis boilerplate as if evidence was inspected;
- decide semantic duplicates from shallow string or domain overlap alone;
- synthesize packs by selecting available skills mechanically;
- score publication readiness without agent-authored rubric evidence;
- perform curation decisions that belong to a human or explicit reviewer.

## Naming Rule

Name a helper after the deterministic action it actually performs. Prefer names such as `ingest-source-candidates.mjs`, `write-normalized-skills.mjs`, `write-analysis-drafts.mjs`, `append-relation-drafts.mjs`, `write-pack-candidate.mjs`, `write-evaluation-draft.mjs`, and `maintenance-check.mjs`.

Do not keep a legacy name that implies autonomous judgment when the helper only ingests or writes supplied data.

## Input Rule

A helper that writes catalog data should accept either `--input <path>` or JSON on stdin. The input must already contain the semantic decisions. The helper can validate shape, call canonical catalog writers, and report changed paths.

## Output Rule

A helper should print JSON with enough detail for an agent to audit what happened: count, record IDs, written paths when available, warnings, and validation status.

## Failure Rule

A helper should fail loudly for malformed input, missing required IDs, unsupported source URLs, schema errors, and drift. It should not silently invent defaults that change meaning.
