---
schema_version: 1
skill_id: skl_competitor-analysis-src-https-github-com-phuryn-pm-ece2d0e0-arch-skills-competitor-analysis-skill-md_ece2d0e0
source_hash: sha256:b9cafee194fc0e7560781d4538e05081c112282c
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T03:06:30+08:00"
---

# competitor-analysis

An agent-directed competitive analysis workflow that uses web search to identify 5 direct competitors, then profiles each one across a fixed template: market position, core strengths, weaknesses, business model, competitive threats, and differentiation opportunities. It wraps everything in a "strategic product analyst" persona and expects $ARGUMENTS as the product or company to analyze.

## Why it matters

This skill is thinner and more generic than it first appears. It provides a 6-step workflow and a detailed output structure, but nearly all of that structure is descriptive scaffolding—"Research each competitor's positioning, features, pricing, go-to-market strategy"—without guidance on how to weight findings, what makes a good differentiation insight versus a shallow observation, or how to handle gaps in available data.

The output structure is its main asset: 5 competitor profiles each broken into the same 6 sub-sections (Core Strengths, Weaknesses, Business Model, Threats, etc.), followed by cross-cutting differentiation recommendations and a 12-18 month risk assessment. This creates consistency, but also invites filler. When an agent has thin intelligence on competitor #4, the template still demands a full profile, and the result will be padded with generic observations.

Compared to `discover-competitive-analysis`, this skill leans harder on the agent's web search capability ("Conduct web research to identify direct competitors," "Use web search to identify product launches, funding, executive moves") but provides less structural discipline: no confidence-level documentation requirement, no positioning matrix construction method, no quality checklist, no cross-skill routing guidance. It's a prompt with a long output template attached.

## Where it helps, where it hurts

**Best-case scenario:** You're a PM with $ARGUMENTS set to your own product name, working in a crowded, well-documented B2B SaaS category (project management, CRM, analytics). You need a broad landscape scan for an internal strategy doc. You load this skill, the agent fires off web searches for competitors, and you get a formatted report covering 5 competitors with enough detail to orient a strategy conversation. The output is not deep, but it's broad and consistent, and "consistent but shallow" is often good enough for a first pass.

**Worst-case scenario:** You're analyzing a category with subtle competitive dynamics—say, a platform play where indirect competitors matter more than direct ones, or a market where competitors differentiate on ecosystem integration rather than features. The skill's rigid structure (5 direct competitors, fixed profile sections) will produce an analysis that misses the real competitive dynamics entirely. It will profile 5 companies that look like competitors on a feature checklist but fail to capture platform lock-in, API ecosystem effects, or distribution partnerships as competitive moats. Worse, the "Competitive Threats & Advantages" section for each competitor frames everything as a bilateral comparison with $ARGUMENTS, making the analysis useless for understanding multi-player market dynamics.

An additional failure mode: if $ARGUMENTS is vague ("AI code generation tools") rather than a specific product, the skill has no scoping mechanism. It will produce a generic landscape report that covers GitHub Copilot, Codeium, Tabnine, etc. without tying differentiation insights to any specific product's strategy.

## What it quietly assumes

1. **Web search reliably surfaces the right competitors.** The skill says "Use web search to identify 5 primary direct competitors." In practice, web search for "competitors of X" returns SEO-optimized listicles, sponsored comparison pages, and review-site roundups—the same sources every analyst sees. You'll miss stealth competitors, emerging entrants without SEO presence, and international competitors in non-English markets. This assumption holds well for US-centric B2B SaaS; it fails for markets where purchasing happens through RFPs, conferences, or personal networks.

2. **Direct competitors are the right unit of analysis.** The skill mandates 5 direct competitors and treats indirect competitors as "notable adjacent" afterthoughts. In platform markets or markets with strong network effects, indirect competitors and substitutes often matter more than direct ones. The skill has no mechanism to pivot the analysis toward substitutes if that's where the real strategic threat lies.

3. **Public pricing information exists and is meaningful.** The "Business Model & Pricing" section asks for "Pricing structure" and "Price point(s) in market." For many enterprise products, real pricing is opaque—everything is "contact sales." The skill doesn't instruct the agent on what to do when pricing is hidden, which means the agent will either leave it blank or fill it with "Enterprise, contact for pricing" repeated five times.

4. **The agent persona adds value.** The skill opens with "You are a strategic product analyst and competitive intelligence expert." This is a persona prompt, not an instruction. It may nudge the agent toward more analytical language, but it doesn't constrain behavior or improve accuracy. The skill would work identically without it.

5. **The user's $ARGUMENTS is a known product with a defined market position.** The skill never asks the user to define their own product's strategy, target segment, or differentiation before analyzing competitors. Without that baseline, differentiation recommendations ("Recommended competitive positioning for $ARGUMENTS") are directionless—you can't say "differentiate here" without knowing where "here" is.

## What could go wrong

The primary risk is web research hallucination compounded by the output template's demand for completeness. The skill requires 5 full competitor profiles. If web searches return thin results for some competitors, the agent will fill gaps with plausible-sounding fabrications rather than admit ignorance. There's no instruction to mark confidence levels, no refusal protocol for insufficient data, and no fallback for when 5 competitors can't be reliably identified. The "Further Reading" links (two productcompass.pm articles) suggest authority but are just blog posts—they provide no methodological guardrails.

The persona framing ("strategic product analyst and competitive intelligence expert") may increase overconfidence: agents adopt the persona's tone and authority while producing the same shallow research.

The user does not need to be present during production—this is designed as a fire-and-forget research task—but absolutely should review before trusting differentiation recommendations or competitive threat assessments. The skill offers no warnings about acting on potentially unreliable output.

## Bottom line

A generic competitive analysis prompt wrapped in a long output template. It will produce a formatted report for any well-known market category, but the analysis depth depends entirely on the agent's web research quality—the skill itself provides structure without rigor. Compared to `discover-competitive-analysis`, it lacks confidence notation, quality gates, cross-skill routing, and the 2x2 positioning framework. Its one advantage is the explicit 5-competitor mandate and the more granular per-competitor profile sections, which may produce more consistent (if equally shallow) output. Pick this if you want a formatted competitor landscape fast and don't care about analytical depth. Skip it if you need actionable strategic recommendations or if your market isn't well-documented online.

## Confidence: medium

The source is complete and readable, but the skill is mostly a prompt template—its real behavior depends entirely on the agent's web search execution, which I cannot predict from the source alone.
