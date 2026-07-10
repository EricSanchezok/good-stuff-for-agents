---
schema_version: 1
skill_id: skl_content-strategy-src-https-github-com-coreyhaines3-980529e8-f920698-skills-content-strategy-skill-md_980529e8
source_hash: sha256:3a54e3f7b0b23d35d1e4c7f2f608fa947d19061f
analysis_version: 1
confidence: high
updated_at: "2026-07-10T14:00:00.000Z"
---

# content-strategy

This skill teaches an agent to think like a content strategist — not just to generate blog post ideas, but to evaluate ideas against customer research, competitive gaps, search potential, and resource constraints using a structured scoring framework. It's the most intellectually honest skill in the marketingskills collection because it tells you not to build dedicated pillar pages unless you actually need them, which is the opposite of what most content strategy advice does.

## Why it matters

The searchable-vs-shareable distinction is the organizing insight here, and it's deployed well. Every piece of content is classified as searchable (captures existing demand), shareable (creates demand), or both — with the explicit instruction to prioritize search-first. This framework is simple enough to apply mechanically and nuanced enough to prevent the common failure mode of producing content that's neither searchable nor shareable because it was designed to be both.

The prioritization scoring framework (Customer Impact 40%, Content-Market Fit 30%, Search Potential 20%, Resources 10%) is concrete and numeric. This matters because most content strategy skills produce lists of ideas; this one produces a ranked table you can argue about. A marketing team can disagree with the scores without disagreeing with the framework, which makes the output a conversation starter rather than a dictum.

Where the skill shows real restraint: it explicitly says "Most content works fine under `/blog`. Only use dedicated hub/spoke URL structures for major topics with layered depth." This is the advice of someone who's maintained content architectures, not someone who's read about them. It also distinguishes between when to use dedicated pillar pages and when internal linking is sufficient — a distinction most SEO content misses.

The content ideation sources section (keyword data, call transcripts, survey responses, forum research, competitor analysis, sales/support input) is comprehensive. Each source gets a specific extraction method: "extract questions asked → FAQ content," "extract pain points → problems in their own words," etc. This is actionable pattern matching, not just topic suggestions.

## Where it helps, where it hurts

**Best case:** A B2B SaaS company with 6-12 months of content history, a customer base, and sales call recordings wants to plan the next quarter's content. The marketing lead asks an agent: "Analyze our last 20 sales call transcripts and competitor content, then propose a content strategy with ranked priorities." The agent uses the skill's ideation frameworks to extract topics from transcripts, maps competitor gaps, scores every idea against the four-factor framework, produces a pillar map with topic clusters, and delivers a prioritized table. A human then debates the scores and adjusts priorities — the framework made the conversation possible. This is content strategy as structured deliberation, and the skill enables it.

**Worst case:** A pre-launch startup with no customers, no traffic, no sales calls, and no competitor content analysis asks "what should I write about?" The skill's ideation sources require data that doesn't exist — no call transcripts to mine, no survey responses, no forum research that returns results for a novel product category. The agent defaults to the keyword research and competitor analysis paths, which produce generic topics ("What is X?" awareness articles) without the customer language or unique insights that make content distinctive. The output is a content calendar indistinguishable from what ChatGPT produces with a one-sentence prompt.

## What it quietly assumes

1. **You have customer research inputs to mine.** This is the foundation the prioritization framework rests on. The Customer Impact score (40% weight) asks how frequently a topic came up in research, what percentage of customers face this challenge, and how emotionally charged the pain point is. Without call transcripts, survey data, or support ticket analysis, this score is a guess. The skill assumes these inputs exist — it doesn't have a path for "we don't have customer research yet."

2. **Search volume data is available.** The Search Potential score asks for monthly search volume and competition level. The skill assumes access to Ahrefs, SEMrush, or Google Search Console data. For a pre-launch company or a product in a nascent category, search volume data doesn't exist because nobody is searching yet — the skill doesn't address how to prioritize when search demand is absent.

3. **You have the capacity to produce content consistently.** The skill describes content pillars, topic clusters, hub-and-spoke architectures, and editorial calendars — all of which assume ongoing production. A founder who can write one blog post a month doesn't need pillar strategy; they need to write the one post that matters.

4. **The agent can perform web searches for forum and competitor research.** The ideation sources include `site:reddit.com [topic]`, `site:quora.com [topic]`, and competitor content analysis. These assume the agent has web search capability. Many agents don't, or have restricted search access.

5. **Content strategy is the right lever.** The skill assumes the business problem is content gaps, not distribution, product quality, or market positioning. A company with no content strategy problem but a terrible product gets a beautiful content plan that converts visitors into disappointed users.

## What could go wrong

The primary risk is **producing a strategy that looks authoritative but rests on nonexistent data**. The scoring framework produces specific numbers (8.0, 7.1). Numbers imply measurement, and measurement implies accuracy. When those numbers are built on guesses because the underlying research doesn't exist, the strategy feels evidence-based but isn't — and the team executes a quarter's worth of content against fabricated priorities. The skill has no "data quality check" step before scoring.

The secondary risk is **over-planning.** The pillar map, topic cluster structure, and prioritization framework can produce a beautifully organized content architecture that takes two weeks to build and leads to zero content being published because the team burned their time budget on strategy docs. The skill provides the structure; the discipline to stop planning and start producing has to come from the human.

For tools: the skill requires web search for ideation. The worst realistic outcome from a search failure is a strategy built on the agent's training data rather than real search results — plausible-sounding but disconnected from the actual competitive landscape. No destructive tool risk exists; this is a purely analytical skill.

## Bottom line

This is a strong content strategy skill that earns its spot by being honest about when not to do things (don't build pillar pages unless you need them) and by providing a framework people can argue with (numeric scoring beats ranked lists). Compared to alternatives, I'd pick this one for any team that has customer research to feed it and needs to turn scattered content production into a deliberate strategy. If the catalog could only keep 100 skills, this one makes the cut — content strategy is a common need and most alternatives are either too shallow (five blog post ideas) or too complex (full SEO platform integration). This hits the middle: structured enough to produce real output, simple enough to use without a specialist.

## Confidence: high

I read the full 12KB source including the searchable/shareable framework, all five content ideation sources with their extraction methods, the four-factor prioritization scoring system with weights, and the content pillars and topic cluster architecture. The skill is explicit about its structure and its assumptions, and I understand it well enough to judge where it overpromises (data-dependent scoring) and where it delivers (content ideation from real inputs).
