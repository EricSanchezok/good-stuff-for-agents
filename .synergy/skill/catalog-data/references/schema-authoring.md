# Schema Authoring

Schemas under `references/schemas/` define the canonical field contract. The directory generation label does not imply that every enclosed record has the same `schema_version`; each schema's `properties.schema_version.const` is authoritative. Runtime validation is implemented in `scripts/lib/catalog-lib.mjs` and must stay aligned with these schemas.

Schema changes require:

1. Update the canonical schema files.
2. Update deterministic validation and writer logic.
3. Update focused fixtures and contract tests.
4. Remove superseded production schemas, parsers, and writers rather than keeping a compatibility path.
5. Regenerate affected records through their owner workflow.
6. Run strict validation and rendering checks.
7. Document the current contract in the relevant operational skill reference.
