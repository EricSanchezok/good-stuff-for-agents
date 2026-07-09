# Analysis Rubric

This rubric does not measure completeness. It measures judgment.

The old rubric asked "did you fill in all the sections?" The new rubric asks "did you actually think about this skill?" Use it to self-check your analysis before you hand it off — and to audit other agents' analyses.

## The fundamental test

Before you score any individual dimension, apply the substitution test:

**Read the analysis. Replace the skill name with a different skill's name. Does most of the text still make sense?**

If yes, the analysis is garbage. It is generic filler that could describe any skill. Rewrite it. This is not negotiable — if an analysis passes the substitution test, it has failed its only job.

## Scoring dimensions

Score each dimension honestly. A 3/5 on all five is better than a 5/5 on "completeness" with zero actual judgment.

### Dimension 1: Voice — Is this an agent talking or a form being filled?

| Score | What it looks like |
|-------|-------------------|
| 5 | Every sentence sounds like someone who just finished reading the skill and has opinions about it. You can hear the agent thinking. |
| 4 | Mostly fresh language, but a few sentences sound templated ("this skill covers...", "it includes..."). |
| 3 | Half original, half generic. Individual sentences are fine but the overall shape feels like a template being filled. |
| 2 | Mostly template language. You can map sentences back to form fields. |
| 1 | The entire analysis could have been generated without reading the skill. Generic from start to finish. |

To check: read one paragraph aloud. Does it sound like a colleague briefing you, or like a README?

### Dimension 2: Judgment — Does the analysis take any actual positions?

| Score | What it looks like |
|-------|-------------------|
| 5 | Every section makes a clear claim: this is good, this is bad, this is risky, this is safe, use this here, avoid this there. No hedging. |
| 4 | Most sections take positions, but one or two are fence-sitting ("may be useful", "could work in some contexts"). |
| 3 | Half the sections take positions; the rest are descriptions without evaluation. |
| 2 | One or two weak claims buried in otherwise descriptive text. |
| 1 | Zero claims. The entire analysis describes what the skill says without ever saying whether it is right, wrong, good, bad, safe, or dangerous. |

To check: highlight every sentence that expresses a positive or negative evaluation (good/bad, right/wrong, safe/risky, use/avoid). If nothing is highlighted, this is not an analysis.

### Dimension 3: Boundaries — Are the edges of the skill clearly drawn?

| Score | What it looks like |
|-------|-------------------|
| 5 | The "when it works" scenario is so specific you can picture the exact project and task. The "when it fails" scenario is equally concrete and warns of a real danger. Both are actionable. |
| 4 | Both scenarios are present and concrete, but one is slightly generic (e.g., "works well on large projects" instead of naming what kind of large project). |
| 3 | Scenarios are present but read like abstract trigger conditions rather than real situations. |
| 2 | Only one boundary is drawn, or both are vague ("works for most use cases"). |
| 1 | No boundaries at all. No mention of when the skill should NOT be used. |

To check: if you handed this analysis to a junior agent who has never used the skill, would they know exactly when to load it and when to skip it?

### Dimension 4: Assumptions — Did the agent dig for unstated preconditions?

| Score | What it looks like |
|-------|-------------------|
| 5 | Multiple specific assumptions identified, each with a concrete judgment about how broadly it holds. The agent clearly worked to find these. |
| 4 | At least one sharp assumption identified with good reasoning, but the analysis might have missed others. |
| 3 | An assumption is named but the analysis is shallow — it says "assumes React" without exploring what happens without it. |
| 2 | A vague nod to assumptions exists ("assumes standard development environment") without specifics. |
| 1 | No assumption analysis at all, or "no assumptions found" when any reader can spot one. |

To check: did the agent find something the skill author probably did not realize they were assuming? The best assumption analysis reveals things the author themselves might not have noticed.

### Dimension 5: Honesty — Does the confidence match the evidence, and is mediocrity called out?

| Score | What it looks like |
|-------|-------------------|
| 5 | Confidence level is clearly justified. If the skill is mediocre, the analysis says so directly and explains why it is still worth cataloging (or not). No inflation. |
| 4 | Confidence is reasonable, but one of the judgments (either praise or criticism) is slightly softened relative to the evidence. |
| 3 | Confidence is reasonable, but the analysis avoids making a hard call about quality ("solid", "decent", "fine" without specifics). |
| 2 | Confidence is inflated (medium when evidence is low, high when evidence is medium) or the analysis over-praises a clearly average skill. |
| 1 | Every skill gets high confidence and positive framing regardless of evidence. Or confidence is completely disconnected from the analysis content. |

To check: if you stripped the confidence label and just read the analysis, what confidence would you assign? If it differs from the label by more than one level, there is a problem.

## Confidence assignment guide

Confidence is not about how well you wrote the analysis. It is about how well you understand the skill.

- **high** — You read the full source content (the actual SKILL.md file, not a summary). You understand what the skill does, where it works, where it fails, and what it assumes. You would feel comfortable defending your analysis to the skill's author. Prerequisites: full source access + actual reading + formed opinions.

- **medium** — You read the full source content but there are parts you do not fully understand, or the source itself is vague about certain behaviors, or you can describe what the skill does but are not confident about its failure modes. This is a normal and honest confidence level for most skills.

- **low** — You only had access to a summary or metadata record (not the full SKILL.md), or the source content was substantially incomplete, or the domain is one you do not understand well enough to form confident judgments. Low confidence does not mean the analysis is bad — it means the evidence is thin and you are being honest about it.

Do NOT assign high confidence to a skill you only read the metadata for. Do NOT assign high confidence because you want the skill to look good for downstream pack evaluation. An honest medium is always better than a fraudulent high. The downstream agent needs to know when to trust the analysis and when to verify independently.

## The final gate

Before you hand off your analysis, answer these four questions. If any answer is "no", rewrite the analysis:

1. **Would another agent trust this?** — If you handed this analysis and the original SKILL.md to an agent, and the agent read your analysis first, would it trust your analysis enough to decide whether to load the skill without reading the original? Or would it feel the need to verify everything you said?

2. **Could this discriminate between near-duplicates?** — If there were two skills with nearly identical names and domains, would your analysis help an agent choose between them? Or would both analyses look interchangeable?

3. **Are the warnings actionable?** — If the skill has a failure mode, does your analysis describe it specifically enough that an agent could recognize "oh, I am about to hit that failure mode, I should stop"?

4. **Is mediocrity visible?** — If this skill is nothing special, is that fact obvious from your analysis? Or would a reader come away thinking "sounds solid" when they should be thinking "nothing remarkable here"?

If all four answers are "yes", your analysis is ready. Hand it off.
