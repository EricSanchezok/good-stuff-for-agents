# claude-api

> Ready to use

## Summary

This is the definitive first-party API reference for the Claude / Anthropic ecosystem, and it's large — roughly 74KB of dense technical instruction covering models, pricing, parameters, streaming, tool use, MCP, Managed Agents, prompt caching, token counting, model migration, and per-language SDK specifics across eight languages. It functions less as a "skill" in the narrow sense and more as an onboard knowledge base: the SKILL.md is a routing hub with a detailed architecture overview followed by quick-reference tables, then delegates to `shared/` and `{lang}/` reference files for everything else.

## Source

- Source: Anthropic Agent Skills
- License: Apache-2.0 (verified)

## Capabilities

- Domains: —
- Task types: —
- Best stage: —
- Capabilities: —

## Best Used For / Not For

Use when the trigger semantics and task stage match the job. Do not use when required tools, permissions, license, or confidence do not fit the current run.

## Inputs / Outputs

- Inputs: —
- Outputs: —
- Handoff outputs: —

## Related Packs

No published packs use this skill yet.

## Related Skills

No related skills are public yet.

## Public Analysis Summary

It's the authoritative Claude API reference, maintained by Anthropic, with a unique API Drift mechanism that most third-party skills lack. The biggest risk is context-window waste from overloading — an agent that doesn't respect the trigger conditions will burn tokens. The biggest benefit is that it prevents the single most common Claude API failure mode: writing code against stale training data that the API rejects. If you're building anything that calls Claude, load this before you write a single line. If you're not building against Claude, skip it — there's no value here for non-Anthropic work.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
