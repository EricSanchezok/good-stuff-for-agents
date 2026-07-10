---
schema_version: 1
skill_id: skl_aso-src-https-github-com-coreyhaines31-marketingsk-17e1bd35-orey-haines-ef920698-skills-aso-skill-md_17e1bd35
source_hash: sha256:bd699a13e3d245b72bda63337ed0406f459774fe
analysis_version: 1
confidence: high
updated_at: "2026-07-10T14:00:00.000Z"
---

# aso

This is a structured ASO audit skill that walks an agent through fetching an App Store or Google Play listing, scoring it across six weighted dimensions, adjusting scores for brand maturity, and producing a prioritized action plan. It's the most rigorously procedural skill in the marketingskills set — closer to an audit checklist with a grading rubric than a creative skill — and its quality hinges on whether the agent can actually fetch live listing data.

## Why it matters

The brand maturity tier system is genuinely clever and not something I've seen in other ASO tools. Before scoring, the skill classifies apps as Dominant (Instagram, Uber), Established (Notion, Duolingo), or Challenger (most apps), then adjusts scoring criteria accordingly. A Dominant app using a brand-only title isn't penalized — the rubric recognizes it's a deliberate choice. A Challenger app gets textbook scoring. This prevents the most common ASO audit failure mode: telling a household-name app to "add keywords to your title." The tier system is thoughtfully documented with specific scoring adjustments for each dimension.

The platform knowledge is detailed and current. The Apple-vs-Google indexing comparison table, the note about Apple indexing screenshot captions since June 2025, the Custom Product Pages in organic search detail, the Android Vitals ranking impact thresholds — these are specific, dated market facts that suggest the author maintains this skill against platform changes. The Apple keyword field byte-vs-character distinction (critical for CJK/Arabic localizations) is the kind of detail most ASO guides miss.

The weakness is the dependency on live data fetching. The skill's Phase 1 tells the agent to use WebFetch to scrape listing pages, acknowledges that stores render client-side (so data may be incomplete), and falls back to asking the user to paste missing fields. This creates a fragile entry point — if WebFetch returns partial HTML, the agent scores dimensions based on incomplete data and produces a report with caveats. A false sense of thoroughness from partial data is worse than an honest surface-level scan.

## Where it helps, where it hurts

**Best case:** A mobile app founder or product manager shares their App Store URL and says "audit my listing" or "why aren't people downloading my app." They provide 2-3 competitor URLs. The agent follows the four-phase workflow: fetches the listing, classifies the app tier (almost certainly Challenger), runs the six-dimension scoring using the scoring criteria references, generates the report with specific actionable recommendations ("Change subtitle from 'Project Management App' to 'Project Management for Teams — 30 chars — captures the team use-case keyword'"), and delivers a prioritized action plan with quick wins separated from bigger efforts. The report is concrete enough that the founder can implement the top 3-5 changes that afternoon.

**Worst case:** The agent tries to fetch an App Store listing via WebFetch, gets an empty or partial response (client-side rendered content), and proceeds to score anyway. The resulting report has gaps marked "could not confirm" for half the fields, scores are unreliable because screenshot quality and caption text couldn't be assessed, and the user gets a report that says "fix these things" with a 30% error rate because the underlying data was missing. The skill acknowledges this limitation but provides no alternative data-fetching strategy — it just says "note gaps and work with what's available." Working with bad data produces bad recommendations.

## What it quietly assumes

1. **WebFetch or equivalent can extract listing content from app store pages.** This is a fragile assumption. Both Apple and Google app stores render heavily with JavaScript. A direct `curl` of an App Store URL often returns an empty shell. The skill nods at this ("stores render client-side") but doesn't provide a fallback strategy beyond "ask the user to paste missing fields." In practice, unless the agent has a real headless browser, Phase 1 will produce incomplete data for most listings.

2. **The agent can take screenshots and visually assess them.** Phase 1.5 requires screenshot capture of the listing page to assess icon quality, screenshot messaging, and preview video presence. If the agent has no browser or screenshot capability, the entire visual assets dimension (25% of the weighted score) becomes guesswork.

3. **The reference files (scoring-criteria.md, apple-specs.md, google-play-specs.md, benchmarks.md, report-template.md) are available and loaded.** The core SKILL.md is a process map; the scoring rubrics, platform specs, and report template all live in external references. Without them, the agent can follow the phases but can't produce scored output.

4. **The user knows whether their app is Dominant, Established, or Challenger.** The tier classification uses signals like "1M+ ratings" and "top-10 in category" that require data the agent may not have. For borderline cases (an app with 150K ratings — is that Established or high-Challenger?), the skill provides examples but no decision boundary.

5. **ASO is a meaningful growth lever for this app.** The skill assumes the app's problem is listing quality, not product-market fit, pricing, or distribution. A terrible app with a perfect ASO listing still fails. The skill has no mechanism to surface "your real problem isn't ASO" as a finding.

## What could go wrong

The primary risk is **recommending changes based on incomplete listing data**. If the agent can't fetch the Apple keyword field (which is hidden and not visible on the public listing page), it might recommend keyword changes without knowing what's already in the hidden field — potentially suggesting keywords that would be duplicates, which Apple explicitly penalizes. The skill warns about this ("Never repeat words across title/subtitle/keyword field") but can't verify compliance without App Store Connect access.

The secondary risk is **tier misclassification producing wrong recommendations**. If a Dominant app is misclassified as Challenger (unlikely but possible if the agent lacks rating count data), the skill would produce "textbook" scores penalizing deliberate brand choices — recommending keyword stuffing for Instagram's listing, for example. The tier adjustment system is only as good as the classification accuracy.

For tools: the WebFetch/browser operations are read-only and low risk. The worst realistic outcome is wasted time — the user implements ASO recommendations that don't improve downloads because the diagnosis was built on partial data. No destructive risk exists. The user benefits from being present during Phase 1 to provide listing screenshots, but the audit itself can run unattended.

## Bottom line

This is the ASO skill I'd pick over alternatives if the agent has reliable app-store data fetching capability. The brand maturity tier system, detailed platform knowledge, and structured scoring framework are real advantages over generic "optimize your app listing" prompts. The biggest risk is the data-fetching fragility — without reliable listing data extraction, the skill produces scored reports that look authoritative but rest on incomplete evidence. In a tight catalog of 100 skills, this could earn a spot if paired with a reliable store-scraping tool or if the catalog specifically needs mobile growth coverage. Without that pairing, it's a strong process attached to a weak data pipeline.

## Confidence: high

I read the full 15KB source including the brand maturity tier system, all six scoring dimensions with their weights, the Apple vs Google indexing comparison table, the platform-specific rules, and the four-phase workflow. I can confidently judge both the architectural strengths (tier adjustment, weighted scoring) and the operational weaknesses (WebFetch dependency, reference-file depth). I'd defend these judgments to the author.
