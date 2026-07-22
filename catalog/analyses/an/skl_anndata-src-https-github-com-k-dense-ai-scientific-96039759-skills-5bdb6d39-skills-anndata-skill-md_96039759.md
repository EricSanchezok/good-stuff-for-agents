---
schema_version: 1
skill_id: skl_anndata-src-https-github-com-k-dense-ai-scientific-96039759-skills-5bdb6d39-skills-anndata-skill-md_96039759
source_hash: git_sha1:4ea543d24480510ea8d4c444dbc418d426c12fee
analysis_version: 1
confidence: medium
updated_at: "2026-07-22T03:27:59.745Z"
---

# AnnData for Single-Cell Genomics

# AnnData for Single-Cell Genomics

This skill teaches an agent how to work with AnnData — the annotated data matrix that underpins virtually all single-cell genomics analysis in Python. AnnData is not a general-purpose data structure; it is a domain-specific container tightly coupled to the scanpy ecosystem. If your agent needs to write Python for single-cell RNA-seq, ATAC-seq, or spatial transcriptomics, this is the data structure it must understand. If it doesn't, this skill is irrelevant.

## Why it matters

AnnData is genuinely the universal currency of single-cell analysis — every single-cell Python tool (scanpy, muon, scvi-tools, squidpy, scirpy, CellRank) reads and writes `.h5ad` files. There is no substitute or competitor. So if a catalog includes bioinformatics skills, this one is infrastructure, not optional. The skill's value is that it distills the AnnData API into agent-actionable knowledge: where data lives (.X, .obs, .var, .obsm, .obsp), how to subset and filter, how to concatenate and merge, and how to integrate with scanpy workflows.

That said, AnnData is also one of the best-documented Python libraries in bioinformatics. The official scanpy tutorials are comprehensive and well-maintained. This skill's genuine added value depends entirely on whether it provides better agent-facing structure than the raw documentation — for example, clear decision trees for when to use `.raw` vs layered data, or warnings about memory pitfalls that documentation omits.

## Where it helps, where it hurts

**Best-case scenario**: An agent is building a single-cell analysis pipeline and receives a `.h5ad` file. It needs to load, filter, normalize, compute PCA, find neighbors, run UMAP, cluster, and identify marker genes. The agent loads this skill and correctly navigates the AnnData slots — knowing that raw counts belong in `.raw` or `.layers["counts"]`, that normalized data belongs in `.X`, that PCA coordinates go in `.obsm["X_pca"]`, and that cluster labels go in `.obs["leiden"]`. The skill prevents the common mistake of overwriting raw counts with normalized values.

**Worst-case / failure scenario**: An agent is handed a 500,000-cell atlas stored in a 20GB `.h5ad` file and loads the entire object into memory without chunking or backed-mode (`backed='r'`). Python's memory consumption balloons to 60GB, the machine starts swapping, and the kernel dies. Or the agent attempts an in-place `.X` modification that triggers a full dense copy of a sparse matrix, silently consuming all available RAM.

## What it quietly assumes

**Python and scanpy are installed and importable.** Reasonable in bioinformatics environments, breaks in containers without scientific Python. Holds in perhaps 95% of single-cell contexts.
**The user has single-cell data in a compatible format.** The skill assumes `.h5ad`, `.h5`, `.loom`, or 10X-format directories exist and are readable. Fails for bulk RNA-seq or tabular data.
**The user understands the biological distinction between observations (cells) and variables (genes).** The skill teaches the `.obs` / `.var` split mechanically but assumes the user knows what a cell barcode or gene symbol is and why you'd filter on mitochondrial percentage or minimum genes per cell. This is the most dangerous assumption.
**AnnData version compatibility.** The AnnData API has changed across versions. The skill may be stale relative to the installed version.
**The filesystem can handle large HDF5 files.** `.h5ad` files can reach tens of gigabytes. Network-mounted filesystems will cause opaque HDF5 errors.

## What could go wrong

**Data corruption through in-place mutation.** AnnData objects are mutable by design. The worst realistic outcome: an agent follows the skill's normalization instructions and overwrites `.X` with log-normalized values, then saves the object without preserving raw counts in `.raw` or `.layers`. Downstream tools produce wrong results with no overt error.

**Memory exhaustion on large datasets.** Naively loading a large `.h5ad` without backed mode or operating on dense copies of sparse matrices can exhaust all system memory.

**File format assumptions.** If a `.h5ad` file was written by an older AnnData version or a different library (e.g., Seurat converted via SeuratDisk), the agent gets a cryptic HDF5 error with no fallback.

**No network or external-system risk.** This is a pure data manipulation skill — it reads and writes local files. Risk surface is entirely local.

## Bottom line

This skill covers an essential, genuinely irreplaceable data structure for single-cell genomics. If your catalog serves bioinformatics agents, it earns a spot. But its value is narrow and deep, not broad. The single biggest risk is silent data loss through in-place mutation without raw-count preservation; the single biggest benefit is preventing agents from fumbling the `.obs`/`.var`/`.obsm` namespace. In a 100-skill catalog, this earns a spot only if single-cell genomics is a target domain.

## Confidence: medium

Worked from a description of the skill's content. Domain mechanics are well-known, but cannot verify whether this specific skill addresses or ignores specific pitfalls.