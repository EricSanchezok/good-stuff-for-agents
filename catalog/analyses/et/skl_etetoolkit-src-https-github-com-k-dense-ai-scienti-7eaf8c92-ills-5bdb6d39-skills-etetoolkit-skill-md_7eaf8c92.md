---
schema_version: 1
skill_id: skl_etetoolkit-src-https-github-com-k-dense-ai-scienti-7eaf8c92-ills-5bdb6d39-skills-etetoolkit-skill-md_7eaf8c92
source_hash: git_sha1:d34f9286daecf6a548d75027efbd6261d1514d14
analysis_version: 1
confidence: medium
updated_at: "2026-07-22T03:47:42.785Z"
---

# ETE Toolkit — Phylogenetic Tree Analysis

# ETE Toolkit

This skill teaches ETE Toolkit, a Python library for building, manipulating, and visualizing phylogenetic trees. Covers tree I/O (Newick/Nexus/PhyloXML), traversal and topology operations, evolutionary analyses (orthology/paralogy, distance, selection tests), metadata annotation, rendered visualization, and NCBI Taxonomy integration. The domain is evolutionary biology and comparative genomics.

## Why it matters

For evolutionary biologists, ETE is a legitimate workhorse handling major phylogenetic formats, real analytical operations, and NCBI integration. It fills a genuine gap — few agent skills cover phylogenetics. But as a skill artifact, the content is thin: a capability summary without pedagogical structure, worked examples, error-recovery guidance, or domain-specific judgment rules. A junior user needs to know that Newick format silently drops branch support values in certain parsers, or that midpoint rooting is heuristic — this skill says none of that.

## Where it helps, where it hurts

**Best case**: An agent alongside a senior bioinformatician who needs a publication-quality circular tree with taxonomic annotations. The skill saves them from remembering the ETE API surface.

**Worst case**: A grad student asks "are these genes orthologs?" The agent runs ETE's orthology detection without understanding that the default method assumes a known species tree and can silently produce nonsense. The agent reports confident but wrong orthology calls that propagate through downstream analysis.

## What it quietly assumes

User already understands phylogenetics (holds ~30% of time). Input data is already clean and correctly formatted (fails ~50% of time). Python, ETE, and NCBI connectivity available. Agent can distinguish good trees from bad trees (most dangerous assumption).

## What could go wrong

NCBI Taxonomy queries over network reveal research topics. Misleading visualizations that look professional but encode wrong evolutionary relationships. Silent orthology misclassification. User should validate all orthology/selection-test output.

## Bottom line

Identifies the right tool for a real audience but too shallow for safe use without a domain expert. In a tight 100-skill catalog, doesn't earn a spot in current form.

## Confidence: medium