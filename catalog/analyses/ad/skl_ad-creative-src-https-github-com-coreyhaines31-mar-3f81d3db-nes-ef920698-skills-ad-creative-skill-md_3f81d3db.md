---
schema_version: 1
skill_id: skl_ad-creative-src-https-github-com-coreyhaines31-mar-3f81d3db-nes-ef920698-skills-ad-creative-skill-md_3f81d3db
source_hash: sha256:5db90f3162a580319159976a03815f89745f258a
analysis_version: 1
confidence: high
updated_at: "2026-07-10T14:00:00.000Z"
---

# ad-creative

This is the most operationally sophisticated skill in the marketingskills collection. It's a production-grade ad copy generator that spans three modes — from-scratch generation, performance-data-driven iteration, and scaled static batch production — with platform specs hardcoded as guardrails and a grounded-inputs discipline that is its real differentiator.

## Why it matters

Most "ad copy" skills are thin prompt wrappers: "write me some headlines" with no constraints, no specs, no feedback loop. This one stands apart on three dimensions. First, it bakes platform character limits into its process as non-negotiable validation gates, which prevents the most common AI ad-generation failure mode (truncated or rejected copy). Second, its grounded-inputs system — requiring a corpus of winning ads, reviews, and comments before generating — is the kind of operational discipline that separates production ad teams from amateurs. Third, it ships with an actual 15-template static ad library, video ad production references covering iOS-native reveal formats and faceless motion video, and a full pipeline from concept to batch output. This is not a skill someone wrote in an afternoon; it reflects real growth-team operational patterns (the skill explicitly references Anthropic's own workflow of 100+ variations per cycle).

The weakness is that this sophistication creates a steep loading cost. The skill file alone is ~19KB. The three reference files (static-ad-templates, imessage-video-ads, motion-video-ads) and the generative-tools reference are external dependencies the agent must fetch. If you just need three headline variations for a Google RSA, this skill is like renting a printing press to write a Post-it note.

## Where it helps, where it hurts

**Best case:** You're running a DTC brand or SaaS growth team producing 20-50 static ad concepts per batch on a recurring cadence. You have a corpus of winning ads, customer reviews, and ad comments to feed in. You need diversity across 15 template types, not just copy variations, and you need every concept to trace back to real customer language or proven hooks. The grounded-inputs system combined with the template library and batch output format is purpose-built for this scenario. The skill will produce concepts that feel meaningfully different from each other (because the templates force structural variety), and the grounding discipline prevents it from hallucinating claims or recycling generic ad copy.

**Worst case:** A founder asks "write me some Facebook ads" and provides nothing but a URL and a one-line value prop. The skill will ask for winning ads, reviews, comments, brand assets, platform specs, compliance notes, and performance data. When none of that exists, it falls back to Mode 1 (from-scratch generation), which is its weakest mode — the output will be competent but indistinguishable from any general-purpose LLM's ad copy. The grounded-inputs system is a guardrail that becomes a blocker if you don't have the inputs. In this scenario, the skill wastes time gathering context it can't use and produces no better results than a simpler skill or a well-crafted single prompt.

## What it quietly assumes

Big assumptions, listed from most to least dangerous:

1. **You have a corpus of real performance data and customer language.** The grounded-inputs system requires 10-20 winning ad screenshots, 50-100 reviews, and ad comments. If you're a pre-launch startup or a company that hasn't run ads before, this is impossible. The skill says to "stop and ask the user to populate it before generating" — but if you're looking at this skill because you don't have creative yet, this becomes a chicken-and-egg problem. This assumption holds for maybe 30% of prospective users.

2. **You have access to video/image generation tools (Nano Banana Pro, Veo, Kling, ElevenLabs, etc.).** The static and video ad production references assume you can generate visuals. If you can only produce copy, half the skill's surface area is irrelevant. This assumption is stated but the skill makes no fallback accommodation for text-only workflows.

3. **You're running ads at sufficient scale to need 50-concept batches.** The batch generation workflow and iteration log are designed for teams generating 100+ variations. A small business testing 5 ads a month gets overhead from this skill, not leverage.

4. **You're on Google/Meta/LinkedIn/TikTok/Twitter.** Platform specs cover these five. If you're on Snapchat, Pinterest, Reddit, Bing, or programmatic display, you get no spec validation — and platform spec breaches are the skill's primary failure-prevention mechanism.

5. **The agent has access to the ad platform CLI tools referenced** (google-ads, meta-ads, linkedin-ads, tiktok-ads). These are referenced in the tool integrations section with specific commands, but the skill has no fallback for agents that can't run these CLIs. The performance-data iteration loop assumes you can `google-ads reports get` and get structured output. For most agents, this won't work — they'll need the user to paste CSV or screenshots.

## What could go wrong

The primary risk is **generating ad copy that violates platform policies**. The skill validates character counts but does not enforce platform content policies — claims that would get rejected by Google's ad review (unsubstantiated superlatives, restricted category claims) pass through uncaught because the skill can't verify them against policy databases. An agent could generate a headline like "The #1 Project Management Tool" and it would pass the 30-char check but get rejected by Google if you can't substantiate "#1."

The secondary risk is **hallucinated claims from ungrounded generation**. When operating in Mode 1 (from scratch) without inputs, the skill has no mechanism to prevent the LLM from inventing statistics, testimonials, or competitor comparisons. The grounded-inputs discipline prevents this in Mode 3, but Mode 1 has no equivalent guardrail. The skill acknowledges this in the grounding section but provides no mitigation for the from-scratch path.

For tools: the CLIs referenced (google-ads, meta-ads) would read campaign and performance data. The worst outcome from a misread is generating iterations based on wrong performance signals — optimizing toward a metric that looks good because of small sample size or seasonal noise. The user should review performance data interpretation before approving batch generation.

The user does not need to be present during generation but should review output before upload. No destructive tool risk exists (this skill only produces text and structured data).

## Bottom line

This is the strongest ad creative skill I've seen — and I'd pick it over alternatives for anyone running paid ads at scale with existing performance history. The grounded-inputs system, template library, and platform-spec validation are real operational advantages. The biggest risk is that it's overbuilt for small-scale users who need quick copy and underbuilt on policy validation for regulated industries. If the catalog could only keep 100 skills, this one earns a spot — not because ad copy is rare, but because operational production discipline at this level of detail is genuinely scarce in skill form.

## Confidence: high

I read the full 19KB source artifact including all platform spec tables, the grounded-inputs discipline, the three-mode architecture, and the batch workflow. The skill's operational patterns are explicit enough that I can judge where it delivers value and where it creates overhead. I would defend these judgments to the author.
