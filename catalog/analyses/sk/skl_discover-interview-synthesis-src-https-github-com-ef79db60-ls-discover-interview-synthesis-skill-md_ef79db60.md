---
schema_version: 1
skill_id: skl_discover-interview-synthesis-src-https-github-com-ef79db60-ls-discover-interview-synthesis-skill-md_ef79db60
source_hash: sha256:0653f92366571161a5e2c53b8175a4cc51989127
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:10:00+08:00"
---

# Interview Synthesis

This skill takes raw interview data and produces structured, evidence-backed research findings: themes, quotes, insights, and recommendations. Its defining move is the distinction between observation ("users mentioned X") and insight ("users need Y because of Z"). That may sound obvious, but most interview summarizers stop at the observation level. This skill explicitly pushes synthesis one layer deeper: connect what you heard to why it matters for product decisions.

## Why it matters

The skill's value is in its discipline, not its novelty. Every product researcher knows you should identify themes across participants, extract quotes, and formulate recommendations. What makes this skill useful is that it bakes that discipline into a repeatable sequence with explicit quality gates: themes need 3+ participant support, quotes must be verbatim and attributed, insights must explain "why" not just "what," recommendations must tie to specific insights with confidence levels, and limitations must be acknowledged.

The When NOT to Use section is unusually helpful here — it redirects clearly: internal meeting summary → meeting-recap, survey data → survey-analysis, synthesized findings ready for framing → problem-statement, synthesized findings ready for journey mapping → journey-map. This creates a coherent workflow chain rather than a one-off tool.

That said, this is a well-executed but fundamentally generic research synthesis skill. If you have used any structured qualitative-analysis framework (thematic analysis, grounded theory lite, affinity mapping), you will recognize every step. The skill does not introduce a novel synthesis framework or challenge conventional practice. It is a competent, honest implementation of standard qualitative research synthesis — nothing more, nothing less.

## Where it helps, where it hurts

**Best-case scenario**: You just completed 8 user interviews for a product discovery effort. You have transcripts, notes, and a research objective. The raw data is rich but unstructured — patterns are visible to someone who reads everything but impossible for stakeholders to extract quickly. You load this skill, feed it all 8 transcripts, and it produces: (a) participant profiles so stakeholders can assess representativeness, (b) 4-6 themes each backed by 3+ participants with verbatim quotes, (c) insight statements that move from "they complained about onboarding" to "they abandon onboarding because the value proposition is invisible until step 4," (d) prioritized recommendations with confidence levels, and (e) explicit limitations ("we didn't interview any users who churned after 30 days, so our retention signal is thin"). A stakeholder reads this once and can participate in the ideation session without reading 8 hours of transcripts.

**Worst-case scenario**: You have only 2 interviews — below the skill's own 3+ participant threshold for theme identification. The skill says it needs at least 3, but if you proceed anyway, you get themes with dangerously thin support that look structurally identical to well-evidenced themes. A stakeholder scanning the document won't notice the participant count per theme unless they read every line. Two vocal participants shape the "insights" that drive a quarter of product work. The skill's quality checklist catches this ("Themes are supported by evidence from 3+ participants") but can't enforce it if the agent ignores the gate.

Another failure mode: verbatim quotes without participant context. The skill requires quotes attributed to participant IDs, but if those IDs don't map to the participant profiles (or if the profiles are too thin to assess representativeness), the quotes gain false authority. "P3 said 'this is unusable'" hits harder when you don't know P3 is the one participant who refused to read the instructions.

## What it quietly assumes

The skill assumes the agent can reliably **distinguish observation from interpretation**. The insight step says "transform themes into insight statements" with the formula "users need Y because of Z." This requires inferential reasoning — connecting what was said to what it means for product design. An agent that over-interprets will present speculation as insight; an agent that under-interprets will produce safe, useless observations. The skill provides no guardrails for this judgment call beyond the "why not just what" heuristic.

It also assumes interviews were conducted with a **coherent research objective** and methodology. The first step says "note the research objective and methodology used." If the interviews were ad-hoc customer calls with no shared protocol, the synthesis may surface false patterns — participants may have been asked different questions, making cross-participant comparison misleading. The skill doesn't warn about this.

A subtler assumption: the skill assumes **themes from frequency = themes of importance**. The "3+ participants" threshold is about recurrence, not impact. In practice, a single participant may articulate a critical insight that 7 others never mentioned because they weren't asked the right question. The skill's methodology can miss these signals.

## What could go wrong

The skill reads interview data (files, transcripts, notes) and writes synthesis documents. No destructive tool risk. The real risks are epistemic:

**False consensus from small samples**: 3 participants agreeing on a theme feels like validation but can be noise when the total sample is 5. The skill recommends 5+ participants but only gates at 3 — the gap between 3-of-5 and 3-of-20 is enormous for confidence, and the skill doesn't calibrate for sample size in its confidence logic.

**PII leakage**: The skill says "protect participant identities (no PII)" in the quality checklist but provides no mechanism for doing so beyond participant IDs. If the raw transcripts contain names, companies, or identifiable details, and the agent copies verbatim quotes without scrubbing, PII ends up in a document that gets circulated beyond the research team.

**Insight-action coupling that bypasses validation**: The skill produces recommendations tied to insights with confidence levels. A stakeholder may treat "High confidence, implement this" as a decision rather than a research finding that still needs solution validation. The skill doesn't warn that even high-confidence insights need solution experimentation — knowing the problem doesn't mean you know the fix.

## Bottom line

This is a competent qualitative research synthesis skill that does exactly what it says and nothing surprising. It earns a spot in a product-management catalog because it chains cleanly with other skills (persona, journey-map, problem-statement) and because the insight-vs-observation distinction, while basic, is something most synthesis tools skip. The biggest benefit is the workflow integration — it knows where it sits in the research pipeline and redirects appropriately. The biggest risk is false confidence from small samples. If you already have a strong research synthesis habit, this skill won't teach you anything new but will save you the boilerplate. If you don't, it will make your synthesis output structurally better than whatever you'd produce from scratch.

## Confidence: high

The skill's surface area is small and its methodology is explicit. I read every step, every quality gate, and every redirect. There's no hidden template dependency — the output structure is described inline.
