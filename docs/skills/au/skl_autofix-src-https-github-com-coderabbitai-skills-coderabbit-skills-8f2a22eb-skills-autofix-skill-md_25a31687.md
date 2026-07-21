# autofix

> Ready to use

## Summary

This skill turns CodeRabbit PR review threads into applied code fixes, but that undersells it. Its real headline is that it treats every word of reviewer feedback as adversarial input. The entire workflow is built around a threat model where CodeRabbit's review comments — including the "Prompt for AI Agents" section meant to guide fix behavior — could contain malicious instructions to read secrets, fetch rogue URLs, modify CI config, or trick the agent into executing shell commands. That posture is what makes this skill worth attention.

## Source

- Source: CodeRabbit Skills
- License: MIT (verified)

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

Pick this skill if you use CodeRabbit on GitHub and care about safely processing AI-generated review feedback — the threat-model-aware design is genuinely thoughtful and I have not seen it in other review-fix skills. Skip it if you don't use CodeRabbit, or if you want a fully autonomous fix pipeline, or if you have a workflow with very large PRs where the one-at-a-time approval loop would become approval theater. The biggest risk is the string-matching fragility in detecting in-progress reviews and parsing issue headers; if those break, the skill degrades into a silent no-op. The biggest benefit is the per-fix approval gate that prevents both malicious prompt injection and hasty bulk application of bad reviewer suggestions.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
