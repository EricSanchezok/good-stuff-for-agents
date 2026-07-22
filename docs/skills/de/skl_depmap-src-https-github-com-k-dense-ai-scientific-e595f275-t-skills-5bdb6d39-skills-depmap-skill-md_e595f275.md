# depmap

> Ready to use

## Summary

# DepMap Cancer Dependency Map Skill

This skill teaches an agent how to interact with the Broad Institute's Cancer Dependency Map (DepMap), a large-scale functional genomics resource. It covers querying the DepMap Portal API for gene-level dependency scores (CERES and Chronos) derived from genome-wide CRISPR knockout screens, navigating cell line metadata including lineage and mutation status, downloading genome-wide datasets, and integrating DepMap data with CCLE expression and mutation profiles. The practical goal is enabling computational discovery of cancer-type-specific essential genes and synthetic lethal interactions.

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

This is a competent but generic domain wrapper. For a catalog of 100 skills, I would not pick this one — a general-purpose "bioinformatics data integration" skill would cover the pattern. The single biggest risk is an agent producing confident statistical nonsense because the skill omitted caveats about dependency score interpretation.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
