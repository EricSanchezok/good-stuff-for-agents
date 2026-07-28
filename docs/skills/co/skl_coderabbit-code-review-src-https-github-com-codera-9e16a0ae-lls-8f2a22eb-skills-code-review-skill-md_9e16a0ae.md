# CodeRabbit Code Review

> Ready to use

## Summary

## What it actually does
This is a thin operating wrapper around CodeRabbit’s hosted CLI review, not an independent review method. It verifies that the client and authentication are usable, submits a selected Git diff for analysis, and turns agent-readable Critical, Warning, and Info findings into a remediation task list. Its boundary is changed code in a Git repository; it does not establish whole-system correctness, independently validate findings, or review arbitrary non-Git material.

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

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
