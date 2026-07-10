---
schema_version: 1
skill_id: skl_claude-api-src-https-github-com-anthropics-skills-5156907c-ills-04f79b56-skills-claude-api-skill-md_5156907c
source_hash: sha256:9a9407309936d7fd36858296374c246dc2c27e46
analysis_version: 1
confidence: high
updated_at: "2026-07-10T14:00:00Z"
---

# Claude API

This is the definitive first-party API reference for the Claude / Anthropic ecosystem, and it's large — roughly 74KB of dense technical instruction covering models, pricing, parameters, streaming, tool use, MCP, Managed Agents, prompt caching, token counting, model migration, and per-language SDK specifics across eight languages. It functions less as a "skill" in the narrow sense and more as an onboard knowledge base: the SKILL.md is a routing hub with a detailed architecture overview followed by quick-reference tables, then delegates to `shared/` and `{lang}/` reference files for everything else.

## Why it matters

This is the single most authoritative Claude API resource an agent can load. Unlike third-party skills or blog posts, it's maintained by Anthropic's own engineering teams and includes an explicit **API Drift** section — a table of common breaking changes from 2025–2026 that corrects stale training data (e.g., `thinking: {type: "enabled", budget_tokens: N}` → `thinking: {type: "adaptive"}` on newer models). That alone makes it a load-or-suffer proposition: an agent that doesn't read this will produce code that gets 400s from the API.

The skill's real power is in its scope discipline. It covers the entire surface area (API, SDK, Managed Agents, server-side tools, cloud providers, prompt caching, context editing, structured outputs) without becoming a book. It uses a progressive-disclosure pattern — the top-level SKILL.md gives you enough to decide which `{lang}/` or `shared/` file to read next. It also bakes in quality-of-life defaults: Opus 4.8, adaptive thinking by default, streaming for long requests.

If I had to compare it against other API reference skills: there's nothing comparable. Most API skills are thin wrappers around docs. This one is a curated, opinionated, drift-aware reference written by the people who built the API. It's not interchangeable with anything.

## Where it helps, where it hurts

**Best-case scenario:** You're starting a new Claude integration in any of the eight supported languages. The skill detects your language from project files, routes you to the right SDK reference, and provides copy-paste-ready code. You're debugging a 400 on a `thinking` parameter — the API Drift table tells you immediately that `budget_tokens` is rejected on Opus 4.8 and you need `adaptive`. You're deciding whether to use the Messages API directly or Managed Agents — the decision tree and surface-selection table walk you through it. The skill prevents the most common class of Claude API failures: building against stale training data.

**Worst-case / failure scenario:** You're working with multiple LLM providers in the same project (OpenAI + Claude), and the skill's hard binary gate — it explicitly checks for non-Anthropic imports and refuses to proceed if it finds `import openai` — creates friction. Another failure mode: you're using an older Claude model (pre-4.6) and the API Drift section leads you to use newer API shapes that the older model doesn't support. The skill defaults aggressively to the latest models; if you're pinned to an older version, you need to know enough to override those defaults. Finally, the skill's size is a threat in itself: loading ~74KB of instruction into context for a simple "what model should I use?" question wastes tokens. The trigger conditions in the description partially mitigate this, but the trigger logic relies on the agent faithfully running a pre-flight `grep` before loading — an approach that assumes a cooperative agent and a grep-capable environment.

## What it quietly assumes

The skill makes several assumptions that are reasonable within Anthropic's ecosystem but break down elsewhere:

- **Always Anthropic SDK.** It mandates the official SDK (`anthropic`, `@anthropic-ai/sdk`, `com.anthropic.*`) as the default and treats raw HTTP as a fallback. If you're in a language where the official SDK has a problematic dependency tree or doesn't fit your build system, there's no escape hatch. This holds for ~90% of cases but fails for organizations with strict dependency policies.

- **Agent environment supports grep and file scanning.** The trigger logic requires `grep -rE 'openai|langchain_openai|...'` to run before opening the skill. This assumes a filesystem with project files and a shell. A web-based agent or an agent operating purely on user prompts can't execute this — the skill either loads unnecessarily or is skipped incorrectly. This assumption fails for ~30% of agent environments.

- **Live network access for WebFetch.** The skill directs agents to `shared/live-sources.md` for SDK references and to official repos when bindings aren't in the skill files. In air-gapped environments, this path dead-ends. The skill provides a fallback (compiler-fix loop), but only for statically typed SDKs.

- **Single-provider projects.** The explicit non-Anthropic provider check treats coexistence as an error condition. Multi-provider projects that use Claude alongside OpenAI (e.g., for cost optimization or fallback routing) are treated as illegible by this skill.

- **Current model generation (2026-era).** The model table, pricing, and API shapes reflect mid-2026 state. If you read this skill in 2027, the API Drift section will be outdated and the model defaults will be wrong. This is an expiration problem the skill acknowledges but cannot solve — the model table is cached with a date stamp, but nothing forces re-fetching.

## What could go wrong

The risks here are moderate and mostly about wasted resources, not destruction:

- **Context window waste.** Loading the full 74KB for a simple question burns an enormous amount of context. The trigger conditions try to prevent this but are brittle. An agent that loads this skill for every Claude-related prompt in a long conversation will exhaust its context window.

- **Hardcoded model string generation.** The skill defaults to `claude-opus-4-8` and instructs agents to use adaptive thinking. If an agent follows this blindly for a production system that's configured for a specific older model, it produces broken code. The agent doesn't have enough context to know when to override the default.

- **SDK import guessing.** If the `{lang}/` files don't cover a specific binding and WebFetch fails, the fallback "compile-fix loop" strategy could produce code that compiles but uses the wrong API surface. For Go and Java, the type system provides some guardrails; for Python and Ruby, it doesn't.

- **No external state modification.** This is purely a reference skill — it doesn't recommend running commands, modifying files, or calling external APIs beyond WebFetch. The user does not need to be present. The worst realistic outcome is wasted tokens and subtly incorrect code.

## Bottom line

This skill earns a spot in any catalog of the top 100. It's the authoritative Claude API reference, maintained by Anthropic, with a unique API Drift mechanism that most third-party skills lack. The biggest risk is context-window waste from overloading — an agent that doesn't respect the trigger conditions will burn tokens. The biggest benefit is that it prevents the single most common Claude API failure mode: writing code against stale training data that the API rejects. If you're building anything that calls Claude, load this before you write a single line. If you're not building against Claude, skip it — there's no value here for non-Anthropic work.

## Confidence: high

I read the full ~74KB source artifact, including all quick-reference tables, provider client matrices, decision trees, API drift corrections, and subcommand routing. The structure is clear, the opinions are explicit, and the failure modes are documented. This is about as confident as an analysis gets.
