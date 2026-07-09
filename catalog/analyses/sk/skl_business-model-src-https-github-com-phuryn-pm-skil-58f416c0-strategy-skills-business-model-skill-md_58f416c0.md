---
schema_version: 1
skill_id: skl_business-model-src-https-github-com-phuryn-pm-skil-58f416c0-strategy-skills-business-model-skill-md_58f416c0
source_hash: sha256:237f1f290ee32464fb7c79bde4583fd9465738fa
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:08:00+08:00"
---

# business-model

A Business Model Canvas generator that walks through all 9 building blocks (Key Partners, Key Activities, Key Resources, Value Propositions, Customer Relationships, Channels, Customer Segments, Cost Structure, Revenue Streams) using the Strategyzer/Alexander Osterwalder framework, prompted through a "business model strategist" persona with $ARGUMENTS as the target.

## Why it matters

This skill has one genuinely valuable section and a lot of filler. The valuable section is the "Domain Context" block near the bottom, which honestly critiques the Business Model Canvas framework and compares it against Lean Canvas and Startup Canvas alternatives. It lists specific BMC weaknesses—no vision, no defensibility test, no trade-offs, no metrics, low-value sections for startups—and gives concrete guidance on when to use each alternative. This is the kind of honest framework assessment that most skills don't provide.

The rest of the skill is a standard BMC walkthrough. The 9 building blocks are described with the same probing questions you'd find in any BMC template: "Who are the key strategic partners and suppliers?", "What value do we deliver to customers?", "How does the business make money?" Each block has 3-5 sub-questions and a brief description. The output process is a 10-step numbered list. There's a note about LTV > 3x CAC as an economic viability test. None of this is wrong—it's standard BMC instruction—but none of it distinguishes this skill from any other BMC template.

The persona framing ("You are a business model strategist designing a Business Model Canvas") and the output structure are the skill's weakest elements—they provide scaffolding but no analytical rigor.

## Where it helps, where it hurts

**Best-case scenario:** You're an established business documenting an existing business model for an investor deck or internal alignment exercise. You already know your customer segments, revenue model, and key partners. You load this skill to ensure you cover all 9 blocks systematically. The agent fills each block from your inputs, producing a structured canvas. The Domain Context section reminds you that BMC is appropriate for your use case (established business, not a startup hypothesis). The output is a clean, defensible, standard-format artifact.

**Best-case scenario 2:** You're new to business model thinking and need onboarding. The 9-block structure with probing questions serves as a learning scaffold. The Framework comparison section teaches you that alternatives exist and when to use them. You come out understanding BMC's strengths and weaknesses, not just its structure.

**Worst-case scenario:** You're an early-stage startup founder with $ARGUMENTS set to your startup idea, and you load this skill expecting it to produce a useful business model. The skill will produce a filled canvas—but the Domain Context section itself warns that BMC is not ideal for this use case ("Key Partnerships and Key Resources are rarely useful for early-stage products"). The skill doesn't refuse to run, doesn't route you to Lean Canvas or Startup Canvas, and doesn't flag the mismatch. It just produces the same 9-block output that the Domain Context section tells you is inappropriate for your situation. The skill has the knowledge to know it's the wrong tool but not the refusal protocols to say so.

A second failure mode: $ARGUMENTS is a business name without enough context for the agent to fill 9 blocks. The agent will fabricate plausible-sounding content for each section—"Key Partners: cloud infrastructure providers, payment processors, logistics partners"—producing a canvas that looks complete but is pure guesswork. The skill provides no confidence notation, no source documentation requirements, and no way to distinguish research from fabrication.

## What it quietly assumes

1. **The user provides enough context to fill 9 blocks meaningfully.** The "Input Requirements" list says "Product or service description, Target customer(s) and market, Current business operations or assumptions, Competitive context or industry dynamics." If these are thin, the agent fills gaps with generic content. The skill has no refusal protocol for insufficient input—unlike `define-prioritization-framework`, which has six.

2. **BMC is the right tool, or the user knows it isn't.** The Domain Context section provides an honest critique, but it's positioned as informational, not as a routing gate. The skill never asks "is this an established business or a startup?" before proceeding. The user must notice the warning themselves and switch skills voluntarily.

3. **Filling all 9 blocks produces insight.** The 10-step output process ends with "Ensure all 9 blocks align and support each other" and "Test economic viability (LTV > 3x CAC)." But alignment checking is mechanical—it doesn't guarantee strategic coherence. You can fill all 9 blocks consistently and still have a non-viable business model. The skill doesn't push the agent to find internal contradictions.

4. **The "business model strategist" persona improves output.** Like the `competitor-analysis` skill, this one opens with a persona prompt that adds flavor but no constraint. It doesn't change what the agent does; it changes the tone of what the agent writes.

## What could go wrong

Tool risks are low. This is a generation task—the agent writes a markdown document. No destructive operations, no external writes, no user presence required.

The risk is purely in the output quality. A Business Model Canvas that looks complete and well-structured is psychologically convincing—the 9-block format is widely recognized as authoritative. An executive or investor seeing a filled BMC may not scrutinize whether Key Partners or Revenue Streams are based on research or fabrication. The skill provides no built-in skepticism mechanism. Unlike the competitive analysis skills, there's no "mark confidence levels" instruction. Unlike the prioritization skill, there's no refusal protocol.

A secondary risk: the skill's Domain Context comparison table might train agents to acknowledge BMC's limitations in the output text while still producing a bad BMC. "Here's your Business Model Canvas. Note that BMC lacks a vision section and defensibility analysis." The disclaimer is present but the damage is already done—the artifact still looks like a complete analysis.

## Bottom line

A standard Business Model Canvas template with one excellent section—the honest framework comparison against Lean Canvas and Startup Canvas. That section shows real product strategy knowledge and should probably be extracted into a standalone "which canvas to use" decision guide. The rest of the skill is competent but interchangeable with any other BMC template. Pick this over a generic BMC skill if you value the framework critique; skip it for early-stage startups despite the Domain Context warning, because the skill won't stop you from using the wrong tool. It earns a marginal spot in a tight catalog for the framework comparison alone, but only if no other skill covers BMC with the same level of self-awareness.

## Confidence: high

The source is complete and short. Every section is clear. The framework comparison is the only non-obvious element, and I understand both what it says and why it can't prevent misuse.
