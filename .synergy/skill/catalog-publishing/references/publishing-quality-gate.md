# Publishing Quality Gate

Publishing is successful only if:

- strict catalog validation passes before rendering;
- indexes are current;
- README and docs render idempotently;
- public pages contain only visitor-facing catalog content;
- no candidate-only or failed pack appears in public pages;
- drift check passes after rendering;
- link check passes;
- public-boundary scan returns no matches;
- empty catalog renders without fake entries.

If render succeeds but drift, links, or boundary scan fail, treat the run as blocked. Fix the renderer or upstream records and rerun the publishing checks.
