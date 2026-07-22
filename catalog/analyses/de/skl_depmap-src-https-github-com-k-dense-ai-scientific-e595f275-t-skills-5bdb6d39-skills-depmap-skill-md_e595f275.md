---
schema_version: 1
skill_id: skl_depmap-src-https-github-com-k-dense-ai-scientific-e595f275-t-skills-5bdb6d39-skills-depmap-skill-md_e595f275
source_hash: git_sha1:57bb0a17ac76bd9d5b9a50ca4b6a263647ab83a8
analysis_version: 1
confidence: medium
updated_at: "2026-07-22T03:27:59.584Z"
---

# DepMap Cancer Dependency Map Skill

# DepMap Cancer Dependency Map Skill

This skill teaches an agent how to interact with the Broad Institute's Cancer Dependency Map (DepMap), a large-scale functional genomics resource. It covers querying the DepMap Portal API for gene-level dependency scores (CERES and Chronos) derived from genome-wide CRISPR knockout screens, navigating cell line metadata including lineage and mutation status, downloading genome-wide datasets, and integrating DepMap data with CCLE expression and mutation profiles. The practical goal is enabling computational discovery of cancer-type-specific essential genes and synthetic lethal interactions.

## Why it matters

This is a solid but unremarkable domain-wrapping skill. It does not reveal new biological insight — it teaches an agent how to use a well-documented public API and a handful of standard bioinformatics data integration patterns. A competent computational biologist could reconstruct the same capability by reading the DepMap portal documentation and the CCLE data access guide. The skill adds value through convenience: it bundles the API endpoints, the data model (what CERES vs. Chronos scores mean and when to use each), and the integration logic with CCLE into a single retrievable unit. But if you already have a bioinformatics agent that knows how to read REST APIs and pandas, you could swap this with any equivalent DepMap wrapper and get the same result.

The genuinely distinctive element — if it exists in the source — would be guidance on the statistical interpretation of dependency scores. CERES and Chronos differ in how they normalize for copy-number effects, and a naive agent that treats them as interchangeable will produce garbage analyses. If the skill explains this distinction and warns about the pitfalls, that is its real value. If it only lists the endpoint names, it is a thin HTTP client tutorial wearing a lab coat.

## Where it helps, where it hurts

**Best-case scenario**: A researcher is designing a CRISPR screen follow-up experiment and has a hypothesis like "KRAS-mutant pancreatic cancers depend on gene X." You load this skill, query DepMap for the dependency scores of gene X across pancreatic cell lines stratified by KRAS mutation status, pull the matching CCLE expression data, and produce a ranked list of the most dependent lines with their associated molecular context. The skill saves the researcher 40 minutes of API spelunking and data wrangling. The output goes directly into an experimental design document.

**Worst-case scenario**: An agent loads this skill for a pan-cancer analysis and blithely applies Chronos scores across all lineages without understanding that different lineages have different screen qualities and that Chronos correction can introduce artifacts in certain copy-number regimes. The agent cheerfully reports a list of "pan-essential" genes that are actually artifacts of the normalization method, and the user spends six months pursuing a drug target that doesn't validate.

## What it quietly assumes

1. The user already understands the biology of CRISPR knockout screens. If an agent deploys this skill without knowing the difference between a true essential gene and a gene whose knockout score looks bad because of off-target effects or copy-number artifacts, results will be misleading. Holds for ~70% of the target audience but fails catastrophically for a generalist agent.
2. The DepMap API remains stable and accessible. DepMap releases new versions quarterly, and endpoints occasionally change. Holds for about 6-9 months before something breaks.
3. Cell line models are adequate proxies for patient biology. This is a field-wide assumption that has been debated for a decade and fails in roughly 30-50% of translational attempts.
4. The agent has network access to DepMap and CCLE servers. This skill is useless offline.

## What could go wrong

**API abuse and rate limiting**: The DepMap Portal API is publicly available but not designed for bulk programmatic access. An agent that naively iterates over all ~1,100 cell lines x ~18,000 genes will hit rate limits, get IP-banned, or rack up a substantial cloud egress bill for the DepMap team.

**Data misinterpretation without domain guardrails**: The agent could confuse CERES and Chronos scores, confuse gene dependency with gene expression, or interpret correlation as causation when integrating with CCLE expression data. The worst realistic outcome is a plausible-looking analysis with a fatal statistical error.

**User presence**: The user should be present for any analysis that generates claims about gene essentiality being shared with others or used for experimental planning.

## Bottom line

This is a competent but generic domain wrapper. For a catalog of 100 skills, I would not pick this one — a general-purpose "bioinformatics data integration" skill would cover the pattern. The single biggest risk is an agent producing confident statistical nonsense because the skill omitted caveats about dependency score interpretation.

## Confidence: medium

Did not read the full source artifact — working from the normalized description. The boundary between "thin wrapper" and "genuinely useful guide" hinges on content I cannot verify.