---
schema_version: 1
skill_id: skl_cellxgene-census-src-https-github-com-k-dense-ai-s-7d8fdd5f-bdb6d39-skills-cellxgene-census-skill-md_7d8fdd5f
source_hash: git_sha1:4324ac74c0855b070dd8663061fa62d31b3553c6
analysis_version: 1
confidence: high
updated_at: "2026-07-22T03:11:52.177Z"
---

# cellxgene-census: A thorough but replaceable API cookbook for the CZ CELLxGENE single-cell data portal

# cellxgene-census

This skill is a detailed cookbook for programmatically accessing the CZ CELLxGENE Census — a versioned, cloud-hosted repository of 217+ million standardized single-cell and spatial transcriptomics profiles. It covers installation, metadata exploration, expression matrix queries (both in-memory and out-of-core), spatial data access, PyTorch integration via TileDB-SOMA-ML, and downstream scanpy workflows. Think of it as the official quickstart guide reformatted into an agent-loadable SKILL.md: correct, current, and workmanlike, but containing no insight you couldn't get from reading the package documentation yourself.

## Why it matters — or why it doesn't

This is a solid but unremarkable API wrapper skill. The code examples are clean, version-pinned (cellxgene-census==1.17.*, Census 2025-11-08 LTS), and cover the full surface area of the package. The emphasis on is_primary_data == True filtering and Census version pinning teaches the two most common footguns, which is genuinely useful. However, there is no unique methodology here — every pattern ("explore then query," "estimate size before loading," "use context managers") is standard practice for any large dataset API. You could swap this skill with the official cellxgene-census tutorial page and get roughly the same result. In a catalog that already includes the anndata and scanpy skills from the same source, this fills a specific slot in the single-cell pipeline but doesn't stand out on quality or originality.

## Where it helps, where it hurts

**Best-case scenario**: A bioinformatics researcher asks the agent, "which human tissues express FOXP2, and in which cell types?" Without this skill, the agent would need to discover the Census API, figure out filter syntax, learn about is_primary_data, and navigate the TileDB-SOMA object model through trial and error. With this skill loaded, the agent immediately composes a correct get_anndata() call with var_value_filter and obs_value_filter, runs it, and returns results in minutes instead of an hour of debugging.

**Worst-case scenario**: A clinician asks the agent to "find all COVID-19 patient T cells and compare them to healthy controls." The agent follows the skill's disease-filtering patterns faithfully. But the Census disease field uses ||-delimited multi-value strings, meaning a cell from a patient with both COVID-19 and diabetes won't match a naive equality filter the way the user expects. Worse, the Census contains data from dozens of labs with different isolation protocols, sequencing depths, and preprocessing pipelines — batch effects dominate the signal. The agent produces a statistically significant differential expression result that is biologically meaningless because it treated heterogeneous public data as a single experiment.

## What it quietly assumes

1. The Census backend is always online: Every code example assumes a live network connection to the CZ CELLxGENE S3-backed TileDB store. There's no guidance on local caching, offline fallback, or handling Census maintenance windows.

2. The user already knows single-cell biology: The skill teaches API mechanics, not domain reasoning. It assumes you understand what is_primary_data means biologically (cells can appear in multiple datasets as technical replicates), why you'd filter by tissue_general vs tissue, and what an Ensembl ID is.

3. Memory and disk are abundant: The 100k-cell threshold for switching from get_anndata() to out-of-core processing is mentioned but never justified — the actual memory footprint depends on the number of genes selected, which the skill doesn't help the agent estimate.

4. TileDB-SOMA version compatibility is handled elsewhere: The skill pins cellxgene-census==1.17.* but the TileDB-SOMA backend has had breaking API changes across versions. If the environment has a conflicting TileDB-SOMA install, the agent will hit inscrutable C++-level errors the skill can't help debug.

5. Network bandwidth is not a constraint: Moderate queries (50k cells x 2000 genes) can transfer gigabytes from S3. The skill offers no guidance on estimating transfer size, running partial queries, or handling timeouts on slow connections.

## What could go wrong

The skill needs Python package installation and general Python execution. The Census library makes outbound HTTPS connections to fetch data from cloud storage.

**Unintended massive downloads**: An agent that composes a query but forgets to apply var_value_filter will request every gene for every matching cell. For broad tissue queries, this can pull terabytes. In environments with egress charges (AWS, GCP), this is a real financial risk.

**Silent metadata mismatches**: The disease field's ||-delimited format means disease == COVID-19 will miss cells where COVID-19 is one of multiple listed conditions. The skill mentions this in a parenthetical note buried in the filter syntax section, but it's not highlighted as a primary pitfall. An agent that skims the document will produce systematically incomplete results and never know it.

**Disk exhaustion from saved results**: Nothing prevents the agent from repeatedly calling get_anndata() and writing multi-gigabyte .h5ad files to the workspace until the disk fills. The skill is silent on disk management.

**User presence**: Not required for query execution. The Python code runs autonomously. However, for queries exceeding ~100k cells, a human should verify the scope — the agent cannot judge whether "all brain neurons" is a reasonable request.

## Bottom line

This is a competent, well-maintained API cookbook for a specialized scientific data source. I'd load it over nothing, but I wouldn't load it over sending the agent to read the official cellxgene-census documentation — the skill adds convenience, not insight. The single biggest benefit is that it bundles the full query lifecycle (explore, fetch, analyze, troubleshoot) into one loadable context, saving the agent from discovering patterns through trial and error. The single biggest risk is that it makes Census queries frictionlessly easy while offering zero protection against domain-naive biological interpretation — an agent with this skill and a naive prompt is a statistically-correct-bullshit generator. In a tightly curated 100-skill catalog, this one doesn't earn a spot: it covers one niche data source, the official docs are excellent, and general-purpose scientific Python skills (anndata, scanpy) cover the downstream analysis this skill hands off to anyway.