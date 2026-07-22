---
schema_version: 1
skill_id: skl_biopython-src-https-github-com-k-dense-ai-scientif-35c1c6e1-kills-5bdb6d39-skills-biopython-skill-md_35c1c6e1
source_hash: git_sha1:413f1129c851b42b4fe63ddcbc47575699fb94a7
analysis_version: 1
confidence: medium
updated_at: "2026-07-22T03:10:01.485Z"
---

# Biopython

This skill turns an agent into a passable Biopython user. It covers the library's greatest hits: sequence file I/O with SeqIO, sequence manipulation (transcription, translation, reverse complement), NCBI Entrez queries, BLAST search and result parsing, PDB protein structure analysis, phylogenetic tree handling via Phylo, and genome annotation work. Each topic gets a code example and a pointer to the official Biopython Tutorial and Cookbook for deeper coverage. It explicitly assumes the user knows their DNA from their RNA.

## Why it matters

This is a competent but thoroughly generic Biopython skill. The module coverage is broad (SeqIO, Entrez, BLAST, PDB, Phylo, genome annotations) which is exactly what you would get by skimming the Biopython Tutorial table of contents. There is no distinctive insight, no opinionated workflow, no pitfall warnings beyond what the official docs already say. You could swap this with any other Biopython skill card and get roughly the same result. Its only real advantage is that it exists: if you need an agent to remember Biopython API patterns without re-reading the manual every time, this does the job.

## Where it helps, where it hurts

**Best case:** A graduate student writing a script to batch-convert a directory of GenBank files to FASTA, extract coding sequences, translate them, and write a multi-FASTA of protein sequences. This skill gives the exact SeqIO idioms and Seq object methods needed, and the code comes out correct on the first attempt.

**Worst case:** An agent loads this skill, follows the Entrez fetching example verbatim, and starts hammering NCBI with unthrottled requests without setting an email address, triggering an IP block that shuts down access for the entire lab. The skill mentions Entrez but may not emphasize NCBI's usage policy (rate limiting, the mandatory email parameter). Another failure mode: the install instructions are frozen in time; six months from now, a dependency conflict makes them actively harmful.

## What it quietly assumes

Beyond the stated biology prerequisite, this skill assumes: (1) Biopython is installable in the execution environment; (2) the agent has read/write filesystem access for file I/O examples; (3) NCBI services are reachable and responsive with no fallback for offline use; (4) input files are well-formed and match expected formats with no error handling taught; (5) the user already knows which sequences or structures to work with. Most assumptions hold in standard academic bioinformatics setups (70-80% of cases), but degrade silently when they break.

## What could go wrong

**NCBI Entrez abuse:** The worst realistic outcome is an IP ban from NCBI. Entrez requires rate limiting and a mandatory email parameter. An unattended agent could generate thousands of requests and get the lab blacklisted.

**BLAST timeouts:** BLAST searches can run for minutes to hours. An agent running BLAST without a timeout could hang indefinitely.

**Silent sequence corruption:** Sequence methods like .translate() use a default genetic code (table 1). Non-standard organisms need different codes and the skill may not mention genetic code tables.

**File overwrites:** SeqIO write examples may use simple open() calls that overwrite original data without warning.

## Bottom line

This is a solid Biopython reference card, not a bioinformatics workflow skill. Pick it if you need an agent to remember API calls and you already know what you are doing. Skip it if you need experimental design guidance, error recovery, NCBI compliance, or organism-specific parameters. The single biggest risk is unattended Entrez abuse; the single biggest benefit is getting correct SeqIO code on the first try. In a catalog of 100 skills, this does not earn a spot; it is too generic and too easily replaced by reading the official tutorial.

## Confidence: medium

The artifact content was a summary description, not the full raw SKILL.md source. I can assess scope confidently but cannot verify the depth of code examples or presence of critical safety warnings.