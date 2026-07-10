---
schema_version: 1
skill_id: skl_analytics-src-https-github-com-coreyhaines31-marke-8fd26ad3-aines-ef920698-skills-analytics-skill-md_8fd26ad3
source_hash: sha256:da39c1dc1586bc6cb06758e72426198493d00797
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T14:00:00.000Z"
---

# analytics

This is a competent reference card for analytics implementation fundamentals, structured as a checklist-rich guide that covers GA4, GTM, event naming conventions, UTM strategy, and privacy compliance. It reads like a well-organized internal wiki page for a marketing team that needs consistent tracking standards — useful as a shared reference, thin as a skill that drives agent behavior.

## Why it matters

It isn't special, and that's the honest verdict. You could swap this skill with any analytics implementation guide from a competent technical marketing blog and get roughly the same result. What it does well: the tracking plan framework (Event Name → Category → Properties → Trigger → Notes), the "Object-Action" naming convention, the UTM parameter table, and the validation checklist are all correct and practical. The GA4 and GTM code snippets (gtag event calls, dataLayer.push patterns) are syntactically accurate and would help an agent that needs to generate or review implementation code.

But everything here is common knowledge for anyone who's set up analytics once. The "Track for Decisions, Not Data" principle is good advice but it's advice, not actionable structure. The event library is referenced externally (`references/event-library.md`) rather than included, so the skill's core content is essentially a style guide with code snippets. There's no decision tree, no diagnostic workflow for "my events aren't firing," no platform-specific schema that would help an agent programmatically validate a GA4 configuration. The debugging section is a bullet list of things to check — correct, but too shallow to actually debug with.

The strongest moment is the tracking plan output format — it gives the agent a concrete deliverable template, which is exactly what a skill should do. But the rest is orientation material.

## Where it helps, where it hurts

**Best case:** A marketing team with developers handling implementation needs a consistent event naming standard and tracking plan template. The marketing manager asks an agent: "Audit our current GA4 setup and produce a tracking plan." The agent uses this skill to remember GA4 event structure, gtag syntax, UTM conventions, and the tracking plan output format. The result is a standards-compliant document that the dev team can implement. The skill shines as a standardization reference — it prevents different team members from inventing different naming conventions.

**Worst case:** An agent is asked "why aren't my GA4 events firing?" and loads this skill. It will recite the validation checklist (check trigger config, check GTM loaded, check for duplicate containers) but has no structured diagnostic procedure, no request/response validation patterns, no guidance on reading DebugView output, and no reference to the actual GA4 API or tag assistant protocol. The agent will produce a list of things to check that the user could have found in the GA4 docs themselves. The skill provides awareness of what to look for without the depth to actually look for it.

## What it quietly assumes

1. **Someone else handles the actual implementation.** This is the big one. The skill provides the *what* (event names, properties, naming conventions) and assumes a dev team or GTM specialist handles the *how*. If you're a solo marketer who needs to implement tracking yourself, this skill gives you the blueprint but not the construction manual. The gtag.js code snippets are illustrative, not implementable — they show `gtag('event', 'signup_completed', {...})` but don't walk through where to place that code, how to handle SPA navigation, or how to verify it's working in production. This assumption holds for enterprises with dedicated analytics engineering teams; it fails for small businesses and solo operators.

2. **GA4 and GTM are the default stack.** Mixpanel, Amplitude, and PostHog are mentioned in the tools table as alternatives but the entire content body assumes GA4/GTM. If you're on a different stack, the naming conventions and tracking plan format still work, but all implementation guidance is irrelevant.

3. **The external reference files exist and are loaded.** The skill references `references/event-library.md`, `references/ga4-implementation.md`, and `references/gtm-implementation.md`. Without these, the skill is an outline. The core content is ~8KB of mostly structural guidance; the operational depth lives in files the agent may or may not have access to.

4. **Cookie consent and privacy are already handled.** The privacy section is correct but brief — "Use consent mode," "IP anonymization," "Only collect what you need." In practice, consent mode implementation is the hardest part of GA4 setup and the skill gives it four bullet points. This is a dangerous shallow treatment of a complex compliance surface.

## What could go wrong

The primary risk is **PII leaking into analytics properties**. The skill says "Avoid PII in properties" as a best practice bullet, but never defines what constitutes PII in an analytics context (user email in a custom dimension, full name in a user property, unhashed identifiers). An agent following this skill could pass user emails as event properties without recognizing it as a compliance violation. This is a GDPR/CCPA enforcement risk that the skill waves at but doesn't prevent.

The secondary risk is **configuration drift**. The skill helps create a tracking plan but has no mechanism for keeping it synchronized with implementation. An agent could produce a tracking plan, the dev team implements it, and six months later nobody knows whether the plan matches production. The skill treats the tracking plan as a one-time deliverable rather than a living document.

For tools: if the agent can access GA4/GTM through the referenced CLIs, the worst realistic outcome from a misconfiguration is data loss — events silently stop recording and nobody notices for weeks because the skill has no monitoring or alerting guidance. The user should be present during implementation but doesn't need to be present for plan creation.

## Bottom line

I wouldn't pick this skill over a well-written GA4 implementation guide from Google's own documentation. It's a reasonable standardization reference for teams that already know what they're doing, but it's too shallow for a novice and too generic for an expert. In a tight catalog of 100 skills, this gets cut — the overlap with official documentation is too high and the unique value (the tracking plan output format) is a template, not a capability. Keep it if you need marketing analytics standardization for a multi-agent workflow; skip it if you need actual implementation help.

## Confidence: medium

I read the full 8KB source artifact. The skill is clear about what it covers, but I can't fully judge the depth of the external reference files (event-library.md, ga4-implementation.md, gtm-implementation.md) because they weren't provided. The core content is thin enough that my judgment would be high-confidence if limited to the main SKILL.md, but the skill's real value depends on those references, which I haven't seen.
