# arboreto

> Ready to use

## Summary

# Arboreto

This skill wraps the Arboreto Python library for inferring gene regulatory networks from transcriptomics data. It covers GRNBoost2 (gradient boosting) and GENIE3 (random forest) algorithms, taking expression matrices and spitting out transcription-factor-to-target-gene confidence scores. If you need to reconstruct which transcription factors regulate which genes from single-cell or bulk RNA-seq data, this is the tool. It also touches on Dask-distributed runs for larger datasets and Cytoscape-compatible export.

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

Pick this skill if your agent is already in a mature bioinformatics pipeline and you specifically need Arboreto's API surface without reading the docs. Skip it if you need guidance on the science of GRN inference — this skill provides none. The biggest risk is producing statistically-robust-looking regulatory networks from bad data with no warnings; the biggest benefit is saving the fifteen minutes of looking up function signatures.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
