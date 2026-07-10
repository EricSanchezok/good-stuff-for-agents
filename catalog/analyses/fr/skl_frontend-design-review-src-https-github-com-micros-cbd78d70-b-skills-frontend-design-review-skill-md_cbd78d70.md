---
schema_version: 1
skill_id: skl_frontend-design-review-src-https-github-com-micros-cbd78d70-b-skills-frontend-design-review-skill-md_cbd78d70
source_hash: sha256:6fd8fe378026252e3810eae36844704f3c684fe3
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T14:00:00Z"
---

# Frontend Design Review

A dual-purpose skill from Microsoft that does two barely-related things under one roof: (1) review existing UI implementations against a three-pillar quality framework, and (2) create distinctive frontend interfaces from scratch. It's a hybrid of a design QA checklist and a creative design guide, with the review side being the structured, reference-supported portion and the creative side being a collection of aesthetic principles.

## Why it matters

This skill is caught between two identities and doesn't fully commit to either. The review side has real structure: the three-pillar framework (Frictionless Insight to Action, Quality Craft, Trustworthy Building) is a thoughtful evaluation lens that goes beyond the usual "check contrast, check spacing" checklist. The Frictionless pillar asks: can the user complete their task in ≤3 interactions? The Quality Craft pillar ties implementation back to Figma specs and design tokens. The Trustworthy pillar adds AI transparency requirements. These are all reasonable and under-covered in typical review skills.

The creative side, however, is a diluted echo of Anthropic's frontend-design skill — which this skill explicitly acknowledges as inspiration. The aesthetic guidance (avoid Inter/Roboto/Arial, use CSS-only motion, commit to a tone) is sound but generic. It's the kind of advice you'd find in any design-system documentation. It doesn't add new insight beyond what Anthropic's original provides, and the original is more opinionated and detailed.

The skill's real differentiator — and its problem — is the attempted fusion. No other skill tries to be both a design reviewer and a design creator. But the two modes share almost no common infrastructure: the review mode references Figma, design tokens, and structured output templates; the creative mode references typography, motion, and spatial composition. Loading this skill means you get both, but you probably only need one.

## Where it helps, where it hurts

**Best-case scenario:** A team uses this for PR reviews of frontend components in a design-system-driven codebase. The reviewer loads the skill, works through the three pillars, checks Figma parity through Dev Mode, verifies design tokens are used (not hardcoded values), and produces a structured review with blocking/major/minor severity. The review output format (in `references/review-output-format.md`) gives consistency across reviewers. The system works because the codebase already has a design system, the team already uses Figma, and the review framework aligns with existing processes.

**Worst-case / failure scenario:** Someone asks the agent to "create a beautiful landing page" and loads this skill expecting the creative mode to deliver. The skill provides aesthetic principles but no implementation pattern library, no component templates, and no concrete "here's what good looks like" examples. Compare this to Anthropic's frontend-design skill, which ships with detailed implementation patterns and anti-patterns. An agent using only this skill's creative guidance will produce a page that follows the principles but looks generic — paradoxically, the very "AI slop" the skill warns against. The creative mode tells you what to avoid but doesn't give you enough to build something distinctive.

Another failure mode: the agent loads this skill for an accessibility audit. The skill mentions WCAG 2.1 A/AA and references "focus indicators" and "reflow" in the Quality Craft pillar, but there's no systematic accessibility checklist, no WCAG criteria mapping, and no test methodology. The skill gestures at accessibility without operationalizing it. If you need a real a11y audit, this skill is the wrong tool.

## What it quietly assumes

- **A design system already exists.** The review mode is built around design system compliance: "Review component in your Storybook," "Use Figma Dev Mode to get exact specs," "Verify design tokens are used." If the team doesn't have a design system, this mode degenerates into a generic code review with prettier language. This assumption holds for mature product teams (~30% of frontend projects) but fails for startups, prototypes, and greenfield projects.

- **Figma is the design tool.** The review workflow explicitly references Figma Dev Mode. Teams using Sketch, Penpot, or no design tool at all lose the "Compare implementation to Figma design" step entirely. This is a reasonable default for Microsoft's ecosystem but narrows the skill's applicability.

- **The reviewer knows what "distinctive" means.** The creative mode's entire value proposition is producing interfaces that don't look like "AI slop." But distinctiveness is subjective and contextual — what's distinctive for a fintech dashboard is different from a portfolio site. The skill provides aesthetic categories (brutalist, art deco, editorial) but no guidance on matching tone to context. An agent that follows the "avoid Inter and Roboto" rule without understanding why will pick a different generic font and call it distinctive.

- **The review output format file exists and is usable.** The SKILL.md references `references/review-output-format.md`, `references/review-type-modifiers.md`, `references/quick-checklist.md`, and `references/pattern-examples.md`. These are likely where the actual review structure lives. Without reading them, the SKILL.md reads like a table of contents — the three pillars are described in 2–3 bullet points each. The real value (or lack thereof) is in those references.

## What could go wrong

The risks are low — this is a review/design skill with no destructive operations:

- **False confidence from shallow review.** If the agent only checks the three pillars as described in the SKILL.md (a few bullet points each), the review is superficial. The Quality Craft pillar, for example, is covered in two bullets: "design system compliance" and "aesthetic direction." A real quality craft review would involve dozens of checks across spacing, typography, interaction states, responsive behavior, loading states, error states, and empty states. The skill's structure implies depth in the reference files, but an agent that skips those files produces a review that is worse than useless — it's misleading.

- **Creative mode produces bland output.** The aesthetic guidelines are principles, not recipes. An agent that follows them literally produces designs that avoid the listed clichés but have no positive character. The skill tells you to "pick a display font" and "use CSS-only motion" but doesn't help with the hard part: making choices that work together. This is a skill that teaches vocabulary but not composition.

- **No external state modification.** This skill doesn't write files, call APIs, or modify code. The user does not need to be present. The worst outcome is wasted time on a shallow review or a boring design.

## Bottom line

This skill is a split-personality artifact. As a design reviewer, it has a decent framework but its value is contingent on reference files I couldn't inspect. As a creative design guide, it's a weaker echo of Anthropic's frontend-design skill — use that instead. The biggest risk is shallow, misleading reviews when the agent doesn't drill into the reference files. The biggest benefit is the Frictionless Insight to Action pillar, which asks questions most review skills don't. It earns a catalog spot only if you need a structured review framework for design-system-driven teams — for creative frontend work, there are better skills.

## Confidence: medium

I read the full SKILL.md and understand its dual-mode architecture, but four reference files that contain the actual review structure, templates, and examples were unavailable. The three quality pillars are described in minimal detail in the SKILL.md — most of the substance likely lives in the references. Additionally, the creative design mode is explicitly derivative of Anthropic's frontend-design skill, and without comparing them side by side, I can't fully assess how much this skill adds or removes.
