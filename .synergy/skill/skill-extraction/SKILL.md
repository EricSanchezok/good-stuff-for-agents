---
name: skill-extraction
description: Extract skill-like artifacts from synced source content for the Skill Intelligence Catalog. Use when processing changed sources, finding SKILL.md files, parsing Claude/Codex/Synergy skill formats, identifying reusable prompt/workflow artifacts, or writing catalog/skills/candidates/<run-id>.jsonl through catalog-data.
---

# Skill Extraction

Extraction creates candidates, not canonical skill records.

## Workflow

1. Read `references/supported-formats.md` and `references/extraction-rules.md`.
2. Inspect changed source snapshots or fetched content.
3. Identify skill-like artifacts with trigger/procedure/input-output semantics.
4. Create draft JSON records.
5. Write candidates with `catalog-data/scripts/append-skill-candidate.mjs`.

## Hard Rules

- Do not normalize, dedupe, or publish extracted candidates in this skill.
- Do not invent missing source evidence.
- Preserve raw metadata and parse confidence.
