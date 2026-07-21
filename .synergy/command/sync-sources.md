---
description: "Synchronize approved Skill Intelligence Catalog sources"
agent: "synergy"
---

Load the `source-sync` project skill and follow its SOP. Sync only approved active or preview sources, write snapshot/state artifacts through deterministic helpers, validate the catalog, and hand changed snapshots to `skill-extraction`.

Additional user instructions for this invocation:

$ARGUMENTS

Treat these as scope refinements only. They do not override safety boundaries, owner-skill contracts, or quality gates. If empty, follow the command as written.
