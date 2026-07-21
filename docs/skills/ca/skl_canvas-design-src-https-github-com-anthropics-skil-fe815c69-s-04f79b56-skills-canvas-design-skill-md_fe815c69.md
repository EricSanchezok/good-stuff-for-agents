# canvas-design

> Ready to use

## Summary

This skill creates static visual design artifacts — posters, art pieces, abstract compositions — using a philosophy-first pipeline similar to the algorithmic-art sibling skill. The agent first invents a named design movement manifesto, then renders it as a PDF or PNG. Output is a single-page (or multi-page, if requested) visual artifact where text is sparse and design carries the meaning.

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

For abstract, poster-style, or gallery-oriented visual design, this skill's philosophy-first approach and "scientific bible" aesthetic direction produce more interesting output than generic "design a poster" prompting. But it is encumbered by the same Anthropic-specific assumptions as algorithmic-art (font directory, artifact rendering), and the mandatory fake-critique second pass is a clever prompt-engineering hack that I'd rather see replaced with genuine self-critique instructions. In a catalog of 100 skills, I'd include a cleaned version that keeps the philosophy pipeline and the "scientific observation" aesthetic while stripping the Anthropic font dependency and the fabricated user critique. The biggest benefit is the concrete visual direction; the biggest risk is over-polishing output into fussiness.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
