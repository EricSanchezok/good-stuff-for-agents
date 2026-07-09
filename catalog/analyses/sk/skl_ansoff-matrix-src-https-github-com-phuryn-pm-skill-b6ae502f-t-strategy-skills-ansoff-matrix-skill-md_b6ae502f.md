---
schema_version: 1
skill_id: skl_ansoff-matrix-src-https-github-com-phuryn-pm-skill-b6ae502f-t-strategy-skills-ansoff-matrix-skill-md_b6ae502f
source_hash: sha256:19eba3cf58ea03a181c00c7de1bc093f0526f333
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:06:00+08:00"
---

# Ansoff Matrix

A structured analysis framework for evaluating growth strategies across the classic 2×2: existing vs. new markets on one axis, existing vs. new products on the other. For each quadrant — market penetration, market development, product development, diversification — the skill provides strategy menus, risk assessments, typical timelines, real-company examples, and a clear output process. It is a strategic-analysis skill: it guides the agent to evaluate opportunities, not just describe a framework.

## Why it matters

This is an above-average strategy framework skill. What distinguishes it from a textbook summary is the per-quadrant specificity. Each quadrant gets eight concrete strategies (not just definitions), a risk level, a typical timeline, and multiple real-company examples. "Market penetration: 6-12 months, low risk" vs. "diversification: 24+ months, high risk" gives the agent a calibration baseline that pure-definition skills lack.

The output process is substantive — seven steps from defining the current state through opportunity identification, prioritization criteria, go-to-market strategy, phasing, and risk mitigation. The prioritization dimensions (strategic fit, revenue potential, resource requirements, competitive advantage, timeline to profitability) are the right ones. The strategic questions section ("which quadrant offers the best risk-reward profile?") forces contextual reasoning rather than template-filling.

The examples (Netflix adding games, Spotify adding podcasts, Amazon→AWS, Apple→iPhone) are well-chosen — they illustrate quadrant concepts with businesses the agent is likely to know, making the abstract framework concrete.

The notes section shows strategic judgment: "most companies should excel in one quadrant before expanding," "avoid spreading too thin across all four simultaneously," "reassess annually or when market conditions shift." These are practitioner insights, not textbook filler.

## Where it helps, where it hurts

**Best-case scenario:** A founder or product leader says "we've saturated our core market, what's next?" The agent loads this skill, maps the company's current position, and produces a structured analysis with 2-3 specific opportunities per quadrant, risk assessments, resource estimates, and a recommended sequence. The skill forces the conversation from "should we expand?" to "we should pursue market development into vertical X using channel partnership Y, because our product is proven, the adjacent market is growing at 15% YoY, and the resource requirement is within our current headcount." The specificity of the output depends on the quality of the input data, but the framework ensures the analysis covers the right dimensions.

**Worst-case scenario:** The agent has zero market data — no revenue numbers, no churn rates, no competitive intel, no customer segmentation. The user says "do an Ansoff analysis for us." The agent loads this skill and populates each quadrant with generic strategy suggestions from the menus ("increase frequency of product usage," "expand into new geographies") without connecting any of them to the company's actual situation. The output looks like strategy work but is a Mad Libs version of the framework — the examples are copied, not reasoned. The risk levels and timelines give false precision to guesses.

## What it quietly assumes

The skill assumes the company has a clearly defined "current market" and "current product." For early-stage startups pivoting every quarter, or multi-product enterprises where "current product" spans fifty SKUs, this boundary blurs and the quadrant analysis loses precision. The skill doesn't address how to scope the analysis — company level, division level, product-line level.

It assumes growth is the primary objective. For a company optimizing for profitability, retention, or survival, the growth-centric framing may misdirect. "Market penetration" strategies like "lower prices to capture price-sensitive segments" could destroy margins at a company that needs to defend them.

The timelines (6-12 months for penetration, 24+ months for diversification) assume a well-resourced, execution-capable organization. For a seed-stage startup, "market development in 12-24 months" is aspirational fiction. The skill states these as typical, not universal, but an agent not calibrated to the organization's actual velocity will treat them as planning assumptions.

The skill also assumes competitive dynamics are reasonably knowable and stable during the analysis window — fine for mature industries, dangerous in winner-take-all platform markets.

## What could go wrong

The risks are strategic, not operational. The worst realistic outcome is an agent producing an Ansoff analysis that the leadership team treats as rigorous strategy when it's actually structured speculation. The per-quadrant strategy menus can function as a multiple-choice test — the agent picks strategies that sound reasonable without validating market size, competitive response, or execution feasibility. An analysis that recommends "related diversification through acquisition" without knowing the company's balance sheet is strategic malpractice.

A subtler risk: the skill encourages comprehensive analysis ("identify 2-3 specific opportunities per quadrant"), which can produce 8-12 growth options. For an organization with limited bandwidth, this creates analysis paralysis rather than focus. The notes warn against spreading too thin, but the output process doesn't include a forcing function for narrowing — it lists prioritization criteria but doesn't require the agent to pick.

No elevated permissions needed. The user should be present with market data, financials, and strategic context — without those, this skill produces strategic LARPing.

## Bottom line

Pick it when you need a structured growth-strategy analysis and have real market data to feed it. The per-quadrant detail, risk calibrations, and strategic questions make it more useful than a generic strategy framework. Skip it when you have no data or when the question isn't about growth expansion. Biggest risk is producing strategy theater — well-structured analysis based on guesses. Biggest benefit is the risk-calibrated quadrant specificity that prevents treating all growth moves as equivalent. Earns a spot in a tight catalog as a solid strategy-analysis tool, provided it's loaded alongside skills that supply the market data it needs.

## Confidence: high

The Ansoff Matrix is a well-established strategic framework and this implementation covers it thoroughly with practitioner judgment. I understand both the framework's value and its failure modes when applied without data.
