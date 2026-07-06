# Catalog Data Write Contracts

All canonical writes must flow through `scripts/`.

## Draft-to-write flow

```txt
agent/subagent analysis
  → draft JSON in catalog/runs/<run-id>/drafts/ or stdin
  → write/append script
  → normalization and defaults
  → atomic write
  → strict validation
```

## Ownership

- `catalog-data` owns canonical writes, validation, formatting, migrations, catalog hashes, indexes, and impact detection.
- `catalog-publishing` owns rendering README/docs only.
- Operational skills must not directly write YAML/JSONL.

## Atomicity

Writer scripts must write temp files and rename after successful serialization. JSONL appenders must re-write complete files atomically when practical.

## Formatting

- YAML keys are stable-sorted.
- JSONL records are one object per line.
- Empty JSONL files are valid.
- Timestamps use ISO 8601.
