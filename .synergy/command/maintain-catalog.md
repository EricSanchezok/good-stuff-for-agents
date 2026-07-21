---
description: "Run Skill Intelligence Catalog maintenance-only health checks and upkeep"
agent: "synergy"
---

Load the `catalog-maintenance` project skill and follow its SOP. Run deterministic maintenance only: validate, sync approved active/preview sources, build indexes, render public pages, check drift/links/public-boundary, and report health. Do not discover, analyze, synthesize, or evaluate semantic content.

Additional user instructions for this invocation:

$ARGUMENTS

Treat these as scope refinements only. They do not override safety boundaries, owner-skill contracts, or quality gates. If empty, follow the command as written.
