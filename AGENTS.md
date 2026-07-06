# AGENTS.md

## Project Purpose

This repository is a Skill Intelligence Catalog: a GitHub-facing catalog of researched agent skills, skill packs, sources, domains, and reports. It is operated by Synergy project skills under `.synergy/skill/`.

This repository is **not** a generic skill aggregation repo and is **not** a direct-install marketplace. Skill packs are generated from catalog evidence and evaluation, not manually pre-seeded.

## Directory Contract

- `.synergy/skill/<name>/` — operational workflows, rubrics, quality gates, schemas, references, and deterministic scripts.
- `.synergy/command/` — thin command entry points that delegate to project skills.
- `.synergy/synergy.d/` — project Synergy configuration.
- `catalog/` — canonical machine-readable source of truth for sources, skills, analyses, relations, packs, indexes, and runs.
- `docs/` — generated public catalog pages. Do not hand-edit generated pages.
- `README.md` — generated public entry point. Do not hand-edit catalog sections.
- `reports/` — internal automation reports. Public summaries are generated into `docs/reports/`.

Do not create a root-level `workflows/` directory. Workflows belong in `.synergy/skill/<name>/SKILL.md` and references.

## Data Rules

- Do not hand-edit canonical `catalog/**/*.yaml` or JSONL records.
- Use `.synergy/skill/catalog-data/scripts/` for structured writes, formatting, validation, migrations, indexes, hashes, and impact detection.
- Use `.synergy/skill/catalog-publishing/scripts/` for README/docs rendering, drift checks, and link checks.
- `catalog/` is the source of truth. `docs/` and `README.md` are generated publication surfaces.
- Generated docs must include a generated banner and machine-readable frontmatter.
- Candidate packs must not be published unless `catalog-evaluation` passes the publication threshold.
- Never create fake demonstration packs to make the catalog look populated.

## Skill Design Rules

Every project skill must follow this shape:

```txt
.synergy/skill/<skill-name>/
├── SKILL.md
├── references/
├── scripts/
└── assets/
```

`SKILL.md` frontmatter must contain only `name` and `description`. Put detailed workflows, rubrics, schemas, templates, and quality gates in `references/`. Put deterministic code in `scripts/`. Do not add README, INSTALL, or CHANGELOG files inside skill folders.

## Automation Safety

Nightly automation may read/write repository files, fetch public sources, run deterministic project scripts, and commit/push ordinary updates. It must not:

- use destructive git operations;
- force push;
- write secrets;
- modify global Synergy or system configuration;
- send emails/messages/posts;
- perform external identity actions;
- install global packages.

## Commit Rule

Every commit message must include this footer:

```txt
Co-authored-by: synergy-agent <299070056+synergy-agent@users.noreply.github.com>
```

Do not create git commits unless explicitly requested by the user or an automation workflow requires it.
