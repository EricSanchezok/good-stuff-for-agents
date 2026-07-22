# cobrapy

> Ready to use

## Summary

# COBRApy

This skill gives an agent working knowledge of COBRApy, the Python library for constraint-based metabolic modeling. It is a condensed API reference organized into topical code examples: loading models, running flux balance analysis, performing knockouts, sampling flux space, designing growth media, and building models from scratch. It assumes metabolic modeling domain expertise — it tells you which functions to call and in what order, but never explains why you would choose FVA over flux sampling or what an infeasible solution actually means biologically. If you already know what a stoichiometric matrix is and just need the COBRApy incantations, this skill saves you a trip to the documentation. If you do not, it will make you dangerous.

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

A serviceable but unremarkable domain-library skill that earns its place only because constraint-based metabolic modeling is too niche for general-purpose agents to know COBRApy's API cold. The biggest risk is not technical failure but scientific failure: an agent that generates valid Python code producing biologically meaningless results, with neither the skill nor the agent equipped to recognize the problem. The biggest benefit is straightforward — it compresses the COBRApy documentation into working code patterns for the five most common modeling workflows. This skill would not survive a 100-skill catalog focused on broad utility, but in a specialized scientific computing collection, it is a solid B-tier entry that needs to be paired with a metabolic-modeling-concepts skill to be safe.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
