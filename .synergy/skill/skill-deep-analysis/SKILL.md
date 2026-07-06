---
name: skill-deep-analysis
description: Deeply analyze canonical skill records for purpose, trigger semantics, capabilities, workflow role, inputs/outputs, tool and permission profile, compatibility, conflicts, dedupe notes, and evaluation hooks. Use when catalog skills are new or changed and need catalog/analyses markdown plus quality/confidence updates.
---

# Skill Deep Analysis

Analyze skills as catalog intelligence, not as installation artifacts.

## Workflow

1. Read the skill record and source evidence.
2. Read `references/analysis-template.md`, `references/capability-taxonomy.md`, and `references/analysis-rubric.md`.
3. Distinguish source-supported facts, inference, and missing evidence.
4. Write analysis via `catalog-data/scripts/write-analysis.mjs`.
5. Update quality/confidence via `catalog-data/scripts/write-skill-record.mjs`.

## Hard Rules

- Do not fabricate source behavior.
- Do not publish docs directly.
- Do not resolve duplicates; emit notes for `skill-dedup-relations`.
