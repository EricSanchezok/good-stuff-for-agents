---
schema_version: 1
skill_id: skl_cro-src-https-github-com-coreyhaines31-marketingsk-e9567f9f-orey-haines-ef920698-skills-cro-skill-md_e9567f9f
source_hash: sha256:74a2394f838e0f07a5a5f06eee99047b8a5adcd6
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T14:00:00.000Z"
---

# cro

This is a conversion rate optimization diagnostic checklist dressed as a skill. It provides a seven-dimension analysis framework (value proposition, headlines, CTAs, visual hierarchy, trust signals, objection handling, friction points) and page-specific sub-frameworks for homepages, landing pages, pricing pages, feature pages, and blog posts — all in ~6KB. It's light enough to load quickly and structured enough to produce action-oriented output, but it has the depth problem: everything it tells you to look for is correct, but it doesn't tell you how to find it.

## Why it matters

The CRO analysis framework is well-sequenced — it correctly orders dimensions by impact (value proposition clarity first, friction points last) and gives concrete checks for each. The "5-second test" for value proposition clarity ("Can a visitor understand what this is and why they should care within 5 seconds?") is a real heuristic, not filler. The CTA copy advice ("Weak: 'Submit,' 'Learn More' / Strong: 'Start Free Trial,' 'Get My Report'") is specific enough to be actionable. The output format (Quick Wins → High-Impact Changes → Test Ideas → Copy Alternatives) creates a natural prioritization ladder that makes sense for anyone who's done CRO work.

But this is a checklist, not a diagnostic system. It tells you *what to look at* but not *how to look*. "Is it written in the customer's language?" — yes, that matters, but the skill provides no method for determining whether the language reflects customer talk. "Do images support or distract from the message?" — absolutely, but the skill has no rubric for making that call. Every dimension is judgment-dependent, and the skill provides the judgment criteria without the judgment training.

The page-specific frameworks add minimal differentiation. The landing page guidance ("Single CTA, remove navigation if possible") is correct but it's one sentence. The pricing page section is three bullets. These feel like placeholders for content that was never written.

The strongest part is actually the form optimization reference (`references/form.md`), which is external — the core skill doesn't carry the operational depth.

## Where it helps, where it hurts

**Best case:** An experienced marketer who's done CRO before shares a landing page URL and says "this page isn't converting — audit it." The agent uses the framework as a structured lens, walking through each dimension, flagging specific issues ("Hero headline is feature-focused: says 'Enterprise-grade analytics' instead of the outcome visitors want"), and producing output in the four-tier format. The marketer reads it, nods at things they already suspected, and gets 2-3 new observations. The skill works as a second pair of eyes with a checklist — it doesn't discover insights the marketer couldn't find, but it ensures no dimension gets skipped.

**Worst case:** Someone who's never done CRO says "make my homepage convert better" without providing traffic data, heatmaps, user research, or even knowing their current conversion rate. The agent applies the framework and produces a report full of generic observations: "Consider making the headline more benefit-focused," "Add more trust signals near the CTA," "Reduce form field count." Every recommendation is directionally correct but none are specific enough to implement — "add more trust signals" doesn't say which ones, "reduce form field count" doesn't say which fields. The output reads like CRO advice from a blog post: true, but not tailored.

## What it quietly assumes

1. **You can see the page and assess it visually.** The framework assumes the agent has access to the page's rendered output — either through a browser or a screenshot. "Is the primary CTA visible without scrolling?" — can't answer that from HTML alone. "Is there enough white space?" — visual judgment that requires rendered output. If the agent only has a URL and no browser, half the framework is inoperable.

2. **You have traffic context and user behavior data.** The skill asks "Where are visitors coming from?" and suggests heatmaps, session recordings, and user research as inputs. If none of this exists, the analysis is surface-level — you're evaluating the page in a vacuum without understanding who sees it and what they want.

3. **Someone will run A/B tests on your recommendations.** The output format includes "Test Ideas" as a category, and the skill references the ab-testing skill. But the skill itself doesn't help design tests or interpret results — it assumes the test infrastructure and process exist separately.

4. **You know your current conversion rate and goal.** The task-specific questions ask for this, but the skill has no fallback behavior when it's unknown. Without a baseline, you can't tell if the CRO work moved the needle, and the agent can't prioritize recommendations by expected impact.

5. **The page is marketing-focused, not product-focused.** The page types covered (homepage, landing, pricing, feature, blog) are all marketing surfaces. If the conversion problem is in the product itself (confusing onboarding, paywall friction, in-app purchase flow), this skill has nothing to offer.

## What could go wrong

The primary risk is **producing advice that sounds specific but isn't.** "Add social proof near the CTA" is actionable enough to implement but not specific enough to work — add what social proof? Customer logos? A testimonial? A review score? The wrong choice could hurt conversion (a bland testimonial next to a strong CTA creates friction). The skill provides the what-to-check framework but not the how-to-decide, so the agent fills the gap with generic recommendations, and the user implements them at random.

The secondary risk is **optimizing the wrong thing because the framework doesn't validate page-audience fit.** If a page's primary traffic source is a cold paid ad but the page is written for warm organic visitors (or vice versa), the CRO framework might produce recommendations that are correct in isolation but wrong for the actual traffic. The skill asks about traffic sources but doesn't use that information to weight its analysis dimensions differently — message match with traffic source is mentioned for landing pages only.

For tools: if the agent can fetch and render the page, the only risk is visual misinterpretation (misreading a screenshot, missing a mobile breakpoint issue). No destructive tool risk. The user doesn't need to be present during analysis but should review recommendations before implementing.

## Bottom line

This is a competent but generic CRO skill. You could swap it with any well-structured CRO checklist and get roughly the same result. It earns its 6KB — the framework is correctly ordered, the output format is practical, and it won't produce wrong advice. But it won't produce surprising advice either. I'd pick it for quick page audits when you want structured output and don't need deep diagnostics. I'd skip it when you need page-specific, data-informed CRO that goes beyond "check these seven things." In a tight catalog of 100 skills, this gets cut — the CRO domain is real and important, but this skill doesn't add enough beyond a good prompt template to justify the slot.

## Confidence: medium

I read the full 6KB source including all seven analysis dimensions, the page-specific frameworks, the output format, and the task-specific questions. The skill is clear about what it covers, but I can't judge the depth of the external `references/experiments.md` and `references/form.md` files. The core content is thin — a framework that relies on agent judgment for every dimension — which limits how confident I can be about its operational value beyond what a well-structured CRO prompt would deliver.
