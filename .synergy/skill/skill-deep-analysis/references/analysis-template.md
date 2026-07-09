# Analysis Template

This is not a form. This is not a summary. This is your judgment, written down so another agent can trust it.

When you finish reading a skill's source content (the actual SKILL.md file, the full text, not just a metadata record), you are going to write a short note about what you actually think. Not what the skill claims about itself — what you, after reading it carefully, believe to be true about it.

The old 11-section template is dead. Do not use it. Do not try to map old sections to new ones. Start fresh every time.

## Metadata (unchanged)

You must include this YAML frontmatter at the top of every analysis. The metadata format has not changed. Do not add or remove fields.

```yaml
---
schema_version: 1
skill_id: <the canonical skill ID from the skill record>
source_hash: sha256:<hash of the source content you read>
analysis_version: 1
confidence: high | medium | low
updated_at: "<ISO 8601 timestamp>"
---
```

## What you are writing: 6 judgments, not 11 sections

You will answer six questions. Not eleven. Each one requires you to think, not to transcribe. If you find yourself copying a sentence from the SKILL.md file, stop — you are doing it wrong. Put the source content aside after you finish reading it, and write from what you remember and what you concluded.

### 1. What does it actually do?

Explain the skill's core capability in your own words. Strip away the marketing language, the filler, the "comprehensive guide for..." framing that every SKILL.md uses. Get to the irreducible core.

Good: "This skill teaches an agent how to write p5.js code that generates algorithmic art — geometric patterns, particle systems, noise fields. It gives you a step-by-step workflow: brainstorm a concept, write the code, iterate on the visual output. It does NOT teach general creative coding or cover frameworks other than p5.js."

Bad: "Skill Creator — Comprehensive 33KB guide for creating effective agent skills. Covers: skill structure, progressive disclosure references, trigger semantics." — This is transcription, not understanding.

After you write this section, ask yourself: if someone who has never seen the original SKILL.md reads only my paragraph, would they know exactly what this skill can and cannot do? If the answer is "maybe" or "I'm not sure", rewrite it.

### 2. What makes it special — or not special?

Compare this skill against others in the same domain. You are not writing marketing copy. You are giving a colleague honest advice about whether this skill is worth their attention.

If this skill has something genuinely distinctive — a framework nobody else uses, a counterintuitive best practice, a workflow order that produces better results, a unique way of decomposing the problem — describe it concretely. Say what the insight is and why it matters.

If this skill is solid but unremarkable, say so directly. Examples of honest assessments:

- "This is a competent but generic code review skill. It covers the standard checklist (naming, structure, tests, edge cases) without adding any unique perspective. You could swap it with any other code review skill and get roughly the same result."
- "The only thing that sets this apart is its source — it comes from Anthropic's official skills repository, which means it's likely to be well-maintained and compatible with the Anthropic ecosystem. The content itself is standard."
- "This skill is genuinely different: instead of listing what to check, it teaches a questioning technique — asking 'what would break if this line were wrong?' — that leads to deeper review than checklist-based approaches."

Do not invent uniqueness. If you read the skill and thought "yeah, I've seen this before", write that. A catalog full of honest mediocrity assessments is more useful than a catalog full of inflated praise.

### 3. When it works, and when it will fail you

Do not write abstract trigger semantics. Do not write "load when agent needs expertise in code review." That tells nobody anything.

Write two concrete scenarios from the perspective of an experienced agent who has used this skill and seen both outcomes:

**Best-case scenario**: Describe a specific situation where loading this skill will noticeably improve the quality of the output. Be concrete about the context — what kind of project, what kind of task, what signals indicate this is the right skill to load.

Example: "This skill shines when you are reviewing a PR that touches multiple architectural layers — it has a systematic way of tracing changes from the data layer up through the API to the UI, which catches integration bugs that per-file review misses."

**Worst-case / failure scenario**: Describe a specific situation where loading this skill will waste time, produce bad output, or create risk. Be honest — every skill has failure modes. If you cannot think of one, you have not thought hard enough.

Example: "Do NOT load this for a quick typo-fix PR. Its full workflow takes 15-20 minutes to walk through, and on a 3-line change you will spend all your time on ceremony with zero benefit. It will also produce false positives on any codebase that does not follow the layered architecture it assumes."

Write these like a senior engineer leaving notes for a junior. Not like documentation. Like advice.

### 4. What does it assume, and are those assumptions safe?

Every skill makes assumptions it does not state explicitly. Your job is to find them and judge them.

An assumption is a precondition the skill depends on but never says "you need X before this works." Look for:

- **Tool/stack assumptions**: "It assumes you are using React with TypeScript. On a Vue or Svelte project, half its instructions are irrelevant."
- **Team/process assumptions**: "It assumes your team already has a code review culture with defined owners and turnaround expectations. If you are the first person introducing code review to a team, this skill skips the political/social groundwork completely."
- **Infrastructure assumptions**: "It assumes you have CI/CD set up with automated test runs. The entire 'verify before merging' step is impossible without this."
- **Skill-level assumptions**: "It assumes the agent already knows how to set up and configure database connections. It tells you what queries to run but not how to connect."
- **Domain assumptions**: "It assumes you are building a standard CRUD web application. Its patterns do not translate to real-time systems, data pipelines, or embedded software."

For each assumption you identify, judge it:

- Is this a reasonable assumption for the skill's intended audience?
- In what percentage of real projects would this assumption hold?
- If the assumption fails, does the skill degrade gracefully or break completely?

If you genuinely searched for assumptions and found none, you may write "I found no hidden assumptions — this skill is unusually explicit about its prerequisites." But you must have actually looked. "I didn't think about it" is not the same as "there are none."

### 5. Tools and permissions: what could go wrong?

This is not a list. This is a risk assessment. For each category of tool or permission the skill requires, tell the downstream agent what the actual danger is:

- **Filesystem writes**: Which directories does it touch? What happens if it writes to the wrong file? Can it overwrite user work?
- **Network calls**: What external services does it reach? What happens if they are down? Does it leak data?
- **Shell execution**: What commands does it run? Could any of them be destructive if the context is wrong?
- **Credentialed access**: Does it need API keys, tokens, or login sessions? What happens if credentials are missing or expired?

For each category, answer: what is the worst realistic outcome if something goes wrong? Not "the agent fails the task" — be specific. "It deletes the user's uncommitted changes." "It sends an email to the wrong person." "It publishes a draft that was not ready."

Also answer: does the user need to be present for any of these operations? Some skills can run fully unattended; others need the user to approve each external action. This distinction matters enormously for pack composition.

### 6. Your bottom-line verdict

Two or three sentences. This is what the downstream pack-synthesis agent reads when it is scanning 50 analyses and needs to decide which skills to include.

Answer these questions:

- Compared to other skills in the same domain, would you pick this one or a competitor? Why?
- What is the single biggest risk if someone uses this skill carelessly?
- What is the single biggest benefit if someone uses this skill well?
- If the catalog could only keep 100 skills total, does this one earn a spot?

Be decisive. "It depends" is not a verdict. If you genuinely cannot decide, say "I cannot give a verdict because [specific reason: missing source content, domain I do not understand well enough, etc.]" and lower your confidence accordingly.

## Prohibited phrases

The following phrases are banned because they look like analysis but contain zero information. If you write any of these, delete them and write something real:

- "Fits into general workflow"
- "Standard agent tools"
- "No elevated privileges identified"
- "No conflicts identified from source review"
- "Compatible with [ecosystem] skills"
- "Evaluate based on task relevance"
- "Content-derived from reviewed source"
- "May have platform-specific counterparts"
- "Watch for overlap with similar skills"
- "Use during [domain] workflow stages"

Every one of these is filler. They could be appended to any analysis of any skill and mean nothing. If you find yourself reaching for one of these phrases, you are not done thinking. Go back to the source content and find something specific to say, or be honest that there is nothing specific to say — but say it in your own words, not with a template placeholder.

## Bad analyses to learn from

Here is what a bad analysis looks like (real example, from the old template):

> **Core Purpose**: Code Review And Quality — provides agent workflow guidance for code-quality tasks.
> **Trigger Semantics**: Load when an agent needs expertise in code-review-and-quality.
> **Capability Breakdown**: Primary domain: code-quality. Content-based code-review-and-quality workflow guidance.
> **Workflow Role**: Use during code-quality workflow stages. Fits within broader agent orchestration.
> **Inputs / Outputs**: Inputs: task context. Outputs: code-review-and-quality results.
> **Tool and Permission Profile**: Standard agent tools for code-quality work. No elevated privileges noted.
> **Compatibility Notes**: Compatible with skills from same source ecosystem.
> **Conflict Notes**: No known conflicts.
> **Dedupe Notes**: May overlap with code-quality skills from other sources.
> **Evaluation Hooks**: Evaluate: task relevance, source quality (MIT), evidence freshness.
> **Evidence and Confidence**: Confidence: medium. Based on source record metadata.

This analysis could be written by a script that never read the SKILL.md. Every sentence is generic. Replace "code-review" with "database-migration" and the entire analysis still works — that is how you know it has zero insight. Do not write analyses like this.

Here is what the same analysis should have looked like:

> **What it does**: This skill teaches an agent a structured code review workflow: understand the change context first, then check naming and structure, then trace logic, then verify tests, then look for edge cases. The order matters — it argues that jumping straight to line-by-line review without understanding the PR's purpose is the most common review failure.
>
> **What's special**: The workflow ordering is genuinely insightful. Most review skills list what to check; this one sequences the checks to build understanding before scrutiny, which reduces nitpick reviews. However, the actual review criteria (naming, structure, tests) are standard — the value is in the process, not the checklist.
>
> **Best case**: Large refactoring PRs where the diff is intimidating. The "understand first" step forces you to read the PR description and linked issues before touching code, which prevents the common failure of reviewing a refactor without knowing what problem it was solving.
>
> **Worst case**: Emergency hotfix PRs where speed matters more than thoroughness. The full workflow takes 20+ minutes; on a critical production fix you need a 2-minute sanity check, not a deep review. Loading this skill will make you slower when you need to be fast.
>
> **Assumptions**: It assumes PRs have linked issues with clear problem descriptions. On teams that do not use issue tracking or write sparse PR descriptions, the "understand context" step has nothing to work with and collapses to "read the diff title."
>
> **Tool risks**: No filesystem writes or network calls — this is a read-and-reason skill. The only risk is opportunity cost: spending time on deep review when a shallow check was appropriate.
>
> **Verdict**: Worth including as a default code review skill because the workflow ordering is genuinely better than checklist-based alternatives. However, the catalog should also include a lightweight review skill for low-ceremony situations. If keeping only 100 skills, I would include this one only if there is no other structured-review skill with comparable process insight.

Notice the difference: every paragraph contains a judgment that could only come from someone who read the source and formed an opinion. Nothing is reusable across different skills. That is the standard.
