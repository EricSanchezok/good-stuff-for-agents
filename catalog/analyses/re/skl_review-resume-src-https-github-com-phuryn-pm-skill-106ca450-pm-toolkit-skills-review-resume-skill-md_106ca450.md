---
schema_version: 1
skill_id: skl_review-resume-src-https-github-com-phuryn-pm-skill-106ca450-pm-toolkit-skills-review-resume-skill-md_106ca450
source_hash: sha256:e4620d5e64261cd453724f3c714791562adabc1a
analysis_version: 1
confidence: high
updated_at: "2026-07-10T13:46:00.000Z"
---

# review-resume

A PM-specific resume critique framework built around 10 best practices: professional summary, pronoun avoidance, conciseness, XYZ+S achievement formula, email professionalism, job-specific tailoring, skills-in-context (not laundry lists), section ordering, early-career guidance, and standard job title normalization. Each practice is explained with weak/strong examples and specific evaluation criteria.

## Why it matters

This is the most substantive skill in the phuryn/pm-skills collection. The 10-practice framework isn't just a checklist — it embeds real PM hiring knowledge. The XYZ+S formula ("Accomplished X, measured by Y, by doing Z, specifically S") is a genuinely useful template that forces specificity. The Product Owner vs. Product Manager title guidance shows the author understands a real PM career pitfall that generic resume reviewers miss. The role-focus tailoring (strategy roles emphasize vision, execution roles emphasize delivery, cross-functional roles emphasize influence) demonstrates awareness that "PM" isn't one job.

What elevates this above generic resume review tools is the domain specificity. A general resume reviewer would tell you to "add metrics" — this skill tells you *which* metrics matter for PMs (revenue, retention, growth, launch velocity) and provides PM-contextualized examples. The voice guidance (casual yet professional, encouraging) is also unusual — most review prompts are cold and mechanical.

## Where it helps, where it hurts

**Best case**: A PM with 3-7 years of experience has a solid but unpolished resume and a target job posting. The skill reads both, identifies that their bullets are responsibility-heavy and metric-light, rewrites three key achievement bullets using the XYZ+S formula with plausible metrics based on the context they provided, flags that their "Product Ninja" title should be normalized to "Senior Product Manager," and reorders sections to put employment before education. The PM gets actionable, specific feedback — not "add more numbers" but "for the marketplace launch bullet, add how many sellers onboarded and what GMV growth looked like." They revise their resume and measurably improve their callback rate.

**Worst case**: An early-career candidate or career changer with virtually no PM experience provides a sparse resume. The skill's framework, applied faithfully, amounts to a list of things they don't have: no metrics, no launch experience, no cross-functional leadership stories. The output isn't wrong — it's accurate that their resume is weak — but it's demoralizing and not actionable. The skill's early-career guidance (Best Practice 9) is the shortest and least developed section, and it's positioned as a fallback for "less than 1 year of full-time PM experience" rather than a primary path. A genuine career changer needs *different* advice than "your resume needs metrics it doesn't have," and this skill doesn't provide it.

Also concerning: the XYZ+S formula, applied dogmatically, creates pressure to fabricate quantification. "Improved product roadmap" becomes "Improved roadmap velocity by 40%" — a number the PM may have pulled from thin air. The skill's demand for metrics is correct in principle but creates an incentive structure that rewards fabrication when honest metrics don't exist. Platform PMs, internal tool PMs, and early-stage startup PMs often have no clean metrics at all — the skill has no fallback guidance for these roles.

## What it quietly assumes

The skill assumes the PM operates in a metrics-rich environment where every achievement has a clean number attached. This is true for growth PMs, B2C PMs, and PMs at data-mature companies. It is false for platform PMs (whose "customers" are internal engineers), internal tools PMs, PMs at pre-PMF startups, and PMs in organizations that don't instrument their products. In those contexts, the XYZ+S formula either produces nothing or produces fiction. This assumption holds for maybe 60% of PM roles.

It assumes US/English-market resume conventions. Resume norms differ dramatically across countries — including photo expectations, personal information disclosure, length conventions, and section ordering. Applying US-centric advice to a German or Japanese PM's resume can produce recommendations that actively violate local norms.

It assumes the resume is provided as parseable text. Real-world resumes are often PDFs with complex layouts, multi-column formats, and embedded graphics. The skill doesn't address format handling at all — if the agent can't read the resume, the skill silently fails or hallucinates feedback.

The 1-2 page assumption is reasonable for most PMs but breaks for senior ICs with 12+ years across 4-5 companies. Telling a Principal PM to cut their resume to 2 pages when each role produced fundamentally different achievements is bad advice delivered with algorithmic confidence.

## What could go wrong

Tool risks are minimal — the skill reads files and produces text feedback. No destructive operations. The real risk is bad advice with an authoritative tone. A recommendation to "use Product Manager instead of Product Owner on your resume" is good advice in most markets but could backfire in organizations where PO is the official title and background checks will reveal the discrepancy. A recommendation to cut to one page for an early-career PM is standard advice, but some hiring managers in certain industries interpret one-page resumes as junior and under-qualified.

The skill also creates a social dynamic risk: the agent's feedback sounds authoritative because it's structured as a systematic 10-point review. A candidate who follows all the advice and still doesn't get callbacks may blame themselves rather than recognizing that some of the advice didn't apply to their situation. The skill provides no uncertainty calibration — every recommendation is delivered with equal confidence regardless of how well it fits the candidate's specific context.

## Bottom line

I would pick this over any generic resume review skill for PM-specific work. The 10-practice framework and PM-domain knowledge (PO vs PM, XYZ+S, role-focus tailoring) are genuinely better than what a general-purpose agent would produce unprompted. The single biggest risk is metric-fabrication pressure and poor handling of edge-case PM careers (platform, internal tools, career changers). The single biggest benefit is the before/after example structure, which turns vague "improve your bullets" advice into concrete rewrites. This earns a spot in a tight catalog — PM resume review is a recurring need, and this skill's specificity creates a quality floor that generic prompts don't reach.

## Confidence: high

The source is the most detailed of the five skills reviewed, with explicit evaluation criteria for each best practice and concrete before/after examples. The PM career domain is well-understood.
