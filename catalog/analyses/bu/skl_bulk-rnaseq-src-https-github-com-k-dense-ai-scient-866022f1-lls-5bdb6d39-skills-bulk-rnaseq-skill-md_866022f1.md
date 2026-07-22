---
schema_version: 1
skill_id: skl_bulk-rnaseq-src-https-github-com-k-dense-ai-scient-866022f1-lls-5bdb6d39-skills-bulk-rnaseq-skill-md_866022f1
source_hash: git_sha1:6a63f902bc142a131b07d1c7c4f7990d0d861b43
analysis_version: 1
confidence: high
updated_at: "2026-07-22T03:09:52.769Z"
---

# A Python-orchestrated bulk RNA-seq pipeline that wraps CLI tools via subprocess and bridges to R for differential expression

# Bulk RNA-seq Analysis (Python)

This is a workflow guide that strings together the standard bioinformatics toolchain for bulk RNA-seq — FastQC, STAR/HISAT2, featureCounts/HTSeq, and DESeq2 — all orchestrated from Python using subprocess calls. The rpy2 bridge to R/Bioconductor is the centerpiece architectural decision. It is, in essence, a Python wrapper around tools that were never designed to be called from Python.

## Why it matters — or doesn't

This skill is a competent but entirely unremarkable entry in a crowded field. End-to-end RNA-seq analysis is among the most thoroughly solved problems in bioinformatics — there are dozens of published pipelines, workflow-manager-based solutions (nf-core/rnaseq, bcbio-nextgen), and Galaxy wrappers that all cover the same ground. The Python-subprocess approach is a deliberate design choice that avoids workflow managers, but that choice is the skill's defining weakness: it prioritizes language familiarity over pipeline robustness. You could swap this with any other RNA-seq tutorial or pipeline guide and get roughly the same analytical result, with the important caveat that this one will fail more frequently and less gracefully than a workflow-manager-based alternative.

The one genuinely useful detail is the explicit attention to experimental design concepts — replicates, batch effects, contrasts — which many pipeline guides skip in favor of pure tool invocation. That said, covering these concepts in prose is not the same as encoding them into a pipeline that prevents design-violating analyses.

## Where it helps, where it hurts

**Best-case scenario**: A Python-fluent bioinformatician with 12-48 samples, all tools pre-installed and indexed on a well-configured HPC node or workstation, who needs a quick custom pipeline they can tweak in a language they already know. The experimental design is simple (two conditions, clear contrasts, no batch effects that can't be modeled with a single covariate). The user has already built the STAR index and has featureCounts annotation files ready. In this scenario, the skill provides a usable template that the user can modify without learning Nextflow or Snakemake.

**Worst-case scenario**: A bench biologist who has never used the command line drops this skill into an agent and says "analyze my RNA-seq data." The reference genome index hasn't been built (STAR index construction requires 30GB+ RAM and hours of runtime), R packages are missing or version-incompatible, the experimental design has nested batch effects that need mixed models rather than simple DESeq2 contrasts, and the FASTQ files have adapter contamination that FastQC catches but nothing in the pipeline addresses. The subprocess calls fail silently because Python's return-code checking is manual, the agent proceeds with partial output, and the user gets a volcano plot from garbage data. The result looks plausible to someone who doesn't know what to check, which is worse than an outright error.

## What it quietly assumes

This skill carries a heavy load of unstated assumptions that would break most real-world attempts:

**Tool installation** — assumes STAR, HISAT2, FastQC, featureCounts/HTSeq, samtools, R, and all Bioconductor dependencies are installed and on PATH. STAR alone has nontrivial system requirements (compiler toolchain, sufficient RAM, correct architecture-specific compilation). This assumption holds for perhaps 30% of would-be users — bioinformatics core facilities and experienced computational biologists, but not for the broader audience that a "Python pipeline" pitch attracts.

**Reference genome pre-indexed** — the pipeline assumes a STAR index already exists. Building a STAR index for a mammalian genome is a multi-hour, 30GB+ RAM operation that is not covered. This is like writing a cooking recipe that starts with "assume the souffle is already baked." It breaks completely for anyone starting from scratch.

**Unix-only** — stated explicitly, but the implication is that this skill is useless on Windows without WSL, which eliminates a large fraction of potential users in clinical and wet-lab settings.

**rpy2 stability** — the bridge between Python and R via rpy2 is historically brittle. R package version changes, Bioconductor release cycles, and Python-R type conversion edge cases all produce failures that are hard to debug. The skill assumes a stable rpy2 installation with compatible versions of R, DESeq2, and all transitive dependencies. I'd estimate this holds for 40% of environments without intervention.

**Simple experimental designs** — the skill mentions batch effects and contrasts, but DESeq2 is a linear-model-based tool that cannot handle complex hierarchical or crossed random effects. If your design requires limma-voom with duplicateCorrelation or a mixed model, this pipeline hits a wall. The skill does not warn about this boundary.

**The user understands what the tools do** — subprocess calls to STAR and featureCounts produce voluminous output with dozens of parameters that affect results. The skill provides the invocation but not the judgment needed to set parameters correctly for a given experiment type (stranded vs. unstranded, paired-end vs. single-end, gtf vs. gff annotation format compatibility).

When any of these assumptions fail, the skill degrades badly — not gracefully. The user gets opaque subprocess errors, missing output files, or silently wrong counts.

## What could go wrong

The risk profile here is genuinely concerning for an agent-loaded skill:

**Subprocess tool calls** — the worst realistic outcome is that STAR runs out of memory mid-alignment, writes a partial BAM file, returns a nonzero exit code, and the Python wrapper doesn't check the return code (or checks it but has no recovery path). The agent proceeds to quantification on corrupted alignment output and produces differentially expressed gene lists that are biologically meaningless. This is not hypothetical — it is the default failure mode of ad-hoc subprocess pipelines.

**Disk space exhaustion** — STAR's temporary files during alignment can consume hundreds of gigabytes for larger genomes. If the working directory is on a shared filesystem, this can affect other users. The skill provides no disk space checks or temp directory configuration.

**rpy2 bridge failures** — R's error handling is not Python's error handling. An R-side warning about convergence in DESeq2's dispersion estimation may not propagate to Python as an exception. The user gets results with a false sense of confidence. The worst outcome is a published figure based on an analysis that DESeq2 itself flagged as unreliable.

**No containerization** — unlike nf-core pipelines which pin tool versions in Docker/Singularity containers, this skill assumes whatever is on PATH. Tool version differences can produce quantitatively different expression estimates. Reproducibility claims would not survive peer review.

**User presence** — the user must be present to install missing tools, build indexes, resolve R package conflicts, and interpret DESeq2 diagnostics. This is not a fire-and-forget pipeline. An agent running this unattended will almost certainly hit a tool-missing or permission error and stall.

## Bottom line

I would not pick this skill for production RNA-seq analysis. Use nf-core/rnaseq, bcbio-nextgen, or even a well-maintained Snakemake pipeline instead — any of those give you containerization, restartability, resource management, and community-tested parameter defaults. The Python-subprocess approach is an architectural choice that trades all the hard-won lessons of reproducible bioinformatics for language convenience, and that trade is not worth making. The single biggest risk is silent analytical corruption from uncaught tool failures; the single biggest benefit is accessibility to Python programmers who refuse to learn even a minimal workflow language. In a catalog limited to 100 skills, this one does not earn a spot — there are multiple superior alternatives in the same domain, and the skill's design philosophy actively works against reproducibility.

## Confidence: high

I have extensive domain knowledge of bioinformatics pipeline design, the tools referenced (STAR, DESeq2, featureCounts, rpy2), and the common failure modes of ad-hoc shell-wrapping approaches. The skill's description is complete enough to assess its architectural decisions and practical limitations with conviction.