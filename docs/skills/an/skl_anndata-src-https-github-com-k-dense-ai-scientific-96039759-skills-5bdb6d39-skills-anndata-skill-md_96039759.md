# anndata

> Ready to use

## Summary

# AnnData for Single-Cell Genomics

This skill teaches an agent how to work with AnnData — the annotated data matrix that underpins virtually all single-cell genomics analysis in Python. AnnData is not a general-purpose data structure; it is a domain-specific container tightly coupled to the scanpy ecosystem. If your agent needs to write Python for single-cell RNA-seq, ATAC-seq, or spatial transcriptomics, this is the data structure it must understand. If it doesn't, this skill is irrelevant.

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

- chains with: [cellxgene-census](../ce/skl_cellxgene-census-src-https-github-com-k-dense-ai-s-7d8fdd5f-bdb6d39-skills-cellxgene-census-skill-md_7d8fdd5f.md)
- chains with: [arboreto](../ar/skl_arboreto-src-https-github-com-k-dense-ai-scientifi-30006f36-skills-5bdb6d39-skills-arboreto-skill-md_30006f36.md)

## Public Analysis Summary

This skill covers an essential, genuinely irreplaceable data structure for single-cell genomics. But its value is narrow and deep, not broad. The single biggest risk is silent data loss through in-place mutation without raw-count preservation; the single biggest benefit is preventing agents from fumbling the `.obs`/`.var`/`.obsm` namespace.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
