---
schema_version: 1
skill_id: skl_define-hypothesis-src-https-github-com-product-on-fb04a2c3-ce15e5-skills-define-hypothesis-skill-md_fb04a2c3
source_hash: sha256:d10e3405859c13fb187357061a512a01a92f8197
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T03:33:00+08:00"
---

# define-hypothesis

A structured prompt for forming falsifiable product hypotheses. It gives the agent a six-step process: state the belief in "We believe that [action] for [user] will [outcome]" format, identify the target user segment, define the expected outcome, set success metrics (primary, secondary, and guardrail), describe the validation approach, and document risks and assumptions. A quality checklist enforces falsifiability, numeric targets, and unambiguous pass/fail criteria. It references an external template and example.

## Why it matters

This skill solves a real and common failure mode: teams treating hunches as facts and building features without articulating what success would look like. The "We believe that..." structured format is the closest thing to a distinctive choice here — it forces a level of specificity that separates a testable hypothesis from a vague aspiration. The guardrail-metrics requirement is also above-average for PM prompts; most hypothesis templates stop at a primary metric and never ask "what could break if we're wrong?" The checklist item "Hypothesis doesn't assume the solution works" is sharp — it catches the most common hypothesis anti-pattern, where the "hypothesis" is really just a disguised solution pitch. That said, the overall structure is still a six-step template plus checklist. It is solid but not uniquely insightful.

## Where it helps, where it hurts

**Best case**: A product team is debating whether adding a "skip intro" button will improve new-user retention. Two people have strong opinions, neither has evidence. You load this skill. The agent produces a hypothesis that specifies the user segment (new users in their first session), a numeric primary metric (Day 1 retention rate, baseline 23%, target 28%), a guardrail metric (time-to-first-action, must not increase), and a validation approach (7-day A/B test, 5k users per variant). The team reads it and realizes their debate was untestable because neither side had defined what "better" means. They align on the hypothesis and move to experiment design.

**Worst case**: A stakeholder says "we need a hypothesis to justify the features in our roadmap." The agent loads this skill and dutifully reverse-engineers hypotheses that "predict" outcomes the stakeholder already wants. The falsifiability checklist item gets a mechanical check — technically the statement can be disproven, but nobody in the room has any intention of rejecting it. The output becomes compliance theater: a well-formatted hypothesis document that exists to justify decisions already made. The guardrail metrics, in particular, get populated with placeholders that nobody will actually track. The document gives cover without creating accountability.

## What it quietly assumes

1. **The user has access to baseline metrics.** Step 4 asks for "baselines and targets," and the checklist requires a "specific numeric target." If the team does not already have instrumentation for the behaviors in question, the agent will either fabricate baselines or produce a hypothesis with an untethered target number. This is a reasonable assumption in mid-size+ product organizations with analytics infrastructure; it fails in pre-PMF startups and any team that has not instrumented the relevant events.

2. **The agent understands statistical requirements for validation.** Step 5 asks for "sample size, duration, and statistical requirements" but provides zero guidance on what any of those should be. The agent is expected to know about minimum detectable effect, statistical power, confidence levels, and how sample size relates to all three. That is a heavy lift.

3. **One hypothesis, one owner.** The template is structured for a single hypothesis document. Product work often involves comparing multiple competing hypotheses about the same problem space. This skill does not support comparison or prioritization across hypotheses.

4. **The difference between "primary," "secondary," and "guardrail" metrics is understood.** These categories are named but never defined. An agent that confuses a guardrail (a metric that must not degrade) with a secondary metric (a bonus signal that would be nice to see) will produce a misleading document.

5. **Timebox constraint is real.** The checklist says "validation approach is practical and time-bound," which implies organizational discipline to cap experiments. If the team culture is "ship and see what happens over the next quarter," this constraint is aspirational.

## What could go wrong

File write risk: the agent writes a hypothesis document to disk. The primary hazard is the same as with any templated output — convincing-looking documents with hallucinated baselines or statistically nonsense sample sizes get shared and treated as authoritative. The user should be present to sanity-check numeric targets and validation parameters, because those are the parts the agent is most likely to get wrong. No elevated permissions required.

## Bottom line

A solid, honest hypothesis-formation prompt that stands out slightly from generic templates by including guardrail metrics and a sharp checklist item about not presupposing the solution. In a catalog of 100 skills, this earns its spot only if the catalog also includes the skills it routes to (`measure-experiment-design`, `define-problem-statement`, `define-opportunity-tree`, `foundation-lean-canvas`), because the routing creates a coherent discovery-to-validation pipeline. In isolation, it is a nicely-structured single-purpose prompt that any competent PM would write for themselves in 10 minutes. Biggest risk: reverse-engineered hypotheses that serve as justification theater. Biggest benefit: the guardrail-metrics concept pushes teams beyond "did it work?" to "did it break anything else?"

## Confidence: medium

The source is clear and the structure is sound, but I cannot inspect the referenced template or example files, and the skill's value hinges on whether those references are strong enough to compensate for the gaps the instructions leave open (statistical guidance, metric type definitions).
