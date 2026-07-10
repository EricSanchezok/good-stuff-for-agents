---
schema_version: 1
skill_id: skl_release-notes-src-https-github-com-phuryn-pm-skill-84baad73-execution-skills-release-notes-skill-md_84baad73
source_hash: sha256:148bf1cb176851d13531a54facc207824b22f493
analysis_version: 1
confidence: high
updated_at: "2026-07-10T13:46:00.000Z"
---

# release-notes

A structured translator that consumes technical source material — JIRA exports, Linear tickets, PRDs, git logs — and produces polished user-facing release notes categorized by change type. Its distinguishing feature is the user-benefit-first transformation: every entry leads with what changed for the user, not what changed in the codebase.

## Why it matters

Release notes generation is a commodity task, and this skill knows it. It doesn't try to be clever — it provides a clean categorization scheme (New Features, Improvements, Bug Fixes, Breaking Changes, Deprecations), a transformation rule (lead with benefit, use plain language, 1-3 sentences per entry), and concrete before/after examples that make the expectation unambiguous. The example transformations are the most valuable part: "Implemented Redis caching layer for dashboard API endpoints" becomes "Dashboards now load up to 3× faster, so you spend less time waiting and more time analyzing." This is the difference between telling an agent "write user-facing release notes" (which produces wildly inconsistent results) and showing it exactly what transformation looks like.

Against other release-notes tools, this is neither the most comprehensive nor the most automated — it's a prompted transformation, not an API integration. But the explicit before/after examples and tone-adjustment instructions (professional for B2B, friendly for consumer, developer-focused for APIs) make it more reliable than a bare prompt.

## Where it helps, where it hurts

**Best case**: A PM or engineering lead has exported two dozen Linear tickets at the end of a release cycle. The tickets contain technical descriptions, acceptance criteria, and internal notes. The skill reads them all, categorizes each, rewrites each as a user-benefit statement, and produces a release notes document that customers can actually read without an engineering degree. The tone adjustment ensures the output matches the product's voice. What would take a human 2-3 hours of rewriting takes the agent minutes.

**Worst case**: The only available source material is git commit messages — terse, technical, and written for other developers. Commit messages like "fix: resolve N+1 query in dashboard endpoint" or "refactor: extract auth middleware" contain zero user-benefit context. The skill's instruction to "lead with user benefit" forces the agent to invent benefits. The result: release notes that sound polished but are semantically fabricated. "fix: resolve N+1 query in dashboard endpoint" becomes "Dashboards load faster" when the actual fix might have had negligible user-facing impact. The output creates false expectations and erodes the trust that release notes are supposed to build.

## What it quietly assumes

The skill assumes source material contains enough semantic richness to extract user benefit. It works with PRDs and well-written tickets. It fails with sparse bug trackers, git logs, and tickets written as one-liners by engineers who assume everyone knows the context. This assumption holds for maybe 50% of real-world release-note source material — teams with good PM hygiene succeed; teams without it get fabricated notes.

It assumes the agent can determine the product's audience and voice from context or web search. For public consumer products, this works. For internal tools, B2B products with private documentation, or products in regulated industries with compliance requirements for release communication, the agent is guessing.

It assumes discrete versioned releases. Teams doing continuous deployment don't have clean "release X.Y" boundaries to hang notes on. The versioning header format (`[Product Name] — [Version / Date]`) assumes a release cadence that not every team has.

## What could go wrong

Web search for product understanding is the only tool call beyond file reading/writing. For internal tools, this returns nothing useful. For public products, it might pull in outdated marketing pages or competitor information that misleads the agent about the product's actual features and audience.

The real risk is user-facing communication containing factual errors. A release note that says "you can now export reports to CSV" when the feature actually exports to XLSX is a minor embarrassment. A release note that claims "50% faster load times" based on the agent's invention is a credibility problem. Release notes are published to customers — they're one of the few PM artifacts with external visibility, and errors have reputational consequences.

The skill provides no verification step. It instructs the agent to write and save, never to validate the claims against the source material or flag entries where user benefit couldn't be reliably determined.

## Bottom line

A solid, unremarkable utility skill. I would pick it when I need consistently formatted, user-facing release notes from ticket data — the before/after examples genuinely improve reliability over a bare prompt. The single biggest risk is fabricated user benefits from thin source material; the skill should include a "flag if uncertain" instruction but doesn't. The biggest benefit is the categorization scheme with tone guidance, which eliminates the most common release-notes failure mode (writing for engineers rather than users). It earns a catalog spot because "write release notes from tickets" is a recurring PM task and the explicit transformation examples set a quality floor most general prompts won't hit.

## Confidence: high

The source is short, explicit, and the domain is clear. The before/after examples leave no ambiguity about what the skill expects.
