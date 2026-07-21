# skill-creator

> Ready to use

## Summary

This is a meta-skill: its job is to teach an AI agent how to create other skills, specifically Azure SDK wrapper skills conforming to Microsoft's internal skill repository conventions. It is not a general-purpose skill-creation guide. It is a deeply institutional document encoding Microsoft's Azure authentication policies, directory layouts, testing harness expectations, and documentation update procedures. If you are inside Microsoft's `microsoft/skills` repo adding an Azure SDK skill, this is your required playbook. If you are anywhere else, most of this document is irrelevant noise.

## Source

- Source: Microsoft Agent Skills
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

This is a high-quality institutional meta-skill that does exactly one job well: it ensures every Azure SDK skill in the Microsoft skills repo follows the same conventions, uses the same auth patterns, and passes the same test harness. For that single use case, it is irreplaceable. For the Skill Intelligence Catalog, this is a reference artifact rather than a reusable skill — its value is in demonstrating how a large organization enforces cross-skill consistency through a meta-skill template, not in providing general-purpose skill-creation guidance. The biggest benefit is its brutally effective consistency enforcement; the biggest risk is that its assumptions are so deeply embedded in Microsoft's infrastructure that loading it anywhere else wastes context and produces broken scaffolding.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
