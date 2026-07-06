# Conflict Detection

Detect conflicts that affect pack compatibility.

Conflict examples:

- one skill instructs broad autonomous writes while another requires review gates;
- incompatible tool assumptions or mutually exclusive file ownership;
- contradictory output formats for the same handoff;
- license or permission mismatch;
- a skill relies on external writes when the pack is intended to be read-only;
- duplicate responsibilities that increase cognitive load.

For each conflict, capture:

1. participating skill IDs;
2. conflict type;
3. evidence from records or analyses;
4. severity (`low`, `medium`, `high`);
5. recommended resolution or exclusion.

High-severity unresolved conflicts should block candidate pack publication.
