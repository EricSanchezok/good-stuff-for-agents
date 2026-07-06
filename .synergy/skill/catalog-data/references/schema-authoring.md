# Schema Authoring

Schemas under `references/schemas/` define the canonical field contract. Runtime validation is implemented in `scripts/lib/catalog-lib.mjs` and must stay aligned with these schemas.

Schema changes require:

1. Update schema files.
2. Update validation logic.
3. Add migration logic if existing records are affected.
4. Run strict validation and rendering checks.
5. Document the change in the relevant operational skill reference.
