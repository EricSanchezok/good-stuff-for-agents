# Publishing Quality Gate

Publishing is successful only if:

- `catalog-data validate --strict` passes before rendering;
- indexes are current;
- README and docs render idempotently;
- all generated pages include banner and frontmatter;
- no candidate pack appears in docs;
- drift check passes after rendering;
- link check passes;
- empty catalog renders without fake packs.

If render succeeds but drift remains, treat it as fatal exit code 2 in nightly automation.
