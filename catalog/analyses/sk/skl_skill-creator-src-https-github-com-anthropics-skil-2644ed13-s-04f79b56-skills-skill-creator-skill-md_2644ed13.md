---
schema_version: 1
skill_id: skl_skill-creator-src-https-github-com-anthropics-skil-2644ed13-s-04f79b56-skills-skill-creator-skill-md_2644ed13
source_hash: sha256:88977f18b1f379e4f0a0c35f3d88c4c9b2e85bb8
analysis_version: 1
confidence: high
updated_at: "2026-07-10T02:14:12+08:00"
---

# Skill Creator

This is the skill that teaches Claude how to create, iterate on, and optimize skills — including itself. It's a meta-skill: a full development lifecycle for skill authoring, covering everything from initial intent capture through parallel test-case evaluation, benchmark scoring, blind A/B comparison, and description optimization for trigger accuracy. It's unusually self-aware, with explicit instructions for different runtime environments (Claude Code, Claude.ai, Cowork) and genuine attention to accessibility for non-technical users.

## Why it matters

This is the single most ambitious skill-authoring guide I've seen. Most skill-creation documentation stops at "here's the markdown format, here's YAML frontmatter." This one treats skill creation as an engineering discipline with a measurement loop. The core innovation is the parallel evaluation system: for each test case, the skill instructs the agent to spawn two subagents simultaneously — one with the skill loaded, one without — then grade outputs against assertions, compute benchmark stats (pass rates, token usage, duration with mean and stddev), and present results in a browser-based reviewer. That's a genuine quality bar that most skill authors never attempt.

The description optimization subsystem is another standout. Instead of hand-tuning trigger phrases, the skill runs an automated loop: 20 eval queries (mix of should-trigger and near-miss should-not-trigger), split 60/40 train/test, each run 3 times per iteration, with an optimizer agent proposing description improvements. This is substantially more rigorous than guessing what trigger phrases work.

The skill also demonstrates its own principles. It follows progressive disclosure (metadata → body → reference files). It explains *why* rather than issuing ALL-CAPS MUSTs. It includes environment-specific branches for Claude.ai (no subagents, no benchmarking) and Cowork (static HTML viewer, no browser). This self-demonstration makes it a teaching tool as much as an instruction set.

## Where it helps, where it hurts

**Best case**: You're a developer or power user building a skill with objectively verifiable outputs — code generation, file transforms, data extraction, structured workflows. You want rigorous iteration: draft, test, measure, improve. You have access to Claude Code or Cowork (subagents available). You follow the full loop: intent capture → interview → draft → parallel test runs → assertion grading → benchmark → human review → iterate. After 2-3 cycles, the reviewer's feedback.json is empty or the user says stop, and you run description optimization. You end up with a skill that's been tested against baselines, its triggers optimized against a held-out test set, and packaged as a `.skill` file. This is the best-case outcome for any skill-authoring tool, and this skill delivers the machinery to get there.

**Worst case**: You're building a skill with purely subjective outputs — writing style, design judgment, creative direction. The skill correctly notes that assertions don't work well here, but the alternative it offers (human review only) is thin. The evaluator viewer still works for qualitative feedback, but the entire benchmarking and comparison infrastructure becomes dead weight. You're also in trouble if you're on Claude.ai and want rigorous testing — the skill explicitly tells you to skip baselines, benchmarking, and the description optimizer. You get a drafting-and-vibe-checking loop, which is fine but unremarkable. The worst failure is trying to follow the full workflow with a skill whose outputs change every run (e.g., creative generation with temperature) — the assertion-based grading will produce noise, and the benchmark pass rates will be meaningless.

## What it quietly assumes

- **Subagents are available and reliable.** The entire evaluation architecture — parallel runs, baselines, grading — depends on spawning subagents. On Claude.ai, the skill explicitly admits this doesn't work and falls back to a manual loop. Even where subagents exist, the skill assumes they'll complete without timeouts ("if you run into severe problems with timeouts, it's OK to run the test prompts in series rather than parallel").
- **The user can open and interact with a browser-based reviewer.** The `generate_review.py` script produces an interactive HTML viewer with feedback textboxes. The skill handles headless environments with `--static`, but the static version loses auto-save and requires file downloads for feedback. If the user can't or won't use a browser at all, the review loop degrades to inline conversation, which the skill barely addresses.
- **The `claude` CLI tool exists and works.** The description optimization loop (`run_loop.py`) runs `claude -p` under the hood. If `claude` isn't on PATH, isn't authenticated, or is a different version than expected, the entire optimization subsystem fails. On Claude.ai, this is explicitly skipped.
- **Skill outputs are stable across runs.** The assertion-based grading assumes the same prompt produces the same correct answer each time. For skills wrapping APIs with live data, or skills using non-deterministic generation, this breaks.
- **The test prompt set is representative of real usage.** The skill provides excellent guidance on writing test prompts, but no method can guarantee that 3-10 hand-written prompts cover the space of real user queries. A skill can pass all evals and still fail in the wild.
- **The user has time for multiple iteration cycles.** The full workflow — parallel test runs, review, improvement, repeat — takes real wall-clock time. The skill doesn't offer a "fast path" for quick fixes. If a user has 5 minutes, they won't get past the draft stage.

These assumptions hold well for the primary target audience (Claude Code power users building structured skills). The degradation when they break is well-documented — the skill explicitly tells you what to skip in each environment — which is far better than silently producing broken results.

## What could go wrong

The biggest risk is in the subagent spawning pattern. The skill says "spawn all runs (with-skill AND baseline) in the same turn." This could launch 6-20 subagents simultaneously for a typical test set, each potentially making API calls and writing files. If any subagent gets stuck or times out, the whole evaluation pipeline stalls. The skill acknowledges this risk but offers no timeout handling or retry logic — just "run them in series" as a fallback.

The description optimizer has a subtler risk: overfitting. The skill correctly uses a 60/40 train/test split, but with only 20 queries total (12 train, 8 test), the test set is statistically small. A description that scores well on 8 held-out queries could still overfit to the specific phrasing patterns in the eval set. The skill warns against making eval queries too easy but doesn't address sample-size limitations.

File system pollution is a practical concern: each iteration creates `eval-N/` directories inside `iteration-N/` inside `<skill-name>-workspace/`, with grading.json, timing.json, eval_metadata.json, and output files in each. After 3 iterations with 3 test cases, you have dozens of directories. The skill never tells the agent to clean up.

No user presence is needed during the optimization loop (it's designed to run in the background), but the main iteration loop requires active human review between cycles. If the user walks away, the process stops.

## Bottom line

This skill earns a spot in a tight catalog of 100 because it's the factory that produces other skills — and it takes that job seriously with genuine engineering rigor. For structured, objectively-verifiable skills developed on Claude Code or Cowork, there's nothing else comparable. The biggest risk is that the full workflow is heavy: you need subagents, a browser, time, and test prompts that represent real usage. For the wrong skill type (subjective outputs, Claude.ai only), most of the machinery is irrelevant and you're left with a basic drafting guide. Pick this when you're building a skill that matters enough to measure. Skip it when you're throwing together a quick helper that you'll tweak by feel.

## Confidence: high

I read the full ~500-line SKILL.md source completely, including all environment-specific branches, the evaluation architecture, the description optimization loop, and the reference file summaries. The skill is unusually explicit about its own assumptions and limitations. I did not read the referenced subagent files (grader.md, comparator.md, analyzer.md) or the reference schemas, but the main document is self-contained enough that I'm confident in all judgments above.
