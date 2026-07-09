# Discovery Channels

Use public, non-invasive discovery channels. Do not limit yourself to filename-based search or to any particular domain. The goal is breadth: skills can exist in ANY field where people use agents.

## Channel A: Awesome-list reverse-index

Treat any awesome-list source already in the catalog NOT as a source itself, but as a discovery index.

For each link in the awesome-list:

- Fetch the linked project's README, file tree, or repository metadata
- Check for ANY signal of agent-related content:
  - `SKILL.md` or `.claude/skills/` or `.synergy/skill/` directories
  - README sections describing agent usage, workflows, prompt templates, task instructions
  - Docs or guides showing "how to use this with [Claude Code / Codex / Cursor / any agent]"
  - Any structured instruction set that could be given to an agent to accomplish a task
- If ANY signal is found — create an independent source candidate for THAT specific project
- Skip links that point to another awesome-list (avoid infinite recursion)
- Do NOT skip a project just because it is in a non-engineering domain

Record: awesome-list source name, linked URL, signal found, and reason.

## Channel B: Domain-concept search

DO NOT search for `SKILL.md` as the primary strategy. DO NOT restrict searches to engineering domains.

Search strategy per round:

1. Determine the target domain(s) from the demand scan policy (which infers gaps from the catalog itself)
2. FOR EACH target domain, generate 3–5 search queries that combine the domain with agent/skill/workflow language:

   Pattern: `[domain concept]` + (`"agent"` OR `"workflow"` OR `"skill"` OR `"prompt"` OR `"instruction"` OR `"guide"` OR `"template"`)

   Examples of what this looks like for DIFFERENT domains (do not hardcode these — generate fresh each round):
   - If target is cooking: `"cooking" "agent" workflow`, `"recipe" "prompt template"`, `"meal planning" "skill"`
   - If target is photography: `"photo editing" "agent instruction"`, `"photography workflow" "Claude"`
   - If target is fitness: `"workout plan" "agent prompt"`, `"fitness coach" "skill template"`
   - If target is academic research: `"literature review" "agent workflow"`, `"paper analysis" "prompt"`

3. Search surfaces to rotate through:
   - GitHub (for repos containing agent instructions, not just SKILL.md)
   - Web search (technical blogs, forums, community discussions, guides)
   - Package registries for domain-specific tools with agent usage docs

The key: search queries are derived from the TARGET DOMAIN, not from engineering defaults. Every round should search against different domains so coverage expands broadly.

## What NOT to do

- Do not track any specific platform's changelog or official repos as a discovery signal — all sources are equal
- Do not hardcode engineering domain keywords
- Do not restrict searches to "agent skill" or "SKILL.md" only
- Do not assume a domain is "not relevant" just because it isn't about coding
