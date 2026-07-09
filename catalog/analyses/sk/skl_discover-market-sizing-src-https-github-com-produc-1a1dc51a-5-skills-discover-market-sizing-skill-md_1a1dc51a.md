---
schema_version: 1
skill_id: skl_discover-market-sizing-src-https-github-com-produc-1a1dc51a-5-skills-discover-market-sizing-skill-md_1a1dc51a
source_hash: sha256:c639998da5d41436ec8d46a9e6f88994738353a1
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:06:02+08:00"
---

# Market Sizing

This is not a "give me TAM/SAM/SOM" prompt. It is a structured market-sizing meta-analysis engine built around one genuinely unusual principle: epistemic discipline. Every dollar figure must trace to a cited public source, an explicitly stated assumption with rationale, or a sensitivity range showing bounds. Hand-wavy guesses are called out as a P0 anti-pattern. The skill runs multiple frameworks (top-down, bottom-up, comparable company, analogous market), compares where they converge and diverge, and refuses to produce unbounded fabrications under five specific refusal protocols. If you have ever seen an agent confidently invent market numbers from vague web search snippets, this skill is the antidote.

## Why it matters

Most market-sizing prompts produce a single top-down TAM/SAM/SOM table with weak sourcing and call it done. This skill does the opposite. It demands multi-framework comparison and treats divergence between frameworks as *signal*, not noise — "divergence between frameworks is often the most valuable finding." The refusal protocols are the skill's sharpest edge: it will refuse to produce numbers under five specific failure modes (no inputs, ambiguous scope, demands for a single definitive number, hand-wavy sources, misuse of TAM as revenue projection). That level of self-restraint in a skill definition is rare and valuable.

The quick-estimate mode is a smart concession to reality — when someone needs a board-slide number without primary sources, the skill accepts user-provided assumptions instead of refusing, but widens sensitivity bands and labels everything Low/Medium confidence. This prevents the skill from being useless in high-pressure, thin-data situations without compromising its integrity.

The source-calibrated confidence taxonomy (High = government filings/10-K, Medium = Gartner/IDC/Forrester, Low = uncited blog posts) is concrete enough to be applied consistently. Most skills that mention "confidence" never tell you how to assign it.

## Where it helps, where it hurts

**Best case:** You are building an investment case or go/no-go deck and need a defensible market sizing artifact that will survive scrutiny from a CFO, an investor, or an adversarial reviewer. You have at least one industry report or reasonable unit-economic assumptions to anchor from. The multi-framework synthesis will surface what different approaches say — and the places they disagree will tell you more about the opportunity than any single number. Load this before you write the slide deck, not after.

**Worst case:** You don't actually need market sizing — you need rapid opportunity filtering or competitive positioning, and you mistake this skill for a general-purpose strategy engine. You'll burn cycles running three frameworks, producing nine sections of analysis, when all you needed was `define-prioritization-framework` or `discover-competitive-analysis`. Also: if your market cannot be captured by the four provided patterns (B2B SaaS, consumer subscription, marketplace, quick estimate), you're on your own — there's no guidance for enterprise hardware, professional services, or mixed business models. The skill won't break, but it won't help structure the analysis either.

## What it quietly assumes

**The agent has web search/fetch capability and is willing to use it.** The skill tells the agent to "proactively fetch" missing data and to use web search to verify source figures. If the agent environment blocks web access, the skill degrades into pure quick-estimate mode with nothing but user assumptions — which it will do, but the output will be thin.

**The user understands TAM/SAM/SOM concepts at least cursorily.** The skill defines them but doesn't teach them from scratch. A user who doesn't know why SAM is a filtered subset of TAM will struggle to evaluate the output critically.

**External market data is findable and citable.** In practice, market data for niche categories (e.g., "the market for AI-powered dental imaging tools in Southeast Asia") is often paywalled, nonexistent, or so stale as to be useless. The skill says to flag low-confidence results, but doesn't address the "this market is genuinely too niche to have analyst coverage" scenario.

**The agent can judge source quality.** Assigning High/Medium/Low confidence to sources requires the agent to distinguish a legit Gartner report from a content-marketing blog that *cites* Gartner. The taxonomy helps, but the judgment call is non-trivial, especially with web search results where provenance is murky.

**The four sizing patterns cover the domain.** B2B SaaS, consumer subscription, marketplace, and quick-estimate. These cover a lot but not everything. If you're sizing a hardware business, a services firm, or an ad-supported media product, the skill provides no structural guidance.

The assumptions about source availability and agent judgment are the riskiest — they hold in maybe 70% of real situations for mainstream categories and drop sharply for niche or emerging markets.

## What could go wrong

**Read-only tools (web search, web fetch) are the only external surface, so there is no destructive risk.** The real risk is epistemic: the agent produces a polished, multi-framework analysis with Medium-confidence labels that *feels* rigorous but is built on a single uncited blog post the agent misidentified as an industry report. The user trusts the artifact, presents it to an investor, and gets demolished in Q&A. The skill's source-calibrated confidence system mitigates this — *if* the agent applies it correctly — but the mitigation is only as good as the agent's source-classification judgment.

A secondary risk: the agent confuses the quick-estimate mode with full mode, accepts the user's rough assumptions without pushing back, and labels everything Medium when it should be Low. The format is long enough (nine sections) that a lazy reader might skim and miss the confidence labels.

The user does not need to be present during generation, but should absolutely review the assumptions list before sharing the output externally.

## Bottom line

This is the most rigorous PM market-sizing skill definition I have seen. The five refusal protocols, multi-framework synthesis with convergence/divergence analysis, source-calibrated confidence, and quick-estimate escape hatch together form a coherent philosophy: produce defensible numbers or refuse to produce anything. It earns a spot in a tight catalog — not because market sizing is novel, but because this skill's epistemic discipline is genuinely unusual. Biggest benefit: it will refuse to lie to you. Biggest risk: the agent's source-quality judgment may not be as good as the skill assumes.

## Confidence: high

I read the full source in detail. The skill is systematic, internally consistent, and its refusal protocols and confidence taxonomy are concrete enough to evaluate. I would defend these judgments to the author.
