---
schema_version: 1
skill_id: skl_landing-page-optimizer-src-https-github-com-thatre-54953ce6-3-skills-landing-page-optimizer-skill-md_54953ce6
source_hash: sha256:3dc5a9dd71a4dab080c8f3a3dbb86caa3520664a
analysis_version: 1
confidence: high
updated_at: "2026-07-10T14:00:00.000Z"
---

# Landing Page Optimizer

This is a landing page audit checklist masquerading as an optimization skill. It covers the standard CRO checklist — above-the-fold design, value proposition hierarchy, CTA optimization, social proof placement, form design, mobile considerations — with competent pattern catalogs and conversion benchmarks. But it has no diagnostic methodology, no testing framework, and no decision logic. It tells you what good landing pages look like, not how to figure out what's wrong with yours.

## Why it matters

The skill's structural strength is its pattern catalogs. The hero layout table (left copy/right visual, centered hero, video hero, social proof hero, split test) gives an agent recognizable templates to compare against. The social proof patterns table with placement recommendations is specific and operational — "customer logos below hero" for B2B trust versus "metric near headline" for scale proof. The CTA section is the strongest individual component: "Action verb + specific outcome" with the example of "Start Free Trial" over "Submit" is the kind of concrete before/after that changes copy.

But pattern catalogs are not optimization skills. The skill has no diagnostic flow. If a user says "my landing page converts at 1.5%," the skill can't ask the right follow-up questions because it has no decision tree. It can list all the things a good landing page should have, but it can't determine which of those things is the binding constraint on this specific page. This is the difference between a checklist and a skill — a checklist tells you what exists, a skill tells you what matters.

The anti-patterns section is useful but shallow. "No navigation on landing pages — remove nav for paid traffic pages" is a real rule that most marketers violate. "Feature-focused headline — lead with benefit, not feature" is correct but so generic it could come from any CRO blog post from 2016. The most interesting anti-pattern — "every 100ms delay costs 1% conversion" — is cited without any tooling guidance for how to measure or fix it.

The integration section helpfully defers to the sibling skills: cro-auditor for broader CRO framework, ab-testing-framework for testing, copywriting-frameworks for copy, and technical-seo-audit for speed. This is honest about scope but also reveals that the skill itself doesn't close the loop — you need three other skills to actually implement anything this one recommends.

## Where it helps, where it hurts

**Best case**: A non-marketer — a founder, developer, or product person — has built a landing page themselves and knows it's not converting but doesn't know why. They can paste the page content or describe the layout to the agent, and this skill will produce a structured audit comparing every section against best-practice patterns. The agent will flag a headline that describes the product instead of the outcome, a CTA button that says "Submit" instead of an action verb, a form with 11 fields, and a hero section with a stock photo. The user walks away with 8-12 concrete changes to make, and most of them will actually improve conversion.

**Worst case**: A conversion rate optimizer asks the agent to "optimize my landing page" and expects a testing plan. The skill has no testing methodology, no hypothesis framework, no prioritization logic, and no statistical guidance. It will produce the same pattern catalog output regardless of the page's actual performance data. A page converting at 8% with room to reach 12% gets the same recommendations as a page converting at 0.5%. The skill doesn't know the difference because it has no data-driven diagnostic layer — it's doing pattern matching, not optimization.

Also problematic: the skill will flag a landing page with navigation and recommend removing it, even if the page is an organic homepage that serves a dual purpose. The "no navigation" rule applies to paid-traffic landing pages specifically, but the skill's checklist presentation makes it look like a universal rule. An agent applying it mechanically would recommend stripping navigation from a SaaS homepage.

## What it quietly assumes

The skill assumes the user can see their landing page — either as a live URL or as design mockups. It has no mechanism for evaluating pages described from memory or reconstructed from analytics data. This is reasonable for an audit skill, but it means the skill is useless for "my landing page converts at 2% and I can't figure out why" without visual access.

It assumes the conversion action is a form submission. The form optimization section is detailed (inline validation, multi-step forms, autofill attributes) but the entire skill treats "conversion = submit a form" as the implicit model. Ecommerce product pages, app download pages, and phone-call conversion pages are acknowledged in the benchmarks table but get no structural guidance.

It assumes the user has the authority to change the landing page. This holds for founders and marketing leads but breaks for agencies doing audits for clients — the skill produces recommendations without implementation prioritization or effort estimates.

The anti-pattern "60%+ traffic is mobile" is stated as fact. For B2B SaaS, mobile traffic is often 20-30%. For ecommerce, it's typically 60-70%. The skill applies a consumer-behavior assumption universally.

## What could go wrong

The skill could recommend removing social proof that's actually working because the pattern catalog says "customer logos below hero" but the current page has logos mid-page and they test well there. The skill has no testing-based override — its defaults are stated as rules, not hypotheses.

The form optimization guidance ("every field removed increases completion 5-10%") could push someone to strip qualification fields that filter out bad leads. A B2B lead gen form that removes company size, budget range, and timeline fields will get higher completion rates and lower lead quality. The skill doesn't address the conversion rate vs. lead quality tradeoff at all.

The CTA optimization section says "high contrast to background" without noting that some brand color palettes don't have a high-contrast option that's on-brand. The skill will recommend a neon-orange CTA button on a brand that uses muted earth tones, and the recommendation will be correct for conversion and wrong for brand consistency. The skill provides no framework for resolving that tension.

No tool-based risks — the skill can't modify pages or run tests. The user must be present to validate recommendations, especially when the skill's pattern-based advice conflicts with brand constraints or existing test data.

## Bottom line

Pick this skill if you need a landing page audit checklist and you're not a CRO specialist — it will catch obvious problems (missing CTAs, weak headlines, form bloat) that genuinely improve conversion. Skip it if you need an actual optimization skill with testing methodology, data-driven diagnosis, or hypothesis prioritization. The biggest risk is treating pattern-matching output as optimization — it's an audit, not a strategy. The biggest benefit is the specific, operational guidance on CTAs, form design, and social proof placement that a non-specialist wouldn't produce on their own. In a 100-skill catalog, this doesn't earn a spot on its own merits — it would need to be integrated with the ab-testing-framework and cro-auditor skills into a single, coherent CRO skill that goes from audit to hypothesis to test.

## Confidence: high

The artifact is complete and I understand landing page optimization well enough to distinguish a pattern catalog from a diagnostic methodology. The skill knows what good looks like but not how to get there from bad — and that's the whole game in CRO.
