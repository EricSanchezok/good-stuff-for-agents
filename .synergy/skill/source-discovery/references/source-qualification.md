# Source Qualification

A source candidate is worth recording when it has reusable agent-skill or workflow content and enough provenance to revisit later.

## Required evidence

- URL or local source identifier.
- Source type: GitHub repo, docs site, marketplace, MCP collection, prompt/workflow library, or local source.
- Skill-like content evidence: `SKILL.md`, reusable workflow, agent instruction, MCP/agent operation guide, or prompt with trigger/procedure/input-output semantics.
- License signal: SPDX, LICENSE file, package metadata, or unknown.
- Activity signal when available: recent commit, release, update date, or maintainer activity.
- Parseability: known format, likely format, or unsupported.

## Candidate outcomes

- `candidate`: worth tracking but not approved.
- `rejected`: not skill-like, inaccessible, duplicate source, unsafe, or license prohibits metadata use.
- `needs-review`: promising but license, access, or parseability is unclear.

Do not approve sources directly from discovery unless an explicit curation policy says so.
