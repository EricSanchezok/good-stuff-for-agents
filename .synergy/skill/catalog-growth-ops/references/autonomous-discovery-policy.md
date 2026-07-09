# Autonomous Discovery Policy

Use this policy when running discovery within a growth run. Do not ask the user for targets, counts, themes, or domains. Do not assume any particular domain is more important than others.

## Discovery strategy: two channels in rotation

### Channel A: Awesome-list reverse-index

- Take awesome-list sources from the catalog
- Crawl linked projects (30–50 per round)
- A linked project is a source candidate if it has ANY skill signal
- Target: 3–8 new independent source candidates per round
- Do NOT skip projects in non-engineering domains

### Channel B: Domain-concept search

- Use demand scan policy to pick 1–2 under-covered areas
- Generate search queries for those areas using domain concepts + agent/skill language
- Inspect 10–20 results per area
- Target: 2–5 new source candidates per area

### Rotation

Alternate between channels across rounds so you don't repeatedly search the same surface. For example: A, B, B, A, B, B, A...

## Source quality

PREFER:

- Public GitHub URL or accessible docs site
- Any form of skill-like content (structured or semi-structured)
- Any license signal (record it; don't block on it at discovery time)
- Maintained activity (updated in the last 12 months)
- Sources in areas with low catalog coverage

AVOID:

- Pure awesome-lists or link directories (these are Channel A fuel, not sources)
- Sources where ALL skills are duplicates per pre-ingestion dedup
- Sources with private access or credential requirements
- Sources with explicitly forbidden redistribution

Do NOT avoid a source just because its domain is unfamiliar or non-technical.

## Batch limits

Per round:

- Maximum 3–5 newly activated sources
- No source that would produce > 50 raw candidates in one round (split into batches)
- Agent chooses the exact count from evidence quality; do not ask the user

## Evidence to record

For each accepted source: channel used, search query, URL, license signal, parseability level, dedup result summary, activity signal, and activation rationale.

For each rejected source: URL, rejection reason, and evidence checked.
