# Coverage State Format

## File location

`catalog/coverage.json`

## Purpose

This file tracks per-domain search history across all growth rounds. It is the
state backing the diversity constraint in `demand-scan-policy.md` Step 6.

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

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | integer | Schema version. Currently `1`. |
| `updated_at` | ISO 8601 UTC | Timestamp of last write. |
| `domains` | object | Map of `domain_id` → domain stats. |
| `domains.<id>.visits` | integer | Total number of rounds that selected this domain. |
| `domains.<id>.last_used` | ISO 8601 UTC | Timestamp of most recent selection. |
| `domains.<id>.first_used` | ISO 8601 UTC | Timestamp of first selection. |
| `domains.<id>.sources_discovered` | integer | Total sources activated whose primary domain is this. |
| `domains.<id>.skills_discovered` | integer | Total skills cataloged whose primary domain is this. |

`sources_discovered` and `skills_discovered` are best-effort counters. Update them
at the end of each growth run based on what was newly added.

### Empty state

When no coverage data exists (first run, or file missing), all domains are treated
as having 0 visits. The file is created after the first theme selection.

## Domain taxonomy

The taxonomy is intentionally coarse (8 categories) to keep coverage signals
meaningful. More fine-grained classification belongs in skill-level analysis,
not in discovery routing.

| domain_id | Label | Description |
|-----------|-------|-------------|
| `dev` | Development & Engineering | Programming languages, frameworks, DevOps, cloud infrastructure, code tooling |
| `design` | Design & UI/UX | Figma, design systems, prototyping, visual design, accessibility |
| `pm` | Product Management | PRDs, roadmaps, stakeholder management, strategy, prioritization |
| `marketing` | Marketing & Growth | SEO, content, ads, analytics, brand, AB testing |
| `science` | Scientific & Data | Bioinformatics, cheminformatics, data science, visualization, research tooling |
| `writing` | Writing & Content | Copywriting, documentation, content strategy, technical writing |
| `enterprise` | Enterprise & Business | Compliance, legal, finance, HR, operations, procurement |
| `meta` | Meta & Agent Tooling | Skill creation, MCP servers, agent frameworks, prompt engineering |

## ID assignment rules

When selecting themes, map your chosen discovery direction to one or more
domain_ids. A single round may touch up to 2 domains. If a round bridges
multiple categories, pick the primary one. Be consistent across rounds.

Examples:
- "Figma design systems" → `design`
- "Azure cloud infrastructure agent skills" → `dev`
- "Marketing SEO content tools" → `marketing`
- "Bioinformatics and cheminformatics libraries" → `science`
- "Agent skill creation frameworks" → `meta`
- "Legal compliance document review" → `enterprise`

Existing catalog sources and their primary domains (for backfill reference):

| Source | Primary domain |
|--------|---------------|
| Anthropic Agent Skills | `meta` / `design` |
| CodeRabbit Skills | `dev` |
| Marketing Skills (Corey Haines) | `marketing` |
| Figma MCP Skills | `design` |
| K-Dense Scientific Agent Skills | `science` |
| Frontend Designer Skill | `design` |
| Matteo Collina's Skills | `dev` |
| Microsoft Agent Skills | `dev` |
| PM Skills Marketplace (phuryn) | `pm` |
| PM Skills (Product on Purpose) | `pm` |
| Skills for Figma (Southleft) | `design` |
| Claude Marketing (Rebecca Rae Barton) | `marketing` |

This mapping is advisory. Discovery rounds may select any domain regardless of
existing source coverage.

## Maintenance

The coverage file is read on every growth run and updated after theme selection
and at the end of the run. Do not hand-edit it. If the taxonomy needs expansion,
propose the change in the growth report for the next curator to review.
