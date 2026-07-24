# bulk-rnaseq

> Ready to use

## Summary

# Bulk RNA-seq Analysis (Python)

This is a workflow guide that strings together the standard bioinformatics toolchain for bulk RNA-seq — FastQC, STAR/HISAT2, featureCounts/HTSeq, and DESeq2 — all orchestrated from Python using subprocess calls. The rpy2 bridge to R/Bioconductor is the centerpiece architectural decision. It is, in essence, a Python wrapper around tools that were never designed to be called from Python.

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

- chains with: [arboreto](../ar/skl_arboreto-src-https-github-com-k-dense-ai-scientifi-30006f36-skills-5bdb6d39-skills-arboreto-skill-md_30006f36.md)

## Public Analysis Summary

I would not pick this skill for production RNA-seq analysis. Use nf-core/rnaseq, bcbio-nextgen, or even a well-maintained Snakemake pipeline instead — any of those give you containerization, restartability, resource management, and community-tested parameter defaults. The Python-subprocess approach is an architectural choice that trades all the hard-won lessons of reproducible bioinformatics for language convenience, and that trade is not worth making. The single biggest risk is silent analytical corruption from uncaught tool failures; the single biggest benefit is accessibility to Python programmers who refuse to learn even a minimal workflow language.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
