---
schema_version: 1
skill_id: skl_anndata-src-https-github-com-k-dense-ai-scientific-96039759-skills-5bdb6d39-skills-anndata-skill-md_96039759
source_hash: sha256:4ea543d24480510ea8d4c444dbc418d426c12fee
analysis_version: 1
confidence: high
updated_at: "2026-07-10T22:00:00+08:00"
---

# anndata (K-Dense scientific-agent-skills)

This is a competent but thoroughly unremarkable API reference skill for the AnnData Python library — the data structure underlying single-cell genomics. It teaches an agent how to create AnnData objects, read/write `.h5ad` and `.zarr` files, concatenate datasets, subset and filter data, use backed mode for large files, and integrate with scanpy. Every code example works, every deprecation warning is accurate, and none of it is information you couldn't get from `anndata.readthedocs.io` in ten minutes.

## What makes it worth reading — or not

The one real value here is deprecation awareness. The skill correctly flags that `anndata.read_h5ad` and `anndata.read_zarr` remain at the top level while other format readers moved to `anndata.io`, that `AnnData.concatenate()` is deprecated in favor of `ad.concat()`, and that `anndata.__version__` should be replaced with `importlib.metadata.version("anndata")`. An LLM with a mid-2024 training cutoff would generate code using the old APIs and produce deprecation warnings or silent failures. This skill prevents that. But that's table stakes for any library-specific skill — it's not a differentiator, it's a minimum requirement.

Beyond deprecation awareness, this is a straight transcription of the AnnData API surface organized by topic (data structure, I/O, concatenation, manipulation, best practices). The "best practices" section — use sparse matrices, convert strings to categoricals, backed mode for large files, store raw before filtering — is correct and useful, but again, it's the official recommendations from the AnnData docs. If you already have the scanpy skill loaded (which covers anndata basics in its own workflow), this skill is almost entirely redundant.

The integration section showing scanpy, Muon, and PyTorch `AnnLoader` examples is a nice touch, but every one of those is a one-liner import — it's a cross-reference, not an integration guide.

## Where it helps, where it hurts

**Best-case scenario**: An agent needs to do something with AnnData that doesn't involve scanpy's analysis pipeline — loading a `.h5ad`, converting it to `.zarr` for cloud storage, concatenating experimental batches with specific join strategies, or working with `.loom` / `.mtx` formats. The skill has the exact API calls for these operations, with up-to-date syntax, and the agent won't stumble over deprecated function names.

**Worst-case scenario**: An agent loads this alongside scanpy for a standard scRNA-seq analysis. Now you have two skills covering the same data structure and the same `.h5ad` I/O operations, but with different levels of detail and potentially conflicting recommendations. The scanpy skill already handles `ad.read_h5ad()`, `adata.write_h5ad()`, `adata.raw`, etc. Loading both is redundancy with no benefit — the scanpy skill is the one that actually does analysis. The anndata skill is the data-format appendix to a book whose main chapters are in scanpy. Load it separately and you're paying context cost for information you already have.

The more insidious failure: the skill's examples are entirely scRNA-seq flavored (cell types, gene names, mitochondrial filtering), but AnnData is general-purpose. If you're working with spatial transcriptomics, ATAC-seq, or multi-modal data in AnnData, the skill's examples subtly mislead by implying a scRNA-seq context that doesn't apply.

## What it quietly assumes

It assumes the agent already knows what single-cell data is and why AnnData exists. The skill never explains the biological motivation — it jumps straight to "100 cells × 2000 genes" without saying what cells or genes are in this context. If your agent doesn't know single-cell genomics, the entire skill is API calls without purpose.

It assumes `uv` as the package manager and Python 3.11+. On a system with `pip` and Python 3.9, the installation instructions don't work. The `uv pip install` syntax is specific.

The backed-mode section assumes the agent understands memory constraints and can recognize when a 500,000-cell dataset needs lazy loading. The skill tells you HOW to use backed mode but not WHEN — it doesn't give heuristics like "if `adata.n_obs * adata.n_vars * 4 bytes > available RAM, use backed mode."

The mitochondrial gene detection patterns shown in the integration section (`adata.var_names.str.startswith('MT-')`) only work for human data. Mouse uses `mt-`; other organisms have different prefixes. This isn't a bug in the anndata skill per se, but it's an assumption propagated into the scanpy integration examples.

These are all reasonable for a library API skill aimed at someone who already uses the scverse ecosystem. The mitochondrial prefix assumption is the most fragile, but it's a scanpy problem more than an anndata one.

## What could go wrong

Filesystem risk is moderate: `.h5ad` files can be large (10-100 GB) and `write_h5ad` overwrites silently. If you pass the same path as input and output, your raw data is gone, and the skill never mentions `--no-clobber` or backup strategies. The `sc.settings.autosave = True` line in the integration section means every plot generates a file to disk.

Shell execution is limited to `uv pip install` and `python` script commands — low risk unless you're on a restricted system.

The backed-mode path has a subtle risk: `ad.read_h5ad('file.h5ad', backed='r')` opens in read-only mode, but the skill's examples sometimes create views of backed data that look writable but will raise confusing errors on modification. An agent that doesn't understand the difference between a backed view and an in-memory copy will hit `ValueError` at runtime and not know why.

No credential access, no network writes. This is a read-and-code skill with local filesystem writes.

## Bottom line

This is a solid but interchangeable API reference for AnnData. If your agent already has the scanpy skill, skip this — it's redundant. If your agent needs AnnData without scanpy (data engineering, format conversion, cloud storage), it's useful but unremarkable. The deprecation-aware API syntax is its main contribution, and you can get that from a well-maintained cheatsheet. In a tight 100-skill catalog, this doesn't earn a spot — let scanpy handle the AnnData basics and use the official docs for everything else.

## Confidence: high

I read the full 12KB source, understand the AnnData API and scverse ecosystem, and have formed specific judgments about every aspect of this skill.
