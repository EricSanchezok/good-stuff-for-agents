---
schema_version: 1
skill_id: skl_discover-competitive-analysis-src-https-github-com-8688ef32-s-discover-competitive-analysis-skill-md_8688ef32
source_hash: sha256:b89c965f2ccd55d7528bbe3bfd4312268c0acd38
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T03:05:48+08:00"
---

# discover-competitive-analysis

A structured competitive analysis template that walks an agent through scoping, intelligence gathering, feature matrix building, 2x2 positioning mapping, and strategic recommendation generation for 3-5 competitors. It is a template-driven framework more than a tool—it tells the agent what to produce, in what format, and with what quality bar, but all the actual competitive intelligence work happens through the agent's own web research and reasoning capabilities.

## Why it matters

This skill's real strength is its operational completeness. It doesn't just say "analyze competitors"—it provides a 7-step workflow, a detailed output template with 11 mandatory sections, a quality checklist, a "when NOT to use" section that cross-references sibling skills, and explicit confidence-level documentation requirements. The "when NOT to use" section is unusually good: it routes the user to `discover-market-sizing` for TAM questions, `define-jtbd-canvas` for switching-behavior analysis, and `define-problem-statement` when the landscape is already mapped. That kind of internal skill topology is rare and genuinely useful.

However, the skill itself has no unique analytical method. The 2x2 positioning matrix, the feature comparison grid, the strengths-weaknesses deep dives—these are standard competitive analysis practices. What this skill offers is packaging, not novelty. If you have another competitive analysis skill that also covers feature matrices and positioning maps, the choice between them comes down to template quality and cross-skill routing, not analytical superiority.

## Where it helps, where it hurts

**Best-case scenario:** You're a PM entering a market you know exists but haven't formally mapped. You can name 3-5 competitors off the top of your head. You load this skill, and it forces structured thinking: it won't let you skip the confidence-level notations, it makes you fill every template section from Overview through Next Steps, and it pushes you to find genuine competitor strengths rather than dismissing them. The output is a document you can actually hand to a new team member or an executive as a market orientation artifact.

**Worst-case scenario:** You're analyzing an emerging category with no clear competitors, or a B2B niche where public information is genuinely sparse. The skill says to note "what you can verify vs. what you're inferring"—good advice—but it has no fallback strategy for when 80% of your intelligence is inference. The 3-5 competitor threshold and the template's expectations for pricing comparisons, feature matrices, and positioning maps all assume a mature, transparent market. In a genuinely opaque market, following this skill faithfully will produce a document full of "Unknown" cells and low-confidence notes, wasting time that would be better spent on primary research or direct customer interviews. The skill will not stop you—it will just produce weak output.

## What it quietly assumes

1. **Competitors have discoverable public information.** The entire intelligence-gathering step (websites, pricing pages, G2/Capterra reviews, press releases, job postings) assumes a market where competitors maintain a public web presence. This fails for defense contractors, stealth startups, Chinese B2B firms, and any market operating through personal relationships rather than public marketing. Reasonable for consumer SaaS; breaks catastrophically for relationship-driven B2B.

2. **The user already knows the competitive set.** The skill says "Identify 3-5 key competitors" but provides no method for discovering them. If the user doesn't know who the competitors are, this skill doesn't help them find out. The skill assumes competitor identification happens before loading.

3. **A 2x2 matrix is the right analytical frame.** Two dimensions on a positioning map is a simplifying assumption that works well for some markets (price vs. features) and badly for others (multi-dimensional B2B procurement where compliance, integration depth, SLAs, and geographical presence all matter independently). The skill doesn't acknowledge this limitation.

4. **The agent can and will do competent web research.** Every step from intelligence gathering to pricing comparison depends on the agent's ability to find and interpret public web pages. If the agent is lazy, hallucinates, or can't access paywalled content, the output collapses.

## What could go wrong

The primary tool risk is web research hallucination. The skill explicitly routes the agent to "websites, pricing pages, G2/Capterra reviews, press releases, job postings, and customer testimonials." An agent that fabricates or confidently misreads any of these sources will produce a professional-looking competitive analysis containing wrong facts. The confidence-level notation ("mark which conclusions are based on verified data vs. inference") is a safety valve, but it only works if the agent is honest. An overconfident agent will mark fabricated data as "verified."

The secondary risk is strategic misdirection. The skill produces "actionable strategic recommendations." If the underlying intelligence is wrong, those recommendations become a basis for real business decisions—pricing moves, positioning changes, build-vs-buy calls. The user should not be present during production but should absolutely review before acting. The skill does not warn about this.

## Bottom line

A well-structured, operationally complete competitive analysis template with unusually good cross-skill routing. It offers no analytical innovation—you could reconstruct it from any competitive analysis textbook—but the template completeness and quality checklist make it reliably useful for the common case of analyzing a mature, transparent market with known competitors. The biggest risk is that it produces confident-looking analysis from weak or fabricated web research with no built-in resistance. It earns a spot in a tight catalog if you need one competitive analysis skill in the product management domain; if you already have an equivalent, this one's value is in its cross-references, not its method.

## Confidence: medium

The source is complete and the skill's behavior is clear, but I cannot assess the quality of the template and example files it references without reading them—those are the real substance, and the SKILL.md is mostly routing instructions.
