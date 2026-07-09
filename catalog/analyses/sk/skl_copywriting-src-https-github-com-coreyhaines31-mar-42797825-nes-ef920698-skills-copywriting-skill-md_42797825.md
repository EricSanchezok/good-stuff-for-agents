---
schema_version: 1
skill_id: skl_copywriting-src-https-github-com-coreyhaines31-mar-42797825-nes-ef920698-skills-copywriting-skill-md_42797825
source_hash: sha256:0793e62270e203de1b2e2ff591a56015e4cf0075
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:05:25+08:00"
---

# Copywriting

This skill trains an agent to write marketing copy for web pages — homepages, landing pages, pricing pages, feature pages, about pages. It covers voice-and-tone calibration, page structure frameworks (above-the-fold through objection handling), CTA copy rules, and a quality checklist. It also specifies an output format: page copy organized by section, annotations explaining choices, alternative headline/CTA options, and SEO meta content.

## Why it matters

This is a solid, well-structured, but fundamentally generic copywriting skill. It does nothing surprising — clarity over cleverness, benefits over features, specificity over vagueness, customer language over company language. Every competent copywriting resource covers these principles. The page-structure framework (headline → social proof → problem → solution → how it works → objections → final CTA) is standard persuasion architecture you'd find in any conversion copywriting book. The headline formulas ("Achieve outcome without pain point," "The category for audience") are from the copywriting canon. The CTA advice to prefer action-oriented verbs over "Submit" and "Learn More" has been standard for 15 years.

What it does well: it's clean, it doesn't over-prescribe, and it provides a repeatable output format with annotations and alternatives. An agent following this skill will produce competently structured copy drafts. It won't embarrass itself.

What it's missing: any mention of how to handle brand voice that varies by audience segment, any guidance on localization or translation awareness, any treatment of regulatory constraints (finance, healthcare, legal disclaimers in copy), any distinction between B2B and B2C copy rhythm, and any acknowledgment that different traffic sources (paid social vs. cold outreach vs. product-qualified organic) demand entirely different copy strategies. The skill treats "copywriting" as a single, universal craft, which it isn't.

## Where it helps, where it hurts

**Best-case scenario:** A product marketer hands the agent a well-defined brief (page type, audience, product differentiation, existing proof points) and says "write the homepage copy." The skill's structure framework gives the agent a reliable skeleton. The output format ensures the human gets not just copy but reasoning for every choice plus alternatives. This is well-suited to early-stage startups or small teams where a human copywriter isn't available but the brief is good.

**Worst-case scenario:** The agent is given a vague request — "make this page sound better" — with no audience research, no product differentiation, no existing voice-of-customer data. The skill's context-gathering section asks good questions but the agent has no mechanism to get answers beyond asking the user. If the user replies "I don't know, just make it sound professional," the agent will produce technically correct copy that reads like every other SaaS homepage ever written. It will be clear, benefit-oriented, and completely unmemorable. The skill has no defense against "generic brief → generic output" because it doesn't teach the agent how to find distinctiveness when the user doesn't provide it.

Also: the skill defers thorough line-by-line editing to the `copy-editing` skill. An agent using only this skill will produce a first draft but won't polish it. You need both skills for a complete workflow, which is an intentional design choice but means this skill alone is incomplete.

## What it quietly assumes

1. **The agent already has a clear audience and product understanding.** The context-gathering section asks the right questions but doesn't help when answers are thin. It assumes someone — the user or a product-marketing context file — knows who the customer is, what they care about, and what language they use. Without rich voice-of-customer input, the copy will be generic regardless of skill quality.

2. **The brand voice is already established.** The voice-and-tone section asks about formality level and brand personality, but it doesn't help *discover* those things. It assumes the brand has a voice. If you're writing copy for a pre-launch product with no established tone, this section is a void.

3. **The skill is for English-language copy only.** Nothing about this skill addresses multilingual concerns, translation, or cultural adaptation of persuasive messaging. This is unstated and reasonable for a majority-English skill, but it won't hold if you try to use it for, say, a German or Japanese landing page where persuasion conventions differ significantly.

4. **The output is read by humans, scanned by humans.** Despite referencing SEO meta content, the skill's core craft is human-to-human persuasion. There's no treatment of how copy performs when read by AI summarizers, snippet extractors, or voice assistants. A sibling skill (`ai-seo`) exists for that, but the assumption that web copy is read by humans is increasingly incomplete.

These assumptions hold for most US/English SaaS and ecommerce contexts. They break for multilingual markets, highly regulated industries, and AI-mediated consumption.

## What could go wrong

This is an advisory skill with no tool execution requirements beyond reading product-marketing files and asking questions. The risks are quality risks, not operational risks:

- **Generic, undifferentiated copy at scale.** If this skill is used to generate copy across many pages or many clients, it will produce clean but same-y output. The principles are universal, which means the results converge. An engineer reading a pricing page written by this skill will feel like they've read the same page a hundred times.

- **Over-promising without substantiation.** The skill teaches "specificity over vagueness" and "benefits over features," but if the agent invents specific numbers to satisfy that rule ("Cut your weekly reporting from 4 hours to 15 minutes" — without evidence), the copy becomes dishonest. The skill has an honesty rule ("Honest over sensational") but no mechanism to verify claims.

- **Risk-reversal copy without legal awareness.** The output format includes objection handling and guarantees. An agent could write "100% money-back guarantee, no questions asked" without understanding that some jurisdictions require specific refund-policy language or have statutory cooling-off periods that the copy must reference. The skill has no compliance awareness.

The user should review all copy before publication. The agent should not be trusted to publish copy autonomously.

## Bottom line

This is a competent, well-organized, but undistinguished copywriting skill. You could swap it with any other competent copywriting skill and get roughly equivalent output. It earns its spot in a marketing skills pack because copywriting is a core need and this skill provides a clean, repeatable workflow — not because it's exceptional. The biggest risk is genericide: an agent following this skill without rich audience context will produce technically correct, completely forgettable copy. The biggest benefit is the structured output format with annotations and alternatives, which respects the human reviewer's need to understand *why* choices were made. If the catalog could only keep 100 skills, this one is on the bubble — keep it if the catalog needs a copywriting entry, but there are probably better ones out there.

## Confidence: high

The source is complete and internally consistent. Every claim is straightforward and the limitations are clear from omission rather than ambiguity.
