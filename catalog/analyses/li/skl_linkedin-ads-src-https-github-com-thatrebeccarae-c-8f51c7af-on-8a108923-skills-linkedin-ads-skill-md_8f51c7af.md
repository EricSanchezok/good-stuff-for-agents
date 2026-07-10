---
schema_version: 1
skill_id: skl_linkedin-ads-src-https-github-com-thatrebeccarae-c-8f51c7af-on-8a108923-skills-linkedin-ads-skill-md_8f51c7af
source_hash: sha256:ef61823b43bb16ed198a99b09befba46ab035fd1
analysis_version: 1
confidence: high
updated_at: "2026-07-10T14:00:00.000Z"
---

# LinkedIn Ads

This is a B2B advertising platform reference card — it catalogs LinkedIn's campaign types, targeting dimensions, audience types, and benchmarks in a clean, skimmable format. It knows what LinkedIn's platform offers, but it makes almost no judgment calls about when to use what. Think of it as a well-organized cheat sheet for someone who already knows how to run LinkedIn ads but needs the specs handy.

## Why it matters

It doesn't matter much. This is the weakest of the four ad-platform skills in the thatrebeccarae collection. The contrast with the Facebook Ads skill — from the same author, in the same repo — is stark. Facebook Ads has nine hard rules with specific numerical thresholds. LinkedIn Ads has zero hard rules. Facebook Ads has a 10-step scored audit. LinkedIn Ads has a 5-step checklist where step 4 is "Insight Tag installed and firing" — that's not an audit step, it's a yes/no question.

The targeting reference tables are the most useful part. LinkedIn's professional targeting (job titles, seniority, company size, skills) is genuinely differentiated from other ad platforms, and the skill does a competent job cataloging what's available. The audience size guidelines per campaign type are also genuinely helpful — knowing that Message Ads need a minimum of 15,000 audience members while ABM lists work with 300 companies is the kind of platform-specific knowledge that saves someone from launching a doomed campaign.

But the rest is surface-level. "Video with captions (85% of LinkedIn video watched without sound)" is a stat that applies to every social platform. "Refresh creative every 4-6 weeks" is generic advice with no LinkedIn-specific rationale. The creative specs (1200x627, 15-30 second video) are useful but are just restating LinkedIn's own documentation.

## Where it helps, where it hurts

**Best case**: A B2B marketer who is about to launch their first LinkedIn campaign and needs a quick reference for audience sizes, what targeting dimensions are available, and which campaign types match which objectives. They know their buyer persona (e.g., VP of Engineering at 200-500 person SaaS companies) and just need the platform mechanics. The skill will save them 20 minutes of reading LinkedIn's help docs.

**Worst case**: Someone asks for a LinkedIn Ads audit with real money on the line. The skill's audit framework is so thin that it would produce analysis indistinguishable from generic advice. "Budget allocation matches business priorities" is not an audit finding — it's a restatement of the problem. The skill would confidently produce a five-point checklist that the user could have written themselves. If the user's account has a specific problem (audience overlap, Insight Tag misconfiguration, bidding strategy mismatch), this skill won't catch it.

The skill is also silent on search ads within LinkedIn — it covers Sponsored Content, Message Ads, and Lead Gen Forms but doesn't address LinkedIn's search advertising capabilities at all, which is a significant gap for B2B campaigns targeting specific job titles.

## What it quietly assumes

The skill assumes the user knows their target audience before they open LinkedIn Ads Manager. It can tell you how to target a VP of Marketing at a 500+ company, but it won't help you figure out if that's who you should be targeting. This is a reasonable assumption for a platform reference skill, but it means the skill is a tool-documentation layer, not a strategy layer.

It also assumes LinkedIn's high CPMs ($30-60 average) are acceptable to the user. There's no discussion of whether LinkedIn's premium pricing is justified for the user's specific business model. A startup founder who pays $50 per click for a $29/month SaaS product would get no warning from this skill.

The integration section claims the skill works with "google-ads" for cross-platform comparison, but the skill itself provides no methodology for that comparison — it just tags the relationship. The cross-platform value is aspirational, not operational.

## What could go wrong

The worst realistic outcome is wasted ad spend on LinkedIn's expensive platform because the skill provides no guardrails. LinkedIn's minimum CPMs are among the highest in digital advertising, and a small B2B company could burn through $5,000 in a week with poorly structured campaigns. The skill's benchmark table sets expectations ("CPC <$5 is good") but doesn't flag that many B2B verticals (SaaS, finance, enterprise tech) routinely see CPCs of $8-15 that are still profitable — the "poor" threshold could cause a user to kill a profitable campaign.

There are no tool-based risks — the skill can't interact with LinkedIn Campaign Manager. But the advice risk is real: the skill will recommend "3-4 fields max" on Lead Gen Forms without knowing whether those fields produce qualified leads for the specific business. A B2B enterprise company might need 6-7 fields to filter out unqualified submissions, and the skill's blanket rule would push them in the wrong direction.

## Bottom line

Skip it unless you need a LinkedIn Ads specs reference and nothing else is available. This is a competent but generic platform cheat sheet that you could replace with LinkedIn's own documentation and lose nothing. The biggest risk is false confidence — the skill looks comprehensive (eight tables!) but contains almost no judgment. The biggest benefit is the audience size guidelines, which are the one piece of non-obvious operational knowledge in the document. In a tight 100-skill catalog, this doesn't earn a spot — the B2B paid media slot would be better filled by a skill that actually helps diagnose and optimize campaigns, not just list platform features.

## Confidence: high

The artifact is complete and well-structured, and I understand LinkedIn Ads well enough to assess what's missing. The pattern is clear: a reference card, not a diagnostic or optimization skill.
