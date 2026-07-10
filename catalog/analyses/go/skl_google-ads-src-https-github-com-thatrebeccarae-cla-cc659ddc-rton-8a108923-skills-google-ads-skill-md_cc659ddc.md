---
schema_version: 1
skill_id: skl_google-ads-src-https-github-com-thatrebeccarae-cla-cc659ddc-rton-8a108923-skills-google-ads-skill-md_cc659ddc
source_hash: sha256:e9b9ee62aa5fd345d55f59af2b66791a854d78ba
analysis_version: 1
confidence: high
updated_at: "2026-07-10T14:00:00.000Z"
---

# Google Ads

This is the most comprehensive ad-platform skill in the thatrebeccarae collection — covering Search, Shopping, Performance Max, Display, YouTube, Demand Gen, and App campaigns with a 74-check scored audit system, eight hard rules, and guidance spanning keyword strategy to consent mode compliance. It has genuine operational depth in two specific areas: Performance Max architecture and the hard rules that encode Google Ads-specific failure modes. But its breadth works against it — the skill tries to cover seven campaign types and ends up thin everywhere except PMax.

## Why it matters

The eight hard rules are the skill's backbone, and they're mostly good. "Never recommend Broad Match without Smart Bidding" is a rule that would prevent the most common Google Ads money-burning mistake. "3x Kill Rule: Flag any campaign/ad group with CPA >3x target for immediate pause or restructuring" is a specific, action-forcing threshold. "Consent Mode v2 required for any account serving EU/EEA traffic" is a compliance rule that many marketers don't know exists — this skill would catch it. "Brand and non-brand must be separated into distinct campaigns with independent budgets and bidding" is structurally correct and a frequent mistake when people consolidate too aggressively.

But the hard rules also reveal the skill's tension between being a general Google Ads reference and a specific diagnostic tool. The rule about "PMax must have brand exclusions when a brand Search campaign exists" is specific and correct. The rule about "Negative keyword lists required — minimum 3 themed lists (Competitor, Jobs, Free, Irrelevant)" is good hygiene but the categories are debatable — "Jobs" is good, "Free" is smarter than most people realize, but "Competitor" as a negative keyword strategy can sometimes suppress useful competitive conquest data.

The Performance Max section is where the skill actually earns its keep. The PMax-specific audit checklist — asset group organization by themes, audience signals not left empty, URL expansion settings reviewed, search themes added, brand exclusions applied, checking for cannibalization of standard Shopping/Search — hits all the real failure modes of PMax campaigns. PMax is Google's most opaque campaign type and the skill correctly treats it as something that needs active guardrails, not a set-and-forget solution.

The 74-check scored audit referenced at the bottom suggests a structured evaluation framework that would make this skill genuinely useful for systematic account diagnostics. But as with the Facebook Ads skill, the scoring logic lives in external files — the SKILL.md itself has the checklist count but not the checklist content.

## Where it helps, where it hurts

**Best case**: A mid-market ecommerce brand with a Google Ads account spending $10K+/month across Search, Shopping, and PMax, and performance is stagnating. The agent with this skill loaded can walk the 11-step audit workflow, cross-reference the benchmark table, flag campaigns violating the eight hard rules, and produce a PMax-specific diagnostic that addresses asset group quality, cannibalization, and audience signal gaps. The skill is genuinely useful for the question "should I use Target CPA or Target ROAS?" because it forces the conversation toward goal alignment and maturity assessment.

**Worst case**: A local business with a $500/month Google Ads budget asks for help. The skill will confidently recommend campaign structures and bid strategies that assume conversion volumes the account will never reach. Target ROAS bidding requires 15+ conversions in 30 days to work; the skill doesn't surface this prerequisite. The account structure diagram shows six campaign lines — a local business with $500/month can realistically run two, and the skill provides no guidance on which to cut. The sophistication that makes this skill valuable for mid-market accounts makes it actively harmful for small ones.

Also bad: someone asks about YouTube Ads strategy. The skill mentions YouTube exists (bumper, in-stream, discovery, shorts) in a table row and then never mentions it again. The benchmark table has a YouTube View Rate metric but the workflow and audit sections contain zero YouTube-specific diagnostics. The skill overpromises on coverage and underdelivers on depth outside of Search and PMax.

## What it quietly assumes

The skill assumes the account has enough conversion volume for Smart Bidding to function. This is the most dangerous hidden assumption, and it's buried. Target CPA, Target ROAS, and Maximize Conversions all require the algorithm to have data to optimize against. The skill recommends these strategies without ever mentioning minimum conversion thresholds. An agent could recommend Target ROAS to a user with 3 conversions/month and the resulting campaign would drift aimlessly.

It assumes the user is running a mix of Search, Shopping, and PMax. The account structure diagram and audit checklist treat this as the default. A lead-gen-only account with no products to sell, or a pure brand-awareness advertiser, would find half the audit workflow irrelevant but the skill provides no branching logic.

It assumes Google Ads terminology is understood. The skill throws around "RSA asset quality," "listing groups," "auction insights," "impression share losses (budget vs rank)" without definitions. A founder running their own Google Ads for the first time would hit a terminology wall on step one of the audit. This assumption holds for the skill's likely target audience (marketers) but cuts off a significant segment of potential users.

The PMax section assumes the user has video assets. "All asset types provided (text, image, video, logo)" is listed as a checklist item, but video production is a significant bottleneck for many advertisers. The skill flags missing video as an audit finding but doesn't address the "what if I can't produce video" scenario.

## What could go wrong

The most dangerous recommendation latent in this skill is applying Performance Max without adequate guardrails. PMax will happily spend $5,000 on brand terms that would have cost $500 in a dedicated brand Search campaign. The skill correctly flags this (brand exclusions, cannibalization check), but only if the agent applies every checklist item. A shallow read of the skill — "run a Performance Max campaign, here's the structure" — would skip the guardrails and produce a campaign that inflates costs.

The "3x Kill Rule" carries its own risk. A campaign with CPA 3.1x target that's generating high-quality leads might be killed prematurely because the skill's rule is mechanical, not judgment-based. The skill encodes a threshold without encoding the override logic.

The Consent Mode v2 requirement is technically correct for EU/EEA traffic but implementing it incorrectly can break conversion tracking entirely. The skill says it's required but provides no implementation guidance or warning about the tracking disruption risk during setup.

No tool-based risks — the skill can't access Google Ads or modify campaigns. The user must be present to validate any budget, bidding, or structural recommendations before implementing them.

## Bottom line

Pick this skill for PMax architecture and hard-rule enforcement on accounts with real spend. It is the second-best ad-platform skill in this collection after Facebook Ads, and its PMax depth is genuinely useful given how many advertisers are struggling with that campaign type. Skip it for YouTube, Display, or small-budget accounts. The biggest risk is applying mid-market advice to small accounts that can't support it. The biggest benefit is the hard rules, which encode specific failure modes that would take months of wasted spend to learn through trial and error. In a 100-skill catalog, this earns a spot — the PMax section alone justifies it, and the rest is at least competent if you know which parts to ignore.

## Confidence: high

The artifact is comprehensive and I understand Google Ads at a depth that lets me identify where the skill is strong (PMax, hard rules) and where it's superficial (YouTube, Display, Demand Gen). The author clearly has hands-on Google Ads experience, and the skill's strengths and weaknesses are consistent with someone who knows Search and PMax well but filled in the rest from documentation.
