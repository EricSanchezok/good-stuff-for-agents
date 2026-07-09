---
schema_version: 1
skill_id: skl_discover-stakeholder-summary-src-https-github-com-e568212c-ls-discover-stakeholder-summary-skill-md_e568212c
source_hash: sha256:73c8759320a0d11390e712705cabcc52b1364e25
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:06:02+08:00"
---

# Stakeholder Summary

A structured process for documenting who has power, interest, and skin in the game on a project. The skill walks through seven steps — identify, assess influence/interest, understand perspective, map relationships, categorize engagement level, plan communication, and identify risks — then outputs a formatted document from a template with sections for profiles, relationships, communication plans, and mitigation strategies. The most important thing to understand is that this skill maps the landscape; it does not communicate to stakeholders. That distinction is wired into its cross-reference system: use `foundation-stakeholder-update` when you want to actually talk to these people.

## Why it matters

This is a competent but generic stakeholder-mapping skill. The seven-step process is standard project management practice — identify, assess power/interest, map, plan comms — and anyone with PMBOK, PRINCE2, or general PM experience will recognize the pattern immediately. You could swap this with any other stakeholder-mapping template and get roughly the same output.

What saves it from being interchangeable is the integration with the surrounding PM-skills ecosystem. The skill explicitly routes users to `foundation-meeting-brief`, `discover-interview-synthesis`, `foundation-persona`, and `foundation-stakeholder-update` — so there's a clear boundary about what it does and doesn't do. The "When to Use" triggers are concrete (project kickoff, taking over an existing project, pre-decision buy-in, organizational change) rather than abstract.

The template-driven output gives the agent a concrete target to fill in rather than free-form prose, which reduces the risk of an unstructured brain dump. But the skill itself provides no novel methodology — no power-interest grid variant, no influence-network mapping technique, no resistance-typing framework. It's a checklist, not a methodology.

## Where it helps, where it hurts

**Best case:** You've just inherited a project from another PM and you need to understand the political landscape fast. The people involved aren't documented anywhere, decisions are stalled, and you're getting conflicting signals about who needs to approve what. The skill gives you a repeatable process to document everything you learn and produce an artifact you can update as you learn more. The risk-mitigation section is particularly useful here — it forces you to think about which stakeholders could derail the project before they do.

**Worst case:** You already know your stakeholders well — you've been on this project for months, you talk to these people daily, and the power dynamics are obvious. Loading this skill will produce a 1,500-word document that tells you what you already know in a format optimized for someone who knows nothing. The quality checklist item "Influence and interest assessments are realistic, not wishful" is good advice, but it won't save you from the busywork of filling out structured profiles for people you already understand. You're also in trouble if your real problem is stakeholder *communication* rather than stakeholder *identification* — this skill will correctly tell you to use `foundation-stakeholder-update` for that, but if you loaded it first, you've burned a turn.

## What it quietly assumes

**The agent has access to organizational context.** The skill says to list "everyone with a stake," assess their influence and interest, and document their concerns. None of this is possible without knowing who works at the company, what they do, and what they care about. The skill provides no mechanism for acquiring this information — it assumes the agent or user already has it. In practice, this means either the user provides all stakeholder names and context, or the agent fabricates plausible-sounding profiles that are fiction.

**The user works in an organization complex enough to justify formal stakeholder mapping.** For a startup with three people and a founder, this skill is dead weight — you know who the stakeholders are, there are three of them. The skill's value scales with organizational complexity, but nothing in the skill acknowledges or routes around this.

**The influence/interest framework maps well to the user's context.** Power-interest grids assume that influence is reasonably visible and that "high influence" people can be identified and managed. In some organizations, real influence is informal and invisible to anyone outside the inner circle. The skill provides no guidance for discovering invisible influence.

**Meeting cadence and comms planning are feasible and desirable.** The skill says to plan communication cadence and channels for high-priority stakeholders. This assumes the user has the organizational standing to schedule recurring touchpoints with senior stakeholders — a junior PM trying to get 15 minutes on a VP's calendar every two weeks may get laughed at.

The biggest hidden assumption is the first one: that the agent has access to stakeholder knowledge. In practice, the user will provide most of this data, which makes the skill more of an output formatter than an analytical tool.

## What could go wrong

**The skill writes a document — that's it.** No API calls, no database writes, no email. The worst realistic outcome is that it produces a stakeholder map with incorrect influence/interest assessments that the user takes at face value and uses to plan communications. If the agent rates a resistant stakeholder as "low influence" when they're actually a founder's trusted advisor, the resulting communication plan will ignore the person who can kill the project. The user should absolutely be present to validate influence/interest ratings — these are judgment calls with real political consequences.

A subtler risk: the structured output format implies a level of rigor that may not match the quality of the inputs. A polished stakeholder profile reads like it was built from careful interviews, even if the agent extrapolated it from a single Slack message.

## Bottom line

Pick this if you're in the PM-skills ecosystem and need a structured stakeholder-mapping artifact that integrates with the family of PM skills. Skip it if you're looking for novel methodology, if your organization is small enough that stakeholder mapping is overkill, or if your real problem is stakeholder communication rather than stakeholder identification. Biggest benefit: the clear boundaries with sibling skills prevent category confusion. Biggest risk: the agent fills stakeholder profiles with plausible-sounding fiction because it has no real organizational data. In a tight 100-skill catalog, this earns a spot only if you're keeping the PM-skills family intact — standalone, it's replaceable.

## Confidence: high

The source is complete and well-structured with clear boundaries, instructions, and cross-references. I understand the stakeholder-mapping domain well enough to judge its place in the landscape.
