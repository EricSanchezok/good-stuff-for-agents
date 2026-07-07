# Demand Scan Policy

Use this policy when you choose growth targets without user input.

## Signals To Inspect

You should consider:

- current catalog gaps: no sources, missing domains, stale source state, missing analyses, missing packs;
- public agent ecosystem demand: coding assistants, research agents, documentation agents, testing/review agents, security agents, design/product agents, MCP/tool-use workflows, browser/file/tool orchestration;
- popular public repositories and docs with maintained activity;
- recurring agent tasks that benefit from reusable SOPs;
- previous growth/nightly reports and skipped blockers.

## Selection Rule

Choose a bounded daily set of themes from the highest overlap between catalog gaps and public demand. Empty catalog always prioritizes broad high-signal bootstrap sources before niche domains.

## Default Bootstrap Themes

For an empty catalog, start with:

1. coding agent skills and workflow repos;
2. research/documentation agent workflows;
3. testing/review/security agent workflows;
4. MCP/tool-use skill collections;
5. design/product agent workflows.

You do not ask the user which theme to choose during a normal autonomous run. If evidence is weak, choose fewer high-quality sources and explain the constraint.
