---
schema_version: 1
skill_id: skill_ghaida-intent-ghaida-intent-1de7fdd1-strategize
source_hash: sha256:866fb66582d4e681d57e50e05fe4ce243651b9354a877cede56a99695908aa40
analysis_version: 1
confidence: high
updated_at: "2026-07-09T18:30:00.000Z"
---

### 1. What does it actually do?

It frames product design problems before any sketches, flows, or specs exist. It synthesizes research, sizes opportunities, defines testable hypotheses, maps customer journeys, analyzes competitive landscapes, and structures the output into a design brief template. The core machinery is five foundational questions (problem validation, audience definition, solution fit, feature validation, competitive landscape) with explicit decision gates between them.

### 2. What makes it special — or not special?

The five-question framework itself is not novel — it's standard product discovery. What is distinctive is how well-integrated the skill is with a broader family of tools (blueprint, journey, specify, investigate, organize, articulate, evaluate, measure) and the explicit statement of what the skill does NOT do (primary research, UI flows, visual design, tactical decisions). The "situation → complication → resolution" storytelling pattern and the pathology of false orientation (manufactured complication) show real strategic depth from someone who has seen bad briefs. The anti-patterns section (building for the wrong audience, solving a non-problem, feature bloat, competitive blindness, premature commitment) is sharp and actionable. However, the skill is extremely verbose and many sections read like a product management textbook rather than an agent instruction manual — it tells the agent what strategy is rather than what to do next.

### 3. When it works, and when it will fail you

Best case: A product team brings a vague business ask to an agent. The agent runs through the five foundational questions, surfaces that the problem hasn't been validated with real users, flags the competitive blindness issue, and produces a structured design brief with explicit open questions. The team avoids building the wrong thing. Worst case: The user has no research data, no time for investigation, and wants the agent to be a solution designer, not a strategic facilitator. The skill demands evidence that doesn't exist and asks questions the user can't answer. The agent gets stuck in analysis paralysis, asking for data the user doesn't have, and produces nothing. The skill's ONLY output is a brief — no code, no designs, no specs.

### 4. What does it assume, and are those assumptions safe?

It assumes the user has or can get research evidence (user interviews, analytics, market data) to ground strategic decisions. In startup and enterprise contexts with dedicated product teams, this is a reasonable expectation maybe 40% of the time. In solo developer or early-stage contexts, the user likely has intuition at best and no systematic research. It assumes stakeholders are available for dialogue and iteration, which fails in async or ticket-driven workflows. It assumes the agent has deep product strategy knowledge (Kano analysis, behavioral clustering, competitive positioning maps) and can execute them through conversation alone. This is a lot to expect from a general-purpose coding agent.

### 5. Tools and permissions: what could go wrong?

The skill is entirely conversational and document-generation focused — it produces text briefs using the output template. No shell commands, no network access, no code execution. The risk is not tool-based but cognitive: an agent that thinks it's strategizing might produce a convincing-looking brief with confidently wrong assumptions, leading the team to commit resources based on fabricated "analysis." The section on research synthesis warns against speculation, but there's nothing forcing the agent to have actual data before claiming an insight.

### 6. Your bottom-line verdict

This is a well-structured, professionally written product strategy skill that would be valuable for a design-oriented agent working with product teams. However, it is verbose, assumes significant research infrastructure, and its output (a brief) is upstream of actual value (code, designs). In a 100-skill catalog, it earns a spot but as a specialist pick for product-strategy agents, not a generalist must-have. The biggest risk is producing convincing fiction. The biggest benefit is preventing premature commitment to wrong solutions.
