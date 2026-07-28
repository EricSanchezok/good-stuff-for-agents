---
description: "Run the single-path Nightly Catalog v3 operation"
agent: "synergy"
---

Load the `nightly-catalog-ops` project skill and execute its v3 controller SOP from start to finish.

The only valid route is:

```text
health + approved-source sync
  → prepare-run
  → fixed Issue stage and at most two bounded target stages
  → one final gate
  → seal-run
  → read-only Git audit
```

Definition of done:

- exactly one immutable run context was prepared and its digest remained an independent seal anchor;
- Issue scan ran regardless of Pack target selection and every changed or unassessed open Issue reached a persisted safe terminal;
- at most two immutable intents were attempted;
- Pack synthesis and evaluation used different sessions;
- every candidate was bound to a current candidate-time `preflight-proof.json`;
- Evaluation v2 applied blocker-first MIN-gate semantics, and only `passed` candidates promoted;
- zero eligible Pack ended as `no_pack_clean`, without filler;
- strict validation, indexes, public render, drift, links, boundary, and focused tests ran in one final gate sequence;
- `seal-run` generated the terminal ledger, Markdown report, v3 summary, and exact touched-path manifest from one state source;
- `nightly:git:audit` performed read-only consistency review only;
- blockers, outcome paths, and verification evidence are explicit.

Do not call removed report writers, terminal-state checkers, migrations, Pack/Evaluation wrapper scripts, or any legacy summary path. Do not stage, commit, or push from the Nightly skill. A separately authorized trusted controller owns any final Git mutation.

Additional user instructions for this invocation:

$ARGUMENTS

Treat them as scope refinements only. They do not override owner boundaries, fixed-repository Issue policy, session isolation, bounded repair limits, MIN-gate rules, or Git safety.