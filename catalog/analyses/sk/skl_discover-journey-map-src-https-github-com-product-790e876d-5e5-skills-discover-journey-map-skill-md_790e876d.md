---
schema_version: 1
skill_id: skl_discover-journey-map-src-https-github-com-product-790e876d-5e5-skills-discover-journey-map-skill-md_790e876d
source_hash: sha256:071b6f4c46d18ef1b640dbabb49996cdb9e24b00
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:10:00+08:00"
---

# Customer Journey Map

This skill produces a structured customer journey map artifact: stages with goals and triggers, touchpoints, an emotional curve, pain points, moments of truth, opportunities, Mermaid diagrams, and explicit research gaps. Its defining commitment — and the thing that separates it from every "draw a journey map" prompt — is the refusal to fabricate. The skill will not guess emotions, invent pain points, or produce a map that looks evidence-backed when it's not. Every emotional-curve entry carries a confidence label and a source, or it is marked Hypothesis (Confidence: Low) with a recommendation for validation research.

## Why it matters

Journey mapping skills are common. Journey mapping skills that refuse to lie are not. Most journey mapping tools treat the map as a brainstorming canvas — "imagine what the user feels at each stage" — and produce artifacts that feel insightful but have no research grounding. This skill inverts that: it treats the map as a **synthesis artifact**, not a brainstorm, and it demands that every stage, touchpoint, emotion, and pain point trace to research input. If the user has no research signal, the skill offers to proceed in hypothesis mode with everything labeled as unvalidated, which is honest but also a warning: a hypothesis-mode journey map is a research plan dressed as an artifact, not a decision-making tool.

The refusal protocols are the most valuable section. The skill will reject five specific inadequate inputs: no persona or scope, demand for fabricated emotional data without research, service-blueprint requests (out of scope), excessive scope (5-year B2B journeys produce useless maps), and single-touchpoint-as-journey requests. Each refusal includes a specific redirect — the skill tells the user what they actually need instead. This is rare and useful. Most skills just produce bad output when given bad inputs; this one diagnoses the input problem and offers alternatives.

The skill also handles three journey types (linear, cyclical, multi-actor) with explicit guidance on when each applies, and it integrates Mermaid diagram generation as a structured section rather than an afterthought — including practical advice to split large diagrams into sectional blocks to avoid rendering failures.

## Where it helps, where it hurts

**Best-case scenario**: You have a completed interview synthesis (`discover-interview-synthesis`) from 12 users, survey data from 200 respondents, and a defined persona. You want to map the end-to-end onboarding journey. You load this skill, feed it the research signal, specify the persona and scope. The output includes: 5 stages with clear triggers and exit criteria, a touchpoint table showing every interaction across channels, an emotional curve where every entry cites either interview quotes or survey percentages, 3 moments of truth identified with severity ratings, 7 opportunities mapped to specific pain points with rough effort estimates, and a Mermaid timeline that renders cleanly. The map can be handed directly to a design sprint — every claim has an evidence anchor.

**Worst-case scenario**: A stakeholder needs a journey map for a board presentation tomorrow and has no research. They provide a persona name and a goal, skip the research input, and accept the hypothesis-mode option. The output looks complete — 6 stages, touchpoints, an emotional curve, pain points, opportunities, a Mermaid diagram — but every entry says Hypothesis (Confidence: Low). The stakeholder removes the confidence column before the board presentation because "it looks messy." The board makes a funding decision based on a map whose only honest signal is that it's entirely unvalidated. The skill's honesty mechanism is bypassable by downstream document editing.

Another failure mode: the multi-actor journey pattern. The skill itself warns this is "advanced" and "complex to maintain," with Mermaid simplified or omitted. But if an agent loads the skill and the user says "map the B2B buying journey for buyer, influencer, and end-user," the skill will attempt it. The output will be a sprawling artifact with parallel tables, intersection points, and a complexity warning. A reader will struggle to extract a coherent narrative from three interleaved tracks, and the artifact's complexity will prevent it from being updated as research evolves.

## What it quietly assumes

The skill assumes every journey has **clear stage boundaries with identifiable triggers and exit criteria**. Real customer experiences are messier — stages overlap, customers bounce between stages, and exit criteria are often fuzzy. The skill's linear and cyclical patterns impose structure on experiences that may resist structuring, and the stage model can create false clarity about where one phase ends and another begins.

It assumes **emotions can be mapped to stages with high confidence given research**. In practice, even with good interview data, emotions vary widely across participants at the same stage. The skill's emotional-curve table assigns one dominant emotion per stage, which flattens individual variance. A stage where 40% of users feel frustration and 60% feel hope gets reduced to one label with a confidence note.

The skill also assumes someone will maintain the map. Journey maps are living artifacts — touchpoints change, emotions evolve, new research fills gaps. The skill produces a one-shot artifact with no versioning, no update protocol, and no mechanism for tracking which claims have been superseded by newer research. The output looks like a reference document but ages like a screenshot.

Finally, the skill assumes the agent can make nuanced judgments about **severity ratings and moment-of-truth selection**. Picking the 3-5 moments that "determine whether the customer continues or abandons" from a pool of 20+ pain points requires strategic judgment about what really drives churn vs. what is merely annoying. The skill provides no rubric for this selection beyond the continue-vs-abandon heuristic.

## What could go wrong

The skill reads research files and produces markdown with Mermaid diagrams. No destructive tool risk. The risks are in the artifact's downstream use:

**The map becomes the terrain**: A well-structured journey map with named stages, quantified emotions, and severity-rated pain points reads as authoritative. Teams may treat it as ground truth even when every entry is hypothesis-labeled, because the format signals rigor regardless of content quality. The skill's honesty mechanisms are only effective if readers engage with the confidence labels.

**Emotional false precision**: Assigning specific emotions ("curiosity, mild skepticism") to stages creates a false sense of knowing the customer's internal state. Even with interview evidence, self-reported emotions are unreliable, and the emotional-curve format encourages overconfidence in affective claims.

**Mermaid diagram failures under complexity**: The skill advises splitting large diagrams but can't prevent an agent from producing a Mermaid block that exceeds the renderer's node limit. If the diagram silently fails to render, the artifact ships without the visual summary that was supposed to be its most scannable element.

## Bottom line

Pick this skill when you have genuine research signal and need to communicate the shape of a customer experience to a team that will act on it. The refusal protocols alone make it worth loading — the skill diagnoses bad inputs instead of accepting them silently. The biggest benefit is the evidence-anchoring discipline: every claim has a confidence label and a source, which forces the conversation from "what do we think the user feels?" to "what do we know and what do we need to learn?" The biggest risk is that the artifact's polish outruns its evidence, and downstream consumers skip the confidence labels. Compared to alternative journey-map approaches (Miro templates, brainstorming workshops, AI-generated maps), this one's research-first stance is a genuine differentiator. It earns a spot in a tight catalog, especially if the catalog also has interview-synthesis and persona skills it can chain with.

## Confidence: high

I read the full skill including the five refusal protocols, three journey patterns, output contract, and cross-skill composition section. The methodology is explicit and self-aware about its limitations.
