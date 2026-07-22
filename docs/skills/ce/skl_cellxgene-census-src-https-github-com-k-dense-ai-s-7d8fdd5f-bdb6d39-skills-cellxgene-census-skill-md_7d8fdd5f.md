# cellxgene-census

> Ready to use

## Summary

# cellxgene-census

This skill is a detailed cookbook for programmatically accessing the CZ CELLxGENE Census — a versioned, cloud-hosted repository of 217+ million standardized single-cell and spatial transcriptomics profiles. It covers installation, metadata exploration, expression matrix queries (both in-memory and out-of-core), spatial data access, PyTorch integration via TileDB-SOMA-ML, and downstream scanpy workflows. Think of it as the official quickstart guide reformatted into an agent-loadable SKILL.md: correct, current, and workmanlike, but containing no insight you couldn't get from reading the package documentation yourself.

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

This is a competent, well-maintained API cookbook for a specialized scientific data source. I'd load it over nothing, but I wouldn't load it over sending the agent to read the official cellxgene-census documentation — the skill adds convenience, not insight. The single biggest benefit is that it bundles the full query lifecycle (explore, fetch, analyze, troubleshoot) into one loadable context, saving the agent from discovering patterns through trial and error. The single biggest risk is that it makes Census queries frictionlessly easy while offering zero protection against domain-naive biological interpretation — an agent with this skill and a naive prompt is a statistically-correct-bullshit generator.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
