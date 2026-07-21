---
description: "Extract, normalize, and analyze changed skill artifacts"
agent: "synergy"
---

Follow the project skill chain, not a script pipeline: load `skill-extraction`, then `skill-normalization`, then `skill-deep-analysis`. Each phase must follow its SOP, write only reviewed artifacts, run validation, and hand off the exact run ID, skill IDs, analysis paths, and unresolved blockers.

Additional user instructions for this invocation:

$ARGUMENTS

Treat these as scope refinements only. They do not override safety boundaries, owner-skill contracts, or quality gates. If empty, follow the command as written.
