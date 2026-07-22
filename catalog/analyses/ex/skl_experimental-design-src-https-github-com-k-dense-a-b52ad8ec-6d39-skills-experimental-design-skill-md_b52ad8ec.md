---
schema_version: 1
skill_id: skl_experimental-design-src-https-github-com-k-dense-a-b52ad8ec-6d39-skills-experimental-design-skill-md_b52ad8ec
source_hash: git_sha1:88ca761056ac84392d79933e3bc2714e15086fef
analysis_version: 1
confidence: medium
updated_at: "2026-07-22T03:27:59.421Z"
---

# experimental-design

# experimental-design

This skill teaches an agent how to think like a research methodologist: formulating testable hypotheses, selecting study designs, sizing samples, managing confounds, and assessing validity. It is not a statistics calculator or a data analysis tool — it is a decision-support framework for the *planning* phase of scientific inquiry. If you expected it to run power analyses or generate randomization schedules, you will be disappointed. What it actually delivers is a structured mental model for causal inference that most LLMs lack.

## Why it matters

Most agent skills are execution engines — they write code, audit accessibility, or render UI. This one is a *reasoning scaffold*. That makes it genuinely unusual in the catalog. The substance is standard research methodology (hypothesis testing, factorial designs, threats to validity, pre-registration), but the packaging as an agent-loadable skill addresses a real gap: agents default to pattern-matching rather than structured causal reasoning when asked to design or critique experiments. If you already have a statistics textbook open, this skill adds little. If you are an agent asked to help a researcher plan a study and you have no training data for that, this skill fills a gap that few others even acknowledge exist.

## Where it helps, where it hurts

**Best-case scenario**: A graduate student asks an agent "help me design an experiment to test whether a new teaching method improves exam scores." Without this skill, the agent might suggest a before/after comparison and call it done. With this skill loaded, it walks through hypothesis formulation, flags regression to the mean and maturation as internal validity threats, suggests randomization with a control group, raises the question of whether students within the same classroom should be treated as independent (cluster effects), and prompts a power analysis before collecting data. The output shifts from naive to methodologically defensible.

**Worst-case scenario**: A product manager asks "analyze our A/B test results" and the agent loads this skill. The skill spends time lecturing about pre-registration and factorial designs while the user just wants a p-value and a confidence interval. Or worse: the agent applies the skill's frameworks with false confidence, recommending a sample size from a formula it doesn't truly understand, and the user trusts a hallucinated power calculation. This skill teaches design *principles*, not statistical computation — using it as a replacement for a statistician's judgment is dangerous.

## What it quietly assumes

The stated assumption is "basic statistics knowledge" — this is optimistic. The skill assumes the reader understands what a p-value is, what effect size means, and why randomization matters. More importantly, it assumes the *deployment context* involves people who care about causal inference: academic researchers, clinical trial designers, product experimenters, or survey researchers. Load this skill during a database migration or a CSS refactor and it is dead weight. It also assumes the agent can bridge from design principles to implementation — the skill tells you to "block on a variable" but doesn't generate the blocking code. If the agent cannot do that independently, the skill's advice sits unimplemented. These assumptions hold in maybe 20-30% of agent task contexts — specifically, research-adjacent work. In the other 70-80%, the skill is irrelevant but not harmful.

## What could go wrong

The skill itself is a knowledge artifact with no executable tools, so direct tool risk is low. The real risks are downstream: (1) An agent that internalizes the skill's frameworks might overconfidently prescribe experimental designs without understanding domain-specific pitfalls — e.g., recommending a crossover design without considering carryover effects in a pharmacokinetic study. (2) The skill emphasizes pre-registration but an agent might help a user draft a pre-registration that sounds rigorous while masking p-hacking opportunities — the skill teaches the form of good methodology without guaranteeing the substance. (3) If an agent uses the skill to help design an experiment involving human subjects, it may fail to flag IRB/ethics requirements, which are conspicuously absent from the skill's described scope. User presence is helpful for domain judgment but not technically required — which is part of the risk.

## Bottom line

In a catalog dominated by coding and design skills, this one earns its place by covering a domain that agents are otherwise bad at: structured causal reasoning for experimental design. The single biggest risk is that an agent applies its frameworks with unearned confidence in a domain where bad experimental design has real consequences (medical research, policy evaluation, high-stakes A/B testing). The single biggest benefit is that it transforms an agent's experimental design output from "confidently wrong" to "structured and caveated." In a tight catalog of 100, keep it — but pair it with a companion skill that handles the actual statistical computation, and add an explicit warning that this skill does not replace a statistician.

## Confidence: medium

Assessed from a detailed summary rather than the full original SKILL.md artifact. The summary was substantive enough to form judgments about scope, assumptions, and risk.