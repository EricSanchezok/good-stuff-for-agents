---
schema_version: 1
skill_id: skl_create-prd-src-https-github-com-phuryn-pm-skills-p-152f8b28-pm-execution-skills-create-prd-skill-md_152f8b28
source_hash: sha256:68c8b26690db8e826782f3029c24b88340ec570e
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T03:06:00+08:00"
---

# Create a Product Requirements Document

An 8-section PRD template wrapped in agent instructions: gather information, think step-by-step, fill in the template, save the file. The template covers the standard PRD anatomy — summary, contacts, background, objective, market segments, value propositions, solution, release. The skill is a structured prompt, not a methodology. It tells the agent what sections to produce but offers almost no guidance on how to produce them well.

## Why it matters

This is a generic PRD template. You could swap it with any other PRD template and get roughly the same result. The 8-section structure is standard and defensible — it hits the communication needs of engineers, designers, and leadership — but there is nothing here that a competent agent couldn't produce from a three-sentence prompt: "Write a PRD with sections for summary, background, objectives, market segments, value props, solution, and release plan."

What little methodology exists is surface-level. "Think step by step: what problem, who for, how measure, what constraints" is a good pre-writing prompt but barely constitutes process design. The instructions to use accessible language ("primary school graduate") and flag assumptions are sensible but undeveloped — they're stated, not operationalized. There are no examples of what good looks like, no anti-patterns, no quality gates, no review checklist.

The "further reading" links both point to productcompass.pm articles by the same author, suggesting a methodology exists but is kept outside the skill. The skill itself is a thin wrapper.

## Where it helps, where it hurts

**Best-case scenario:** You're an experienced product manager who knows exactly what to write. The template saves you from remembering section order and ensures you don't skip contacts, assumptions, or release planning. It's a formatting aid for someone who already has the content in their head.

**Worst-case scenario:** A junior agent or someone without product context loads this skill and fills each section with plausible but unvalidated content. The template asks for market segments, value propositions, and success metrics — all of which require external research, customer data, or stakeholder interviews. The skill's "gather information" instruction says "if the user provides files, read them; if they mention URLs, use web search" — but if the user provides nothing, the agent fills the template with fabricated market segments and guessed success metrics. The structured format makes fabricated content look authoritative. A PRD full of well-formatted guesses is more dangerous than no PRD at all.

## What it quietly assumes

The foundational assumption is that a PRD is the right artifact for every product initiative. There is no mention of lean experiments, problem briefs, opportunity assessments, or any lighter-weight alternative. In a two-week sprint context, an 8-section PRD is overhead; in a hardware product context, it's missing regulatory and manufacturing sections. The template is one-size by omission.

Other assumptions: the agent can independently define market segments without customer research (it can't); SMART OKRs can be set without access to baseline metrics or leadership priorities (they can't); stakeholder contacts are known and listed by role (often not the case in early-stage work); "avoid exact dates, use relative timeframes" works for leadership but frustrates engineering teams who need to coordinate sprints; the product name is known at PRD-writing time (often provisional).

The "further reading" links assume the agent can access and process external articles during PRD creation, which adds latency and dependency on URL availability.

## What could go wrong

The primary risk is fabricated specificity. The template demands market segments, value propositions, competitive comparisons, and success metrics — fields that require real data. An agent without access to that data will invent it. A PRD claiming "target segment: SMB marketing teams with 5-50 employees" when no segmentation exercise was done creates false confidence that cascades into development priorities.

A secondary risk: the skill saves output as `PRD-[product-name].md` but provides no naming convention, no version handling, and no guidance on where to save it relative to the project. An agent could overwrite an existing PRD or scatter PRDs across unrelated directories.

No elevated tool permissions are needed beyond file writes. The user should be present to provide market data, customer insights, and success criteria — without those, the PRD is a fiction.

## Bottom line

Skip it. This skill is a section-header list with no methodology behind it. A competent agent given "write a PRD" will produce the same structure without loading this skill. If you need a PRD template, there are dozens of better ones that include examples, quality criteria, stakeholder review checklists, and guidance on when not to write a PRD. Biggest risk is well-formatted fabrication; the only benefit is saving 30 seconds of section-naming. Does not earn a spot in a tight catalog.

## Confidence: medium

The template structure is clear and I understand its intent, but without seeing how this skill performs across different product contexts (enterprise vs. consumer, greenfield vs. iteration, hardware vs. SaaS), I can't judge whether the 8-section format holds up broadly or breaks in specific scenarios.
