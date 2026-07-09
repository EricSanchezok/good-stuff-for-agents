---
schema_version: 1
skill_id: skl_google-ads-src-https-github-com-thatrebeccarae-cla-cc659ddc-rton-8a108923-skills-google-ads-skill-md_cc659ddc
source_hash: sha256:e9b9ee62aa5fd345d55f59af2b66791a854d78ba
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:05:25+08:00"
---

# Google Ads

This skill trains an agent to audit, build, and optimize Google Ads accounts across all campaign types: Search, Shopping, Performance Max, Display, Video, Demand Gen, and App. It covers bidding strategies, audience targeting, conversion tracking, and account structure. It also includes a hard-rules section — constraints the agent must never violate — and references a 74-check audit checklist for scored account health assessments.

## Why it matters

The hard-rules section is what separates this from a Wikipedia-level summary of Google Ads concepts. These rules encode practitioner judgment that would take a junior PPC manager months to learn: never recommend Broad Match without Smart Bidding, kill anything with CPA >3x target, always separate brand and non-brand into distinct campaigns, never PMax without brand exclusions when brand Search exists, always require Consent Mode v2 for EU/EEA traffic, and always recommend enhanced conversions. These aren't opinions — they're operational guardrails that prevent expensive mistakes. An agent following this skill will not recommend the most common Google Ads antipatterns. That alone gives it real value.

The campaign-audit workflow is thorough: 11 checkpoints from conversion tracking through competitive landscape, ordered in a sensible dependency chain (you verify tracking before auditing structure, because bad tracking makes all other metrics meaningless). The benchmark table gives the agent concrete thresholds for flagging issues — when an agent sees a 2.5% search CTR, it knows to flag it as below the "good" threshold rather than having to guess.

The PMax-specific audit checklist is another differentiator. PMax is Google's most opaque campaign type — it's easy to waste money on — and the checklist covers the specific failure modes (empty audience signals, missing brand exclusions, cannibalizing standard Shopping/Search). This is the kind of detail you only get from someone who's actually managed PMax campaigns at scale.

That said, the skill is reference-heavy rather than workflow-rich. The detailed audit checklist (74 checks), scoring system, and API references are all deferred to external files (`CHECKS.md`, `scoring-system.md`, `REFERENCE.md`) that aren't part of the analyzed source. The skill's actual executable surface is the 11-point audit workflow and the hard rules. Everything else is context the agent would need those separate files for.

## Where it helps, where it hurts

**Best-case scenario:** A performance marketer asks the agent to audit a live Google Ads account that's been running for 3+ months with conversion tracking in place. The agent follows the 11-point audit workflow, compares every metric against the benchmark table, applies the hard rules (checking for Broad Match without Smart Bidding, CPA >3x target, brand/non-brand mixing), and produces a prioritized recommendation list with expected revenue impact. The hard rules catch the expensive mistakes; the benchmark table flags underperformance. The user gets an audit that would cost $500-2,000 from a consultant.

**Worst-case scenario:** Someone asks "set up my first Google Ads campaign" with no existing account, no conversion tracking, and no historical data. The skill has account structure templates and bidding strategy descriptions, but it provides zero guidance on initial setup — no walkthroughs for creating conversion actions, installing Google Tag, setting up Merchant Center, or launching a first campaign. The skill assumes a *running* account. An agent asked to create from scratch would produce a structurally correct campaign blueprint with no execution path. Also: the skill references a 74-check scoring checklist and a scoring algorithm that exist in external files. If those files aren't loaded, the agent's audit is incomplete and can't produce the health score the skill promises.

Another failure mode: the skill's campaign-type coverage is broad but shallow for everything except Search and PMax. Video, Display, Demand Gen, and App campaigns get bullet-point mentions but no real guidance. An agent asked to "audit my YouTube ads" would be winging it after the first two video-specific checks.

## What it quietly assumes

1. **The Google Ads account already exists and has conversion tracking.** The entire audit workflow starts with "Verify Google Tag, conversion actions, enhanced conversions, attribution model." Without conversion tracking, every metric in the benchmark table is meaningless and the hard rules (which depend on CPA/ROAS targets) can't be applied. This assumption holds for established accounts. It fails for new advertisers.

2. **The agent has access to the live Google Ads interface or API.** The skill describes what to check but not how to access the data. In practice, an agent would need either Google Ads API credentials (with the right OAuth scopes), a Google Ads script, or the user manually pulling reports. The skill doesn't address data access at all — it operates as if the agent can just "see" the account. This is a significant implementation gap.

3. **The external scoring system and checklist files exist and are loadable.** The skill references `skills/shared/scoring-system.md` and `CHECKS.md` but these aren't part of the source. If they're missing or unreachable, the scored-audit feature is vapor. This is a packaging assumption, not a domain assumption, but it affects deliverability.

4. **The user understands Google Ads fundamentals.** The skill explains campaign types, bidding strategies, and audience options, but it doesn't teach concepts like impression share, Quality Score components, or how auction dynamics work. It assumes the user (or agent) already knows what CTR, CPA, and ROAS mean operationally. This is reasonable for a skill labeled "expert-level," but it means the skill is useless for beginners.

5. **The account is English-language, US/North America market.** Consent Mode v2 requirements are EU/EEA-specific, but no other regional or language considerations appear. Google Ads behaves differently in different markets — different competition levels, different available features, different regulatory constraints. The skill is implicitly US-centric.

These assumptions hold for a mid-market or enterprise advertiser with an established account and a dedicated PPC manager. They progressively break for new advertisers, small businesses, international accounts, and anyone without API access.

## What could go wrong

This skill is advisory, not executable — the agent can't change bids, pause campaigns, or modify conversion tracking through it. But bad advice can be expensive:

- **CPA >3x kill rule applied too aggressively.** The skill says to flag campaigns with CPA >3x target for "immediate pause or restructuring." But CPA can spike temporarily during learning phases, seasonal shifts, or after conversion-tracking changes. An agent robotically applying this rule could recommend pausing campaigns that would recover on their own. The rule is correct as a *flag* but dangerous as an *automatic action*.
- **PMax brand exclusions accidentally applied to the wrong campaign.** Brand exclusions in PMax are campaign-level settings. Applying them incorrectly can prevent PMax from serving on brand queries it should cover. This isn't a "delete all your data" risk but it can materially hurt performance.
- **Negative keyword list defaults causing over-blocking.** The skill mandates themed negative keyword lists (Competitor, Jobs, Free, Irrelevant). If the agent adds aggressive broad negatives like "free" to a non-brand Search campaign, it could block legitimate queries like "free trial [product]" — killing high-intent traffic. Negative keyword mistakes are silent killers because they just reduce impressions with no visible error.
- **Consent Mode v2 recommendation without implementation guidance.** Recommending Consent Mode v2 is correct but incomplete. Consent Mode v2 requires a consent management platform, proper tag configuration, and legal review of consent banners. An agent waving this recommendation without implementation context could create a false sense of compliance.

The user must review all recommendations before implementation. The agent should never be given direct API write access to a live Google Ads account based solely on this skill's guidance.

## Bottom line

This is a strong operational skill for Google Ads auditing, with practitioner-hardened hard rules and a benchmark-driven diagnostic framework that will catch expensive mistakes. The benchmark table and hard rules alone justify loading it for any Google Ads audit task. It earns its spot in a tight catalog because Google Ads is a high-stakes domain where bad advice costs real money, and this skill's guardrails prevent the most common and expensive mistakes. The biggest risk is that it's an audit skill masquerading as a full-platform skill — its setup, campaign-creation, and non-Search/PMax guidance is too thin to trust without supplementary expertise. The biggest benefit is the hard-rules section, which functions as a pre-flight safety checklist any agent should run before giving Google Ads advice.

## Confidence: high

The hard rules, benchmark thresholds, and audit workflow are specific, falsifiable, and reflect practitioner judgment. The gaps — no execution access discussion, reference-file dependency, and thin non-Search coverage — are clear from the source text and don't require guessing.
