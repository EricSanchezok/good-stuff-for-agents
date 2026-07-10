---
schema_version: 1
skill_id: skl_literature-review-src-https-github-com-k-dense-ai-53dfc208-db6d39-skills-literature-review-skill-md_53dfc208
source_hash: sha256:f225605ab9d166ff800ff25cf06bd241aaa5d940
analysis_version: 1
confidence: high
updated_at: "2026-07-10T22:00:00+08:00"
---

# literature-review (K-Dense scientific-agent-skills)

The most ambitious skill in this batch: a full 7-phase systematic literature review methodology with executable tooling for search, citation verification, and PDF generation. It does not just describe a workflow — it ships scripts that do parts of it. This is the skill equivalent of a research methods textbook with a companion software package. It is also opinionated to a fault, aggressively dependent on specific external tools, and built around a search strategy that will make academic librarians wince.

## What makes it genuinely distinctive

Three things set this apart from every other "how to do a literature review" guide I have seen in skill form.

First, it ships working scripts. `verify_citations.py` resolves DOIs against CrossRef and generates a verification report — this catches the most common citation error (wrong or broken DOIs) before it reaches a reviewer. `generate_pdf.py` renders markdown to PDF via pandoc with citation style selection (APA, Nature, Vancouver, Chicago, IEEE). `search_databases.py` deduplicates results by DOI. These are not stubs or pseudocode — they are actual Python tools the agent is expected to run.

Second, it quantifies quality thresholds that most guides leave vague. The citation-count table (20+ in 0-3 years = Noteworthy, 500+ in 7+ years = Seminal) and the venue tier system (Nature/Science/Cell are Tier 1, always prefer) give an agent concrete heuristics for prioritizing papers. This is the kind of tacit knowledge that experienced researchers absorb over years but is rarely written down.

Third, it demands visual output. The mandatory figure requirement ("⚠️ MANDATORY: Every literature review MUST include at least 1-2 AI-generated figures") is unusual and pushes reviews beyond wall-of-text documents. In practice this means PRISMA flow diagrams, thematic synthesis maps, and conceptual framework illustrations — things that genuinely improve a review but that most skills wouldn't enforce.

## Where it helps, where it hurts

**Best-case scenario**: An agent is tasked with producing a publishable systematic review in a biomedical domain. The researcher has defined a PICO question. The agent follows the 7-phase workflow: scopes with PICO, searches PubMed via gget + bioRxiv + Semantic Scholar + parallel-web, runs `search_databases.py --deduplicate`, screens in three passes (title → abstract → full text), creates a PRISMA flow diagram, extracts data into the review template, synthesizes thematically, runs `verify_citations.py` on every DOI, and generates a Nature-formatted PDF. The output is a well-structured review with verified citations, documented methodology, and publication-quality figures. This is genuinely useful output that saves days of manual work.

**Worst-case scenario 1 — dependency cascade failure**: The agent doesn't have `parallel-cli` installed and authenticated. The primary search tool is gone. The gget skill isn't loaded or doesn't have PubMed access configured. Pandoc isn't installed because the agent is in a sandboxed environment. XeLaTeX isn't available for PDF generation. Each missing dependency silently breaks a phase, and the skill provides no lightweight fallback for any of them. The agent ends up with a partially executed workflow and incomplete output, or worse, skips the broken phases entirely and generates a document that looks complete but has unverified citations and no systematic search methodology.

**Worst-case scenario 2 — mechanically correct, intellectually hollow**: The agent follows every phase exactly but doesn't understand the domain. It screens papers based on title keyword matching rather than scientific relevance. It groups studies into themes based on superficial terminology overlap. The citation verification passes (DOIs are real) but the cited papers don't actually support the claims. The PDF looks professional, the PRISMA diagram is beautiful, the references are verified — and the content is academic spam. This is the most dangerous failure mode because the output passes all mechanical quality checks.

**Worst-case scenario 3 — inappropriate methodology for the review type**: The skill pushes a full systematic review methodology (PRISMA, dual screening, quality assessment tools, mandatory figures) for every review. A narrative review for a grant proposal, a rapid scoping review for internal decision-making, or a background section for a research paper does not need Cochrane Risk of Bias assessments or PRISMA flow diagrams. An agent that follows this skill literally will spend days on ceremony that adds no value for these review types, and the mandatory figure requirement will produce unnecessary diagrams.

## What it quietly assumes

The `parallel-cli` tool is installed and authenticated. This is the PRIMARY search tool — the skill says "START HERE" — and it's called in nearly every phase. For many agent environments, `parallel-cli` is not available. The skill mentions it came from "parallel-web skill" but doesn't explain what that is or how to get it. If this tool is absent, the entire search strategy collapses to manual database queries, which the skill treats as secondary.

The review is biomedical. The PICO framework, PubMed/MeSH terms, Cochrane Risk of Bias, AMSTAR 2, and the entire database selection (PubMed, bioRxiv, COSMIC, AlphaFold) assume health sciences. If you're doing a literature review in computer science, the PICO framework is awkward, PubMed is irrelevant, and the venue tiers don't include top CS conferences (the skill lumps NeurIPS/ICML into Tier 2 as an afterthought). A CS literature review should start with DBLP/ACM Digital Library/IEEE Xplore, which the skill never mentions.

The agent can install system-level tools. Pandoc requires `brew install pandoc` or `apt-get install pandoc`. XeLaTeX requires a multi-gigabyte TeX distribution. These are not `pip install` operations — they need system package managers and may require admin access. In a sandboxed or containerized agent environment, neither is installable.

The agent can make expert judgments. The screening phases (title → abstract → full text) require domain knowledge to evaluate relevance. The quality assessment tools (Cochrane RoB, Newcastle-Ottawa, AMSTAR 2) require understanding of study design to apply correctly. The thematic synthesis phase requires identifying patterns across studies — this is a creative, cognitive task that the skill describes but cannot teach. The skill provides the checklist; it cannot provide the judgment.

The parallel-web search strategy is adequate for systematic review methodology. This is the most debatable assumption. The skill treats `parallel-cli search` with academic domain filtering as a primary search tool alongside PubMed. But web search engines do not support controlled vocabularies (MeSH), reproducible search strings, or exhaustive result retrieval. A systematic review for publication generally requires searching bibliographic databases (PubMed, Scopus, Web of Science, EMBASE) with documented, reproducible query strings. The skill's search strategy would not pass peer review at a journal that requires PRISMA-S compliance. For internal or student reviews, it's fine. For publication, it's not.

The `scientific-schematics` skill is available and the `OPENROUTER_API_KEY` is set. The mandatory figure generation depends on this entirely separate skill, which itself requires an API key. If either is missing, the "MANDATORY" requirement becomes impossible.

## What could go wrong

The dependency surface is large and fragile. `parallel-cli`, `gget`, `bioservices`, `datacommons-client`, `pandoc`, `xelatex`, `Python 3.x`, `requests`, `scientific-schematics`, and `OPENROUTER_API_KEY` — any single missing component breaks a phase. The skill provides no graceful degradation; missing tools produce silent phase failures.

Network: `parallel-cli search` makes web requests; `verify_citations.py` hits the CrossRef API; `gget` hits PubMed/NCBI. If any external service is rate-limited or down, the workflow stalls. CrossRef in particular has rate limits that a large review (100+ citations) can hit.

Filesystem: the workflow generates multiple intermediate files (`sources/*.json`, `figures/*.png`, `.md` and `.pdf` outputs). Disk usage is moderate but a review with 500+ papers and multiple schematic iterations could produce significant clutter. The `generate_pdf.py` script calls pandoc which calls xelatex which generates `.aux`, `.log`, `.out` temporary files — cleanup is not automated.

Credentialed access: `OPENROUTER_API_KEY` is listed as optional but the mandatory figure generation may require it. If the key is present, the agent is making paid API calls for schematic generation. There's no cost estimation or warning.

The `search_databases.py --deduplicate` deduplicates by DOI. Preprints and working papers may not have DOIs — the deduplication will miss them and inflate result counts.

The citation verification script hitting a broken DOI produces a failure report but doesn't fix the citation. The agent must manually correct each failure and re-run. For a review with 10% broken DOIs (not uncommon), this is tedious.

## Bottom line

This is a genuine workflow system, not a reference card. For an agent tasked with a formal systematic review in a biomedical domain with all dependencies available, it's the most comprehensive skill I've seen. The scripts, quality thresholds, and structured phases produce output that would take days to assemble manually. But the dependency chain is fragile, the search strategy is methodologically questionable for publication-grade work, and the skill cannot supply the domain judgment required for meaningful synthesis. The mandatory figure requirement is overreach — good for some reviews, inappropriate for others, impossible without the scientific-schematics skill. In a tight 100-skill catalog, I'd keep this because literature review is a high-frequency academic task and no competitor skill comes close to this level of tooling. But I'd flag that it needs a companion covering traditional bibliographic database search (Web of Science, Scopus, controlled vocabularies) for users who need peer-review-grade methodology.

## Confidence: high

I read the full 29KB source, understand systematic review methodology and the academic publishing ecosystem, and have formed concrete, specific judgments about every claim above.
