---
schema_version: 1
skill_id: skl_scanpy-src-https-github-com-k-dense-ai-scientific-a83df46d-t-skills-5bdb6d39-skills-scanpy-skill-md_a83df46d
source_hash: sha256:0a574bb4576b371bcb0e9c8e67f7c5245881f045
analysis_version: 1
confidence: high
updated_at: "2026-07-10T01:24:05+08:00"
---

# scanpy (K-Dense scientific-agent-skills)

This is a comprehensive single-cell RNA-seq analysis skill built on top of Scanpy, but it is far more than a prompt reminding an agent what `sc.pp.normalize_total` does. Its real value is a bundled CLI toolkit — fifteen ready-to-run Python scripts that chain together via `.h5ad` files — plus a set of reference documents, templates, and an R-interop runbook. The skill is designed so an agent can run an entire scRNA-seq pipeline from raw counts to annotated cell types without writing Scanpy code from scratch.

## What makes it genuinely distinctive

Most "skills" for scientific tools are just API reference cards in prose form — they list function names and parameters and expect the agent to compose code. This skill is different because it ships a composable script toolkit where every stage (QC, normalization, PCA, UMAP, clustering, marker detection, annotation, pseudobulk) is a standalone `.h5ad`-in/`.h5ad`-out script with `--help`, and the whole thing chains together. You can run `run_pipeline.py` for a one-shot end-to-end analysis with a JSON config, or step through each script to inspect intermediate results. This is a design pattern that acknowledges a hard truth: asking an LLM to write multi-step scientific Python from scratch produces brittle code with silent statistical errors. The scripts enforce sensible defaults (raw count preservation, `autosave` instead of deprecated `save=`, `raw` layer management, the `counts` layer for pseudobulk) that even experienced single-cell analysts sometimes forget.

The scanpy API documentation portion is competent and covers the right ground — QC, normalization, HVG, PCA, neighbors, UMAP, Leiden clustering, `rank_genes_groups`, cell-type annotation, pseudobulk aggregation, trajectory inference, batch correction. It also captures important deprecations (`sc.tl.louvain` → Leiden, `save=` → `autosave`, Python 3.12+ requirement, anndata ≥0.10). None of that is novel; you could get it from the official docs. But the CLI scripts are not something you get from reading scanpy.readthedocs.io.

## Where it helps, where it hurts

**Best-case scenario**: You are an agent handed a `.h5ad` file (or a 10X directory, or even an R `.rds` Seurat object) and told "run a standard scRNA-seq analysis — QC, cluster, find markers, annotate cell types, give me UMAP plots and a marker table." You don't know the dataset's quality, you don't know what resolution to use, and you need to produce defensible results without silently corrupting the raw counts. Run `inspect_data.py` to orient yourself, then `run_pipeline.py` with `--scrublet` and a reasonable resolution. You get clustered data, marker CSVs, and figures in one command. If something looks wrong at the QC step, you can run the chain step-by-step. You will produce results that are methodologically sound by default — not perfect, but defensible.

**Worst-case / failure scenario**: You are working with a dataset that has a non-standard structure — perhaps a spatial transcriptomics dataset, a multi-modal (CITE-seq) experiment, an ATAC+RNA paired dataset, or a dataset where the batch effects are severe and require scVI rather than Harmony. The skill will still run its pipeline successfully and produce output. But it will produce output that is scientifically wrong because the pipeline is a standard scRNA-seq pipeline and you have non-standard data. The `--batch-method harmony` flag exists, but the skill won't tell you that Harmony fails badly with strong batch effects in certain designs — it just passes through to the script. The worse failure mode is that the pipeline completes without errors, generates publication-format figures, and you don't know enough to realize the underlying method was inappropriate. The quality of the output creates a false sense of validity.

## What it quietly assumes

It assumes your data is a standard 3'-end scRNA-seq experiment with well-formed cell barcodes and gene symbols as variable names. If your `.var_names` are Ensembl IDs, the mitochondrial gene detection (`adata.var_names.str.startswith('MT-')`) silently fails and you won't filter high-MT% cells. If you have human data where mitochondrial genes are prefixed `MT-`, this works; for mouse data (`mt-`), you need to adjust.

It assumes you have enough compute to run the pipeline locally. The skill mentions Dask support in passing but the scripts don't actually use Dask — they load everything into memory. A dataset with 500,000 cells will likely OOM on a laptop. The skill says "many functions support Dask arrays (experimental)" but doesn't wire that into the script toolkit.

It assumes R is installable on the agent's machine for `.rds` conversion. The `references/r_interop.md` runbook is included, but if you are on an air-gapped HPC node or a minimal Docker container without a C++ compiler, the Bioconductor installation chain will fail and you cannot convert Seurat objects. The skill provides no fallback Python-native `.rds` parser — you are fully dependent on R.

It assumes the user wants Leiden clustering at a resolution they can tune. If your scientific question requires something else — say, k-means for a specific comparison, or hierarchical clustering, or a community-detection method that handles disconnected components differently — the scripts don't expose those alternatives.

It assumes the agent can read Python tracebacks when something goes wrong and won't blindly retry. The scripts log progress, but error handling is Python's default — stack traces. An agent that doesn't know what `KeyError: 'leiden'` means after a failed clustering step will loop or hallucinate.

These are all reasonable assumptions for a standard scRNA-seq analysis skill. The mitochondrial gene prefix assumption is the most fragile — it will silently produce garbage if your organism doesn't match.

## What could go wrong

The script toolkit runs arbitrary Python on the agent's machine. The worst realistic outcome is data corruption — the pipeline overwrites the input `.h5ad` if you use `-o` with the same path (the scripts use standard read/write semantics; they won't refuse to overwrite). If you run `run_pipeline.py raw.h5ad -o raw.h5ad`, your raw data is gone. There's no `--no-clobber` flag.

The `batch_correct.py` script can produce silently misleading integration results. If Harmony overcorrects and merges biologically distinct clusters, or if BBKNN fragments real continua, the downstream clustering and annotation will look clean and publishable but be wrong. The user needs to be present to inspect pre- and post-integration UMAPs; the skill does not enforce this check — it just chains through.

The R interop path executes R scripts. A malicious or malformed `.rds` file won't execute arbitrary R code through `zellkonverter` or `SeuratDisk`, but the agent might try to inspect it with `readRDS()` and `summary()`, which does execute R. The runbook doesn't warn about this.

File system risks are moderate — scripts write figures to `./figures/` by default, which could clutter a workspace, but won't overwrite anything critical. The `sc.settings.autosave = True` setting means every plot call generates a file; a tight loop could fill a disk.

## Bottom line

This is the best scRNA-seq agent skill I've seen because it provides a defensible, script-based pipeline instead of just API documentation. The composable CLI toolkit with `--help` on every script means an agent can produce methodologically sound default results without composing error-prone scanpy code. The biggest risk is that its competence creates overconfidence — it will run successfully on data it shouldn't be applied to, and the output will look correct. If you have standard 3'-end scRNA-seq data and need a reproducible pipeline, pick this. If you have spatial, multi-modal, ATAC, or heavily batch-confounded data, skip it and use a tool-specific skill. In a tight catalog of 100 skills, this earns a spot — it covers a high-demand workflow with genuine engineering, not just prose.

## Confidence: high

I read the full source artifact, understand the scanpy ecosystem and single-cell analysis pitfalls, and have formed specific, concrete judgments about every claim above.
