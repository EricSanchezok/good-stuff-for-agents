---
schema_version: 1
skill_id: skl_content-strategy-src-https-github-com-coreyhaines3-980529e8-f920698-skills-content-strategy-skill-md_980529e8
source_hash: sha256:3a54e3f7b0b23d35d1e4c7f2f608fa947d19061f
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T03:05:25+08:00"
---

# Content Strategy

This skill teaches an agent to plan what content to create — not to write it, but to decide what's worth writing. It covers content pillars, topic clusters, the searchable-vs-shareable distinction, keyword research by buyer stage, and six content-ideation sources (keyword data, call transcripts, surveys, forum research, competitor analysis, sales/support input). It includes a weighted prioritization framework that scores ideas on customer impact, content-market fit, search potential, and resource requirements.

## Why it matters

The skill's strongest section is the content-ideation methodology. It doesn't just say "look at competitor blogs" — it gives specific search operators (`site:reddit.com [topic]`, `site:competitor.com/blog`), tells you what to extract from each source (FAQs, misconceptions, terminology patterns from Reddit; content gaps and outdated material from competitor analysis), and maps everything to prioritized output tables. The buyer-stage keyword-modifier framework ("what is" → awareness, "best" vs "vs" → consideration, "pricing" "reviews" → decision) is a practical heuristic that will reliably produce useful topic ideas. The scoring template with explicit weights (40/30/20/10) gives the agent a defensible way to rank ideas — this is the kind of structured judgment that agents are bad at without scaffolding.

The weak section: content pillars. The pillar identification methods (product-led, audience-led, search-led, competitor-led) are listed but not developed. There's no guidance on how to distinguish a real pillar from a broad topic, no discussion of when pillars should be killed or rotated, no treatment of pillar-cannibalization risk. The "most content can live under `/blog`" note undercuts the pillar concept — if you're not building dedicated pillar pages, what makes a pillar different from a tag?

And then there's the headless CMS reference. Tucked at the bottom of the skill, there's a link to a headless CMS guide covering Sanity, Contentful, and Strapi — CMS selection and content modeling for marketing. This is completely unrelated to content-strategy ideation and feels stitched in because the author had a reference file they wanted to surface. It doesn't belong here.

## Where it helps, where it hurts

**Best-case scenario:** A marketing team has just completed a round of customer interviews, has access to keyword data (Ahrefs/SEMrush/GSC exports), and has call transcripts from sales. They want an agent to synthesize all of this into a prioritized content roadmap. The skill's ideation sources section gives the agent a clear protocol for each data type — extract questions from transcripts, identify common themes from surveys, find content gaps from competitor analysis. The scoring template structures the output into something a marketing leader can defend to their CEO. This is where the skill shines: structured synthesis from multiple rich inputs.

**Worst-case scenario:** The user says "I don't know what to write about" but has no customer research, no keyword data, no competitor analysis, and no resource constraints defined. The agent will try the forum-research and competitor-analysis methods — which require web search, judgment, and qualitative analysis — and will produce a list of ideas that look plausible but are unmoored from business reality. The prioritization matrix requires numbers the user can't provide. The agent will either assign arbitrary scores (garbage in, garbage out) or stall asking for data the user doesn't have. The skill has no fallback for "I have no data, help me start from scratch."

Also: the skill's output format asks for content pillars, priority topics, and a topic cluster map — but doesn't address what happens when the strategy collides with production constraints. If the team can produce 2 articles a month, a 50-topic roadmap is a planning document, not a strategy. The skill conflates "what should exist" with "what should exist next."

## What it quietly assumes

1. **The user has substantial customer research already.** Call transcripts, survey responses, keyword exports, sales call notes — these are the inputs the skill's ideation methods require. Without them, the skill can only use forum research and public competitor analysis, which are its weakest signal sources. This assumption holds for mature content teams with established research practices. It fails for early-stage startups and solo marketers who haven't done systematic customer research.

2. **Content strategy lives in isolation from product strategy.** The skill mentions "align with your product/service" as a pillar criterion, but never asks what the product roadmap looks like, what features are launching, or what business objectives content should support beyond "traffic, leads, brand awareness." A real content strategy for a SaaS company ties to product launches, integration partnerships, and market positioning. This skill treats content strategy as an editorial exercise.

3. **Distribution is someone else's problem.** The searchable/shareable distinction is the only nod to distribution. There's no discussion of content promotion, repurposing, syndication, newsletter strategy, or social distribution channels. The skill assumes that if you publish good content, the "searchable" and "shareable" qualities will handle distribution — an assumption that breaks for most audiences.

4. **Content strategy = written content strategy.** Despite listing "video, audio" as possible formats, every ideation method and template output assumes blog posts, articles, and written content. There's no treatment of how to plan a video series, a podcast editorial calendar, or an infographic portfolio. This is a text-content strategy skill wearing a generalist label.

These assumptions are reasonable for a B2B SaaS content team with existing research infrastructure. They become progressively weaker the further you get from that context.

## What could go wrong

The risks are primarily quality and waste risks:

- **Over-investment in low-signal topics from forum research.** The forum-research method — searching Reddit for questions and frustrations — can surface real pain points, but it can also surface noise. An agent without domain expertise can't distinguish between a real customer pain point and a vocal minority complaint. The skill provides no signal-vs-noise filtering guidance. An agent could build an entire content strategy around Reddit grievances that don't represent the actual market.

- **Obsession with the scoring framework.** The weighted-scoring template feels scientific. It isn't — it's multiplying subjective guesses by arbitrary percentages. An agent could produce beautifully formatted score tables that look rigorous but encode all the user's biases and blind spots. The skill doesn't warn about false precision.

- **Pillar sprawl.** The pillar-and-cluster structure encourages the agent to identify 3-5 pillars and populate each with subtopics. Without a mechanism to limit scope, this can produce a 100-article roadmap that no team can execute. The skill provides no guidance on sequencing, resource-constraint adaptation, or culling.

- **The headless CMS reference is a distraction.** An agent might read the CMS guide and start recommending technology choices (Sanity vs. Contentful) as part of content strategy — which has nothing to do with the skill's stated purpose.

The user should review and validate all topic recommendations, especially those sourced from public forums. The scoring framework should be treated as a communication tool, not an analytical one.

## Bottom line

This skill's content-ideation methodology — particularly the source-by-source extraction protocols — is better than most content-strategy skills I've seen. The practical search operators, buyer-stage keyword modifiers, and structured output templates give an agent real scaffolding for the "what should we write" question. But the skill loses coherence in its second half: the pillar section is undercooked, the headless CMS reference is irrelevant, and the skill never addresses production constraints or distribution. Pick this skill if you need structured topic ideation from existing research inputs. Skip it if you need a full content strategy that includes production planning, distribution channels, or cross-functional alignment. The biggest risk is producing a beautiful, unexecutable content roadmap. The biggest benefit is the six-source ideation protocol, which will reliably surface ideas a human strategist would miss.

## Confidence: medium

The ideation methodology is clear and specific, but the pillar strategy section is vague, the headless CMS reference is unexplained, and the gap between "ideation framework" and "actual strategy" is large enough that I'm not confident the skill delivers what its description promises.
