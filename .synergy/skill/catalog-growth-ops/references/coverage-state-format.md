# Coverage State Format

## Purpose

`catalog/coverage.json` is historical discovery telemetry. It records domains touched by actual bounded source discovery; it does not select Nightly targets, require a discovery round, or authorize broad growth.

Nightly Catalog v3 gets zero to two immutable intents from the prepared context. Consult coverage only after a current intent identifies a concrete source-evidence gap and target-gap discovery is otherwise permitted. Coverage may break ties between equally direct leads, but it cannot broaden or replace the intent.

## File Location

```txt
catalog/coverage.json
```

## Schema

```json
{
  "version": 1,
  "updated_at": "2026-07-10T12:00:00Z",
  "domains": {
    "<domain_id>": {
      "visits": 3,
      "last_used": "2026-07-10T12:00:00Z",
      "first_used": "2026-07-09T12:00:00Z",
      "sources_discovered": 5,
      "skills_discovered": 42
    }
  }
}
```

| Field | Type | Meaning |
|---|---|---|
| `version` | integer | Schema version; currently `1`. |
| `updated_at` | ISO 8601 UTC | Time of the latest canonical update. |
| `domains` | object | Map of `domain_id` to historical discovery statistics. |
| `domains.<id>.visits` | integer | Number of bounded discovery executions that actually inspected the domain. |
| `domains.<id>.last_used` | ISO 8601 UTC | Most recent bounded discovery execution in the domain. |
| `domains.<id>.first_used` | ISO 8601 UTC | First bounded discovery execution in the domain. |
| `domains.<id>.sources_discovered` | integer | Best-effort count of activated sources attributed to the domain. |
| `domains.<id>.skills_discovered` | integer | Best-effort count of canonical skills attributed to the domain. |

A Pack intent that is decided entirely from current canonical evidence does not increment visits. An Issue classification does not increment visits. Reading a source without an authorized target-gap search does not create coverage state.

## Empty State

If the file is absent, treat historical visits as unknown or zero for tie-breaking only. Do not create discovery work merely to populate the file. The absence of coverage telemetry does not block Issue handling, target evidence assembly, `no_pack_clean`, or a successful zero-Pack run.

## Domain Taxonomy

The taxonomy stays coarse because it is routing telemetry, not a semantic classification system.

| `domain_id` | Label | Scope |
|---|---|---|
| `dev` | Development & Engineering | Programming, frameworks, DevOps, cloud, infrastructure, and code tooling |
| `design` | Design & UI/UX | Product design, design systems, prototyping, visual design, and accessibility |
| `pm` | Product Management | Product strategy, discovery, roadmaps, prioritization, and stakeholder work |
| `marketing` | Marketing & Growth | SEO, content, advertising, analytics, experimentation, and brand |
| `science` | Scientific & Data | Research tooling, data science, visualization, and computational science |
| `writing` | Writing & Content | Copywriting, documentation, editorial workflows, and technical writing |
| `enterprise` | Enterprise & Business | Compliance, legal, finance, HR, operations, and procurement |
| `meta` | Meta & Agent Tooling | Skill creation, agent frameworks, MCP, prompting, and orchestration |

Map an executed target-gap search to no more than two domains. When a search crosses categories, choose the primary domain needed by the immutable intent. Domain assignment must not alter the intent, candidate membership, or evidence claims.

Examples:

- Figma design-system evidence → `design`
- Azure infrastructure evidence → `dev`
- SEO workflow evidence → `marketing`
- Bioinformatics workflow evidence → `science`
- Skill-authoring framework evidence → `meta`
- Legal document-review evidence → `enterprise`

## Update Boundary

Update coverage only after bounded discovery actually ran and only through an available canonical `catalog-data` write path. If no canonical writer supports the update, return the reviewed delta to `catalog-data`; do not hand-edit the file or invent a local compatibility writer.

An update records only what happened:

- increment visits for domains actually inspected;
- set `first_used` and `last_used` from the current run;
- update best-effort source and skill counts from canonical outputs;
- leave untouched domains unchanged.

Taxonomy changes are curation decisions. Record the proposed change and route it to the owning policy rather than changing IDs during target execution.
