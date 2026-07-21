# algorithmic-art

> Ready to use

## Summary

This skill teaches an AI agent to generate interactive p5.js generative art through a two-phase creative pipeline: first, write a poetic "algorithmic philosophy" manifesto, then implement it as a living, parameterized visual system. The result is a self-contained HTML artifact — seeded, tunable, reproducible — that works in any browser. It is a workflow skill, not a library or a set of rules.

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

This is a well-designed creative pipeline for a specific environment (Claude + p5.js + artifact viewer) that would be a rough fit anywhere else. The philosophy-first approach is genuinely good and would improve generative-art output for any agent that can execute it. But the hard Anthropic-branding coupling and template dependency mean that in a general-purpose skill catalog, this skill arrives with about 20% dead weight that non-Anthropic agents must route around. If the catalog could only keep 100 skills, I'd include it for the philosophy-before-code insight alone, but only after stripping the Anthropic-branding mandates. The biggest benefit is the seeded-reproducibility + interactive exploration combo; the biggest risk is the template dependency that silently breaks the pipeline outside Claude's ecosystem.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
