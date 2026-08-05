# CodeRabbit Autofix

> Ready to use

## Summary

## What it actually does

CodeRabbit Autofix is an interactive adapter between a CodeRabbit review and a local checkout: it enumerates unresolved, current root threads from recognized CodeRabbit identities, turns each comment into a sanitized defect report, and checks that report against the code before proposing a patch. It can apply only individually approved minimal changes, combine them into one commit, optionally validate and push them, and leave one sanitized PR summary. It cannot autonomously obey the reviewer, process arbitrary reviewers, or do useful fix work without an open PR for the current branch and a completed CodeRabbit review containing unresolved current threads.

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

- [CodeRabbit Review Remediation Workflow](../../packs/code-review/pack_coderabbit-review-remediation_f00daeba.md)

## Related Skills

- chains with: [CodeRabbit Code Review](../co/skl_coderabbit-code-review-src-https-github-com-codera-9e16a0ae-lls-8f2a22eb-skills-code-review-skill-md_9e16a0ae.md)
- alternatives: [CodeRabbit Code Review](../co/skl_coderabbit-code-review-src-https-github-com-codera-9e16a0ae-lls-8f2a22eb-skills-code-review-skill-md_9e16a0ae.md)

## Public Analysis Summary

I would pick this over a generic bulk review fixer for CodeRabbit on a sensitive repository because its independent-validation boundary addresses the most dangerous part of AI-authored review feedback. Its biggest benefit is prompt-injection-resistant triage; its biggest risk is approval fatigue combined with broad Git and GitHub write capability, especially when the working tree is dirty. It earns a place in a 100-skill catalog as a strong security pattern with a concrete integration, but it should be labeled as controlled review remediation rather than autonomous autofix.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
