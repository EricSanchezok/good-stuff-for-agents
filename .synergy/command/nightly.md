---
description: "Run the single-path Nightly Catalog v3 controller"
agent: "synergy"
---

Load the `nightly-catalog-ops` project skill and execute its production controller exactly once:

```bash
npm --prefix .synergy run nightly
```

The controller owns the complete fixed lifecycle:

```text
init → maintenance → issues → context → targets → gate → seal → audit → terminal
```

Do not invoke phases independently, supply a run ID, reuse prior evidence, or continue a terminal run. Treat the JSON result and its hash-linked artifacts as evidence; verify the event chain, context, gate, seal, audit receipt, and terminal together before reporting the outcome.

Nightly never stages, commits, or pushes. A separately authorized trusted controller owns any later Git mutation.

Additional user instructions for this invocation:

$ARGUMENTS

Treat them as scope refinements only. They do not override owner boundaries, fixed-repository Issue policy, session isolation, bounded repair limits, MIN-gate rules, evidence integrity, or Git safety.