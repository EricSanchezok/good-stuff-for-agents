# Validation Policy

`validate-catalog.mjs --strict` is the hard gate before publishing or committing automation output.

## Fatal errors

- Prohibited root `workflows/` directory exists.
- Custom `.synergy/agent` or `.synergy/agents` directory exists.
- Any canonical YAML/JSONL is malformed.
- Required fields are missing.
- Status or relation predicates are outside allowed enums.
- Pack members are missing pinned versions.

## Warnings

- Analysis markdown is missing recommended sections.
- Temporary files remain in catalog.

Warnings should be fixed, but fatal errors block publish and commit.
