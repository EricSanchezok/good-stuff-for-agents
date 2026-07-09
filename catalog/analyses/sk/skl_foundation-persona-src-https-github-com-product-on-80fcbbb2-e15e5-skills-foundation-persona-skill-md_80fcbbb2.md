---
schema_version: 1
skill_id: skl_foundation-persona-src-https-github-com-product-on-80fcbbb2-e15e5-skills-foundation-persona-skill-md_80fcbbb2
source_hash: sha256:d9d7edc1a3ab517e9de08f811725ad3d3e6a4790
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T03:10:00+08:00"
---

# Persona Builder

This skill fills a canonical persona template from user-provided context. It offers two modes — product and marketing — and labels evidence confidence explicitly. The core idea is sound: produce decision-usable personas that distinguish validated evidence from assumptions rather than delivering fictional archetypes with fake demographic precision. The problem is that the SKILL.md itself contains almost none of the intellectual machinery; everything that matters lives in the referenced template file and example file, which the skill assumes the agent will load separately.

## Why it matters — or doesn't

The honest-evidence calibration is the one genuinely distinctive feature. Most persona templates encourage fabrication by asking for demographic details, motivations, and quotes without requiring the author to say where those came from. This skill mandates a confidence label (High/Medium/Low), a validated-vs-assumed distinction, and open-questions and governance blocks. That is a real methodological commitment, not window dressing.

Beyond that, this is a template-filler. The skill delegates all structural decisions to `references/TEMPLATE.md` — the instructions are essentially "choose product or marketing mode, fill the template, label your evidence." There is no coaching on what makes a persona useful vs. a persona-shaped waste of time, no anti-pattern detection for fictional personas, no guidance on how much evidence is enough before generating, and no diagnostic for whether the persona is actually needed for the decision at hand. The When NOT to Use section redirects to other skills for JTBD, stakeholder mapping, and interview synthesis, but it doesn't help the agent decide whether a persona — even a well-evidenced one — is the right artifact for the problem.

The version jump from 2.5.0 to 2.6.0 in a month with minimal visible changes in the source suggests active maintenance, but the skill's surface area is small enough that most of the value is in the template curation, not the skill logic.

## Where it helps, where it hurts

**Best-case scenario**: A product team has completed a round of user interviews (synthesized via `discover-interview-synthesis`) and needs a persona to anchor an upcoming PRD and stakeholder presentation. The team has evidence for workflow behaviors, decision patterns, and pain points but has been arguing about priorities based on personal intuition. You load this skill in product mode, feed it the interview synthesis, and it fills the template with evidence-linked claims — including the explicit "we assume this" and "we don't know this yet" markers. The stakeholder discussion shifts from "I think the user wants X" to "we have medium confidence the user needs X, and here's what we'd need to research to raise that to high."

**Worst-case scenario**: Someone has no research at all but a deadline for a "persona document." They load this skill, provide three sentences of vague context, and the agent fills the template. The confidence labels all say "Low" and every entry is marked "Assumed," but the output still looks like a finished persona artifact — sections 1 through 11, metadata table, Persona Card, the full visual structure. The team circulates it, the template's authority substitutes for evidence, and decisions get made on fiction. The skill's honesty mechanisms can't prevent this because it explicitly allows generation with thin evidence as long as gaps are labeled. Labeling fiction doesn't make it stop being fiction; it just makes the fiction transparent to readers willing to scrutinize the confidence labels, which most stakeholders won't.

## What it quietly assumes

The biggest assumption is that **a persona template is the right synthesis format for the available evidence**. The skill never questions whether a persona (as opposed to a JTBD canvas, an opportunity tree, or a problem statement) is what the decision needs. The When NOT to Use section covers format conflicts (don't use this if you need JTBD) but does not cover the more subtle question: even when you have persona-relevant evidence, is a persona the most decision-useful artifact?

Another assumption: the user brings enough context for meaningful generation. The skill says "if evidence is thin, continue generation but mark gaps and calibrate confidence." This assumes thin-evidence personas are still worth generating. They may not be — a low-confidence persona can be worse than no persona if it anchors the team on unvalidated assumptions that survive because they're written down in an official-looking artifact.

The skill also assumes the `references/TEMPLATE.md` is always accessible and well-formed. Reading the SKILL.md alone, you cannot tell what sections 1 through 11 contain, what the Persona Card structure is, or what the evidence table columns are. The skill is a shell — its actual behavior depends on a file the source doesn't inline.

## What could go wrong

Tool risk is minimal: the skill reads reference files and writes markdown. The real risk is **premature commitment to a persona narrative**. Once a team has a polished persona document with a name, a face-description, a core-reality statement, and 11 sections of narrative, it becomes psychologically expensive to revise. Even with "Assumed" labels everywhere, the narrative creates an anchor. If the persona is wrong in ways that will only become visible after shipping, the cost of the error is misallocated product investment — potentially months of building for a fictional user.

A secondary concern: the skill generates exactly one persona per invocation. For products with multiple distinct user segments, this produces a sequence of independent artifacts with no cross-segment comparison. The skill does not warn about this limitation; an agent could generate three personas for three segments with no mechanism for tradeoff analysis between them.

## Bottom line

Pick this if you need a persona artifact from existing evidence and you value the evidence-calibration scaffolding — the confidence labels and validated-vs-assumed distinction are real quality-of-life improvements over generic persona templates. Skip it if you have no evidence yet or if you're not sure a persona is the right artifact for your decision. The skill won't help you decide; it will just fill the template. In a tight catalog, this would be a borderline keep — the evidence calibration is a genuine differentiator, but the skill delegates so much to external templates that it reads more like a routing instruction than a self-contained capability. A catalog that already has strong interview-synthesis and JTBD skills might not need this; a catalog that lacks persona generation would find it a competent, honest entry.

## Confidence: medium

The SKILL.md reveals the philosophical commitments (evidence calibration, mode separation, template selection) but delegates core structure to an external template file I have not read. I can judge the quality of the meta-instructions confidently, but I cannot assess whether the template itself is well-designed or whether sections 1-11 produce useful vs. cosmetic output.
