# Demand Scan Policy

Use this policy to choose what to search for each round. Do not ask the user. Do not hardcode domain lists. Do not predefine search queries — every round generates fresh queries based on the signals collected.

Three signal categories feed the theme selection. Gather all three before ranking. No single category dominates.

## Step 1: Gather external signals — what the world is talking about

Go online and sense demand from the broader internet. Do not search specifically for "agent" or "skill" — search broadly for trends, then extract any domain signal from what you find.

### Layer 1 — News and trending events

Check general and tech news from the last few days. What topics, domains, or activities are getting attention? Any major event, cultural shift, or new tool release creates demand in that area.

### Layer 2 — GitHub trending

Check GitHub trending repositories. What projects are gaining stars? What domains do they belong to? A trending repo in any field is a demand signal for that field.

### Layer 3 — Community and forum trending

Check major community surfaces for what people are actively discussing, asking for, or struggling with. Look for recurring requests, pain points, unanswered questions, and domain-specific patterns.

### Layer 4 — Repo's own GitHub Issues

Check open issues on the repo itself. An issue asking for a skill or pack in a specific domain is a direct demand signal.

Record each signal with its domain and source.

## Step 2: Gather internal signals — catalog state

Read the catalog to understand current coverage:

- `catalog/sources/registry.yaml` — active sources and their domains
- `catalog/skills/records/` — cataloged skills and their coverage areas
- Map what domains are covered and what is completely absent

Do not filter by engineering vs non-engineering. The catalog might be engineering-heavy because that is what was discovered, not because other domains are irrelevant.

## Step 3: Gather historical signals — prior run state

Read the latest growth report. Extract:

- Deferred analysis backlog — skills normalized but not yet analyzed
- Explicit next-run priorities the previous run left behind
- Blocked or skipped domains from prior rounds
- Previous demand scan outputs — do not repeat the same theme two rounds in a row

## Step 4: Rank and pick this round's theme

Merge all three signal categories. Rank by:

1. External demand signal with zero catalog coverage
2. External demand signal with sparse catalog coverage
3. Zero catalog coverage without external signal
4. Trending domain with zero catalog coverage
5. Deferred analysis backlog from prior runs
6. Domains already richly covered — skip

Rotate themes across rounds. Do not pick the same area two rounds in a row.

## Step 5: Select discovery channel and generate queries

Choose a discovery channel based on the theme:

- If awesome-list sources have unchecked links covering this domain → Channel A (reverse-index)
- Otherwise → Channel B (domain-concept search)

Generate search queries in the language of the target domain. Do not force every domain into "agent workflow" or "skill template" terminology. Use the concepts and vocabulary that people in that domain actually use.

Do not default to engineering concepts. Do not default to GitHub-only search. Do not only search for "SKILL.md".
