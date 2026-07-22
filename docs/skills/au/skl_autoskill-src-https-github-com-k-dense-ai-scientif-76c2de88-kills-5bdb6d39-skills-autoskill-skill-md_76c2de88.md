# autoskill

> Ready to use

## Summary

# AutoSkill

AutoSkill is a meta-skill: it does not solve a user-facing problem at all. It exists to help an agent (or catalog maintainer) turn a Python library's public API surface into a structured SKILL.md file. The core idea is sensible — read the library's docs, README, and source, then churn out a reference card in the standard skill format. But calling this a "skill" stretches the term. It is closer to a templated documentation scraper.

## Source

- Source: K-Dense Scientific Agent Skills
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

AutoSkill is a useful pipeline component for a skill catalog that needs scale, but it is not a skill most agents should ever load directly. Its output is raw material, not finished product. The single biggest risk is that generated skills will be treated as authoritative without review; the single biggest benefit is speed when onboarding well-documented libraries at volume.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
