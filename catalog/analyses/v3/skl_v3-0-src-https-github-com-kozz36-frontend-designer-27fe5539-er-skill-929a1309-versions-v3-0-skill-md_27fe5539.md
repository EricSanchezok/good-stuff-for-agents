---
schema_version: 1
skill_id: skl_v3-0-src-https-github-com-kozz36-frontend-designer-27fe5539-er-skill-929a1309-versions-v3-0-skill-md_27fe5539
source_hash: sha256:918d025c2ce649237fd7eacf5af55bb9b0be9a12
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T02:15:00+08:00"
---

# frontend-designer v3.0 — frontend design system decision guidance

This is not a procedural skill with scripts to run. It is a decision-framing skill that tells the agent how to think about frontend system design: what to prioritize (tokens before novelty, accessibility before aesthetics, container queries before breakpoint sprawl), what gates to pass through before making architectural choices, and what shape the output should take. The core mechanism is four "Decision Gates" — a lookup table mapping common needs (reusable UI system, one-off marketing, complex layouts, animation) to the action the agent should take. A references directory with technical matrices and anti-patterns backs the gates.

## Why it matters

Most frontend agent skills are collections of CSS rules or component patterns — they give the agent a recipe to follow. This skill gives the agent a spine. The Decision Gates table is the most interesting part: it tells you to define tokens and accessibility invariants first for reusable systems but optimize for pure visual outcome on marketing pages. That distinction matters. An agent that applies design-system rigor to a one-off landing page wastes time; an agent that skips token definition on a component library creates technical debt. This skill encodes that judgment.

But the SKILL.md is only 55 lines long, and most of the actual substance lives in `references/technical-reference.md` and `references/source-index.md`, which are not included in the source URL I fetched. The skill is an index into external references, not a self-contained knowledge artifact. Its real value depends entirely on the quality of those reference files.

## Where it helps, where it hurts

**Best-case scenario:** An agent is about to start building a new design system from scratch. It loads this skill first, reads the Activation Contract ("do not use for generic explanation, copy editing, or one-off code changes"), passes through the Decision Gates ("Reusable UI system → Define tokens, component states, and accessibility invariants first"), consults `references/technical-reference.md` for the anti-pattern catalog, and produces a decision-first architecture document with rejected alternatives and runtime risks. The skill acts as a quality gate that prevents the agent from jumping straight into writing CSS without thinking about token architecture.

**Worst-case scenario:** The agent loads this skill for a one-off bug fix in a button component, the skill says "don't use me for one-off code changes," the agent ignores the Activation Contract, and the skill's Hard Rules (tokens before novelty, accessibility first) influence the agent to over-engineer a token system for a five-line CSS fix. The user gets a lecture about design tokens when they wanted a border-radius change.

## What it quietly assumes

The skill assumes the agent already knows how to execute on the decisions it frames. "Define tokens, component states, and accessibility invariants first" is an instruction, not a tutorial. If the agent does not know what a token architecture looks like or how to audit component states, this skill will not teach it — it will just tell it to do those things and point to reference files.

It assumes the `references/technical-reference.md` file exists and is well-maintained. The skill's value proposition is that these references contain "curated technical basis for v3.0 decisions" — but if those files are stale, thin, or missing, the skill collapses to a set of exhortations with no supporting evidence.

It assumes a team context where "architecture" means something: the Decision Gates are written for an agent working on production systems with reusable components, not for a solo developer building a personal site. The "product constraints, team skill, runtime, data ownership, security boundary, and validation path" checklist in Execution Step 1 is a real engineering checklist, not a hobbyist one. If the actual context is a weekend project, this skill is dead weight.

## What could go wrong

This skill has no scripts, no tool calls, and no side effects — it is purely guidance text. The worst outcome is misapplication: the agent applies architectural rigor to trivial work, or conversely, skips the Decision Gates and treats the skill as decorative text while making the same old decisions. The Hard Rules are phrased as absolutes ("Design tokens are contracts; do not hardcode visual decisions in isolated components") but the Decision Gates explicitly carve out exceptions for one-off marketing pages. An agent that reads the rules but misses the gates will rigidly enforce token contracts in situations where they add cost without value.

The Output Contract ("Return: recommended decision and why...") is the right shape for a design decision but it is presented as mandatory — the agent might produce this format even when the user asked a simple question, creating a mismatch between what was asked and what is returned.

## Bottom line

This is a thin wrapper around "think before you code" for frontend architecture, with four genuinely useful decision gates and a reference to deeper technical material. Whether it earns a catalog spot depends entirely on the quality of `references/technical-reference.md` — the SKILL.md alone is too skeletal to stand on its own. The biggest benefit is the Decision Gates table, which encodes real architectural judgment in a form an agent can actually apply; the biggest risk is that the skill substitutes process theater (checklists and output contracts) for substance when the reference files are absent or weak.

## Confidence: medium

The SKILL.md is unambiguous but references external files I could not inspect. I cannot judge whether the skill works in practice without reading `references/technical-reference.md`. The confidence reflects the gap between what the skill claims to provide and what the source URL actually contained.
