# Capability Taxonomy

Use this taxonomy to keep skill records and analyses comparable.

## Domains

Domain labels should describe the problem space, not the implementation tool. Examples: `frontend-design`, `code-review`, `data-engineering`, `research`, `security`, `documentation`, `workflow-automation`.

Rules:

- Prefer stable, lowercase kebab-case labels.
- Add new domains only when existing labels do not fit.
- A domain must be meaningful for browsing and pack synthesis.

## Task Types

Task types describe the job the skill can perform: `audit`, `generate`, `refactor`, `extract`, `normalize`, `evaluate`, `publish`, `summarize`, `debug`, `research`, `design`, `test`.

## Workflow Stages

Workflow stages describe when to invoke the skill inside a larger workflow: `discovery`, `ingestion`, `normalization`, `analysis`, `dedupe`, `synthesis`, `evaluation`, `publication`, `curation`, `verification`.

## Atomic Capabilities

Atomic capabilities are concrete abilities that can be combined in packs, such as:

- `read-source-metadata`;
- `extract-trigger-semantics`;
- `score-non-redundancy`;
- `render-generated-docs`;
- `detect-stale-pack-members`.

Keep atomic capabilities small enough that overlap and complementarity can be reasoned about.
