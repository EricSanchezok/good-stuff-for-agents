---
schema_version: 1
skill_id: skl_foundation-okr-writer-src-https-github-com-product-2bdfcc65-e5-skills-foundation-okr-writer-skill-md_2bdfcc65
source_hash: sha256:ab96529c008341297b64ef7dfa156d24925738e2
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:10:00+08:00"
---

# OKR Writer

This is a methodologically serious OKR coach disguised as a skill. It does not just generate OKR-shaped text — it enforces the outcome-over-output discipline that distinguishes real OKR practice from roadmap theater. The skill embeds a coherent intellectual tradition (Doerr, Wodtke, Cagan, Grove, Torres, Gothelf/Seiden) and uses it as a backbone for every interaction. If you run this skill on a feature list and the output still looks like a feature list, the skill has failed its own rubric.

## Why it matters

This is not a template filler. The distinguishing move is the **empowered-team diagnostic** — before drafting anything, the skill asks whether the team actually controls its own work. If the answer is "no, features are pre-committed," it does not refuse. Instead, it adds a Disclosure section that reframes the artifact as outcome-bets-on-pre-committed-work rather than genuine outcome ownership. This is rare in OKR tools — most either ignore the empowerment problem or reject the user. The skill also enforces a genuinely non-negotiable constraint list: no fabricated baselines, no compensation coupling, mandatory guardrail KRs for any optimization metric, and a hard refusal to let individual OKRs be the default. The quality audit rubric with explicit pass/risk/fail ratings per criterion turns every output into something reviewable, not just readable.

The weakness: the skill's value depends almost entirely on the agent running it having the judgment to apply the diagnostic honestly. A lazy agent could skip the empowerment diagnostic, paste feature names into KR slots, and produce something that passes the format contract but violates the spirit of every rule. The skill's guardrails are in the instructions, not in runtime enforcement — a determined user can route around them.

## Where it helps, where it hurts

**Best-case scenario**: A product team is heading into quarterly planning. They have a strategy doc and a rough feature list, but their "OKRs" from last quarter were basically roadmap items with metric-sounding names. You load this skill in Guided or Sustained Coach mode. The skill runs the empowerment diagnostic (they're mostly empowered), separates features into Initiatives, reframes velocity metrics into outcome KRs, adds a guardrail KR against customer satisfaction erosion, surfaces three open questions about measurement windows, and produces a set the team can defend in stakeholder review. The quality audit catches two anti-patterns the team wouldn't have spotted themselves.

**Worst-case scenario**: A stakeholder hands an agent a list of 14 "OKRs" for an individual contributor's performance review and says "fix these." The skill's constraint rules should trigger at least three refusals here (individual OKRs, compensation coupling, too many OKRs). But if the agent bypasses the instructions — or the user cherry-picks sections — the output becomes a polished version of a corrupt artifact. The user walks away with a well-formatted performance-review OKR document that the skill's own rules explicitly forbid, and the skill's name is on it. Another failure mode: the team has zero outcome signal (no baselines, no analytics, no measurement infrastructure), and the skill's honest placeholder marking ("recommended-to-measure," "not-enough-evidence") makes the output read like a confession of ignorance. That's actually correct behavior, but a team expecting magic will be disappointed.

## What it quietly assumes

The biggest hidden assumption is that the user **has or is willing to build measurement infrastructure**. The skill constantly asks for baselines, evidence sources, and indicator classes — but it never addresses the case where no measurement system exists and won't exist for two quarters. In that world, every KR gets marked "recommended-to-measure" and the artifact becomes a measurement wishlist rather than an OKR set worth committing to. This assumption holds in well-instrumented SaaS organizations (maybe 40% of real teams) and breaks hard in pre-PMF startups and legacy enterprise.

Another assumption: the user operates in a quarterly cadence with a strategy hierarchy the skill can reference. The skill wants parent OKRs, strategy pillars, or customer problems to anchor the Objectives. When none of those exist — and the user says "we just need team OKRs" — the skill has no fallback beyond asking once before drafting. The resulting Objectives float untethered.

The empowered-team diagnostic also assumes the user will answer honestly and the agent will care about the answer. In practice, "are features pre-committed?" is a politically sensitive question, and the diagnostic has no mechanism for detecting evasion.

Finally, the skill assumes the agent has enough context to make semantic judgments about KR quality. Detecting "Launch X" as a feature-delivery KR requires understanding that "Launch" is a task verb, not an outcome verb. An agent that pattern-matches naively will miss these.

## What could go wrong

The skill reads files (for context gathering) and writes text. No destructive tool risk. The real risk is **output trust contamination**: if the skill's name is on a document that violates its own constraint rules (compensation-linked OKRs, fabricated baselines, individual performance OKRs), the artifact gains credibility from the skill's methodological branding while being exactly the kind of document the skill was built to prevent. The user needs to read the output critically, not trust the skill's name as a quality guarantee.

A secondary risk: the skill's output contract includes a `source_of_truth` field that points to the real OKR tracker. If the user treats the skill's output as the canonical record instead, divergence between the markdown artifact and the live tracker becomes a source of alignment confusion across teams.

## Bottom line

This earns a spot in a tight catalog. It is the most methodologically coherent OKR skill I have read — most OKR "tools" are templates with metric placeholders, while this one encodes a real position on outcome-vs-output, empowerment, guardrails, and anti-patterns. The biggest benefit is the anti-pattern detection catalog: even if you only use Audit Only mode, it catches mistakes experienced practitioners make under deadline pressure. The biggest risk is trust contamination — the skill's brand can polish a bad document into looking reputable. Pick this over any generic OKR template skill. The closest alternative would be a human coach, not another skill.

## Confidence: high

I read the full 14-step instruction set, constraint rules, rubric, and anti-pattern catalog, and I understand the methodological lineage well enough to defend these judgments.
