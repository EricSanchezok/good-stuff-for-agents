# Demand Scan Policy

Use this policy to choose what to search for each round. Do not ask the user. Do not hardcode domain lists. Infer everything from the catalog itself.

## Step 1: Understand current catalog coverage

Inspect the catalog to understand what is already covered:

- Read `catalog/sources/registry.yaml` to see what sources are active
- Read `catalog/skills/records/` to see what skills are cataloged
- Read the latest growth report if available
- Build a mental picture: what domains appear? what topics are absent?

Important: do NOT filter by "engineering vs non-engineering". The catalog might currently contain only engineering skills because that's what was discovered — that does not mean engineering is the only valid domain. It means other domains are gap territory to explore.

## Step 2: Identify gaps

From the catalog picture, identify what's missing or sparse. Think broadly:

- What general areas of human activity have ZERO presence?
- What areas have only 1–2 sources with few skills?
- What areas are dominated by a single source (no cross-source diversity)?

Do NOT limit yourself to categories you've seen before. If the catalog has NO skills about a recognizable human activity domain, that is a gap.

## Step 3: Pick this round's theme

Priority:

1. Areas with ZERO catalog coverage — highest priority
2. Areas with only 1–2 sources — high priority
3. Areas with multiple sources but no diversity — medium priority
4. Areas already richly covered — skip

Rotate themes across rounds. Do not pick the same area two rounds in a row. Over multiple rounds, cover increasingly broader territory.

## Step 4: Select discovery channel

- If awesome-list sources have many unchecked links — use Channel A (reverse-index)
- Otherwise — use Channel B (domain-concept search for the chosen area)

## Step 5: Generate search queries

For the chosen area, generate search queries that combine the area's concepts with agent/skill language. Do not hardcode query templates — generate them fresh from the area you chose.

The universal query pattern is: `[concepts from the target area]` + `[agent/skill/workflow/prompt/instruction/guide/template]`.

Do NOT default to engineering concepts.
