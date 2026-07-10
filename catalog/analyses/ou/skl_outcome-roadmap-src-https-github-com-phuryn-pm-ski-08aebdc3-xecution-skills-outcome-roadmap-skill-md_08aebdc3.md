---
schema_version: 1
skill_id: skl_outcome-roadmap-src-https-github-com-phuryn-pm-ski-08aebdc3-xecution-skills-outcome-roadmap-skill-md_08aebdc3
source_hash: sha256:c51cfa226a50ab9f14367adc4c54af14b2562da9
analysis_version: 1
confidence: high
updated_at: "2026-07-10T13:46:00.000Z"
---

# outcome-roadmap

A single-purpose template that rewrites feature-list roadmap items into outcome statements following the "Enable [segment] to [outcome] so that [business impact]" format. It interrogates each initiative with "So what?" until surface-level features bottom out in strategic value. That's it — one transformation, one output shape.

## Why it matters

This skill is thin but not useless. The core technique — iterative "So what?" interrogation to extract outcomes from outputs — is a real PM practice, and the consistent output template saves the agent from having to invent a format on the fly. But there is nothing here an agent with general product knowledge couldn't reproduce. The value is purely in standardization: every roadmap the skill touches comes out in the same structure, which matters when you're processing multiple roadmaps or feeding output to a downstream workflow. Against other roadmap tools, this is the most narrowly scoped — it doesn't create roadmaps, doesn't prioritize, doesn't validate. It only reformats.

## Where it helps, where it hurts

**Best case**: A PM has inherited a feature-heavy quarterly roadmap from a predecessor or another team and needs to present it to leadership in outcome language that communicates strategic intent rather than shopping lists. They paste the roadmap, the skill rewrites each bullet into the standard outcome format, flags any items where the outcome is genuinely unknowable (which is valuable signal itself), and produces a clean markdown file. The PM doesn't have to think about format — they can focus on whether the outcomes are right.

**Worst case**: The PM provides a roadmap dominated by infrastructure migration, security compliance, or technical debt work — things that genuinely cannot be expressed as customer-facing outcomes without contortion. The skill will force-fit "Upgrade to PostgreSQL 16" into "Enable engineering teams to maintain data integrity so that customer trust is preserved" — technically true but content-free. The format creates the illusion of strategic alignment where none exists. Even worse: a junior PM who doesn't know their product's strategy well uses the skill to invent outcomes that sound plausible but misalign the team for months.

## What it quietly assumes

The biggest unstated assumption is that all roadmap work is customer-facing and outcome-expressible. Platform, infrastructure, internal tools, and compliance work is not, and the skill has no carve-out or alternative format for these categories. This assumption holds for maybe 60% of product roadmaps — plausible for B2C feature teams, broken for platform and internal-product teams.

It assumes the PM operates in a quarterly planning cadence with discrete initiatives. Continuous-delivery teams or teams using now/next/later roadmaps will find the quarterly sequencing scaffolding irrelevant.

It assumes the agent knows enough about the product's customers and business model to invent plausible outcomes from thin feature names. If the input is "Q2: Build admin dashboard v2," the agent has to guess what customer problem the admin dashboard solves. For niche B2B products, this guess will be wrong more often than not.

It assumes the PM has the authority to define and commit to outcomes. A junior PM executing someone else's roadmap can't simply declare the business impact of features they didn't choose — the skill doesn't distinguish between decision-makers and executors.

## What could go wrong

Tool risk is minimal. The skill calls for web search (to understand company strategy context) and file saving (to write the output markdown). Web search for internal product context will surface irrelevant public information — or nothing at all for internal tools. The file write is harmless.

The real risk is organizational. A roadmap of fabricated outcomes distributed to leadership creates downstream commitment to metrics nobody actually agreed to. Three months later, someone asks why "admin dashboard v2" didn't "reduce operational response time by 40%," and the answer is "the agent made that up." This is not a tool permission problem — it's a misuse-of-output problem that the skill does nothing to warn against.

## Bottom line

A competent but narrow formatting tool. I would not pick this over a general-purpose PM agent for roadmap work, but I would pick it over nothing when I specifically need consistent outcome-statement formatting across a batch of roadmap items. The single biggest risk is fabricated outcomes for non-customer-facing work. The single biggest benefit is the "So what?" loop — a simple but effective technique for pulling strategic thinking out of feature lists. This skill does not earn a spot in a tight 100-skill catalog; it covers too little ground and a general PM prompt does it nearly as well.

## Confidence: high

The source is straightforward, well-structured, and the domain (product management roadmapping) is one I understand well. The skill's scope is narrow enough that there are no hidden complexities.
