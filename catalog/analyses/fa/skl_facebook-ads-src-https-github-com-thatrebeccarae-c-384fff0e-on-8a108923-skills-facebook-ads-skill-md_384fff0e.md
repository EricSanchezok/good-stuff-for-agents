---
schema_version: 1
skill_id: skl_facebook-ads-src-https-github-com-thatrebeccarae-c-384fff0e-on-8a108923-skills-facebook-ads-skill-md_384fff0e
source_hash: sha256:85a43016790484e7ca564659dbcafab5f80c272b
analysis_version: 1
confidence: high
updated_at: "2026-07-10T14:00:00.000Z"
---

# Facebook Ads (Meta Ads)

This is a paid-media platform skill that teaches an agent how to audit, diagnose, structure, and recommend optimizations for Meta Ads campaigns across Facebook, Instagram, Messenger, and Audience Network. It is the strongest of the four ad-platform skills in the thatrebeccarae collection — the only one with hard operational rules, a scored audit framework, and genuine domain specificity that would be hard to replicate from an agent's training data alone.

## Why it matters

This skill stands out from its siblings (LinkedIn Ads, TikTok Ads, Google Ads) because it has teeth. The nine hard rules are not generic advice — they encode operational thresholds that would cause real monetary damage if violated. "Budget must be ≥5x target CPA per ad set" is not a style preference; it's a learning-phase constraint that directly controls whether Meta's algorithm can optimize at all. "Event Match Quality ≥8.0 for Purchase event. Below 6.0 is critical" is a specific number tied to a specific metric in a specific platform tool. This is the kind of detail that distinguishes a reference card from a competent skill.

The post-iOS 14.5 section is another differentiator. The author understands that browser-only tracking has lost 30-40% of conversion data and bakes CAPI (server-side) recommendations into the hard rules, not just the general guidance. The campaign structure diagram is opinionated and modern — it explicitly endorses consolidation over fragmentation and Advantage+ over manual targeting, which is the actual direction Meta has been pushing since 2023.

The skill also references a 46-check scored audit checklist and a shared scoring system. Those external files are not in the artifact itself, but the reference pattern suggests a structured evaluation workflow that goes beyond free-form advice.

## Where it helps, where it hurts

**Best case**: A marketer or business owner has a Meta Ads account that is spending real money — at least $1,000/month — and the performance is eroding but no one has done a systematic diagnosis. They can describe the symptoms (rising CPA, declining ROAS, high frequency) and the agent with this skill loaded can walk through the 10-step audit workflow, cross-reference against the benchmark table, and produce a prioritized action plan with specific numerical thresholds. The skill is genuinely useful for answering "my ROAS is declining — what should I investigate?" because the audit workflow has nine failure modes to check before arriving at a recommendation.

**Worst case**: Someone asks the agent to "create a Facebook Ads campaign" without providing an actual account to audit. The skill is almost entirely audit-and-diagnosis oriented. It has no campaign builder workflow, no ad copy generator templates, no creative brief framework. If you ask it to build something from scratch, it will give you the campaign structure diagram and say "good luck." The skill also assumes real-time or recent account data — if a user describes their account from memory with approximate numbers, the agent could confidently diagnose a "creative fatigue" problem that is actually a pixel misfire, or recommend Advantage+ for a small account that doesn't have the conversion volume to feed it.

The skill is also silent on budget minimums for different objectives. It will confidently recommend Advantage+ Shopping without checking whether the account has the 50+ conversions/week that Meta itself recommends for that campaign type.

## What it quietly assumes

First, the skill assumes the user has active access to a Meta Ads Manager account and can relay current metrics. This is reasonable for its intended audience — someone asking for an audit presumably has the account open — but it means the skill is useless for speculative or planning-stage questions.

Second, it assumes the user's business model is ecommerce or DTC. The campaign structure diagram is built around Shopping/Conversion campaigns with catalog sales. The benchmarks are ecommerce-focused (ROAS, not lead quality or pipeline velocity). A B2B advertiser using Facebook for lead gen will find the structure only partially applicable and the benchmarks misleading.

Third, it assumes the user understands Meta Ads terminology (CBO vs ABO, Advantage+, CAPI, AEM, DCO) without definition. The skill uses these terms as if they're common knowledge. For a junior marketer or a founder running their own ads, the term density would be intimidating. This assumption holds maybe 60% of the time for the target audience.

Fourth, and most subtly, it assumes the agent can read the referenced external scoring file (`skills/shared/scoring-system.md`) and the 46-check audit checklist (`CHECKS.md`). The SKILL.md itself contains no scoring logic — it outsources the quantitative audit to files that may or may not exist in the loaded context. If those references aren't available, the "Scored Audit" section is a broken promise.

## What could go wrong

The primary risk is confident misdiagnosis. The skill encodes specific failure thresholds — "CTR decline >20% over 14 days with frequency >3 = replace creative immediately." If the agent receives incomplete or misunderstood data and applies this rule mechanically, it could recommend scrapping creative that was actually performing fine, or missing a tracking issue that's the real root cause. The agent has no tool access to Meta Ads Manager — everything depends on the user accurately relaying data and the agent correctly parsing it.

The skill does not involve any tool-based side effects — it can't modify campaigns, pause ads, or change budgets. The worst outcome is bad advice that costs the user money they wouldn't have spent otherwise. The user does not need to be present for the agent to produce the analysis, but the user absolutely must validate any budget or structural recommendations before implementing them.

A subtler risk: the skill recommends "broad targeting" (no interests, no LALs, trust the pixel) as a modern best practice. This is correct for accounts with strong pixel data and high conversion volume, but catastrophic for small accounts or new pixel installs that have insufficient conversion history. The skill doesn't qualify this advice with a volume threshold.

## Bottom line

This is the best ad-platform skill in the thatrebeccarae collection and would be my first pick among the four if I could only keep one. The hard rules, the scored audit system, and the genuine domain specificity make it more than a reference sheet. The biggest risk is confident advice on insufficient data, and the biggest benefit is a structured diagnostic framework that catches problems most marketers miss. It earns a spot in a tight catalog — there are fewer high-quality Meta Ads skills than you'd expect, and this one has actual operational constraints baked in.

## Confidence: high

The artifact is complete, detailed, and internally consistent. I understand the Meta Ads domain well enough to judge its accuracy and completeness, and the author's post-iOS 14.5 guidance and modern campaign structure recommendations align with current platform best practices.
