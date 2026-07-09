---
schema_version: 1
skill_id: skl_database-lookup-src-https-github-com-k-dense-ai-sc-36d0e673-5bdb6d39-skills-database-lookup-skill-md_36d0e673
source_hash: sha256:94632fc658a34680f61ed360e4a305f301825835
analysis_version: 1
confidence: high
updated_at: "2026-07-10T01:24:00+08:00"
---

# Database Lookup (K-Dense)

This skill is a retrieval methodology disguised as a database directory. It catalogs 78 public scientific APIs — from PubChem to FRED to SIMBAD — but the real payload is the disciplined workflow it imposes: define the query contract, select the authoritative source, plan filter semantics, make bounded API calls, treat responses as untrusted data, and return results with auditable provenance. This is not "look up X on the web." This is "retrieve X from the canonical database under conditions another researcher could reproduce."

## Why it matters

Most "database lookup" skills are thin wrappers around a search tool — they tell the agent to call an API and show results. This skill is different. It treats every retrieval as an evidence-producing operation with a chain of custody. The provenance requirements (endpoints, parameters, access date, count reconciliation) and the count-before-retrieval discipline for exhaustive queries are features I haven't seen in any other skill in this domain. The identifier resolution guide — gene symbols to NCBI IDs to Ensembl IDs, compound names to PubChem CIDs to ChEMBL IDs — encodes cross-database knowledge that would otherwise require the agent to already know the domain deeply.

That said, the skill's value is asymmetric: it's extraordinary for scientific and regulatory lookups where provenance matters, but it would be overkill — even wasteful — for someone who just wants the current temperature or a stock price. The skill knows this and distinguishes "targeted lookup" from "exhaustive retrieval," but agents may not exercise that judgment well.

## Where it helps, where it hurts

**Best-case scenario:** A computational biologist asks "retrieve all known protein-protein interactions for TP53 from curated databases, filtering for human and experimental evidence." The skill marshals STRING and BioGRID, converts the gene symbol to NCBI Gene ID 7157 and STRING identifier 9606.ENSP00000269305, paginates both APIs with proper rate limiting, reconciles counts, and returns a table with provenance — endpoints called, date, identifier conversions, and a warning that BioGRID returned 23 fewer records than STRING because it only indexes curated physical interactions. The result is reproducible, the gaps are disclosed, and the downstream analysis can account for the differences.

**Worst-case scenario:** An agent tries to use this skill to do an exhaustive retrieval of "all chemical compounds similar to caffeine" across PubChem, ChEMBL, and ZINC without a plan. The skill says "ask for confirmation before exceeding 10,000 records or 100 API calls," but the agent (or the reference files for those databases) may not surface the actual cost. ZINC has billions of purchasable compounds — a similarity search with loose thresholds could burn rate limits, hit API ceilings, or produce a 500MB result the agent can't process. The skill's guardrails (count first, estimate cost) assume the reference files actually document how to get counts for similarity searches, which many won't. The agent could also fail silently on identifier resolution — feeding a compound name to PubChem, getting back a CID for a salt or isomer instead of the parent compound, and never realizing the downstream results are wrong.

## What it quietly assumes

The biggest hidden assumption is that all 78 reference files exist, are maintained, and contain actionable endpoint details. The SKILL.md refers to `references/pubchem.md`, `references/chembl.md`, etc. — but a stale reference file is worse than none, because the agent will follow outdated parameters with confidence. The skill's quality is entirely downstream of its references directory.

Second, it assumes the agent has the metacognitive ability to know when it's out of its depth. The skill says "if a required scientific constraint is missing and affects correctness, ask a clarifying question rather than guessing." But most agents don't know what a "required scientific constraint" looks like in, say, a viral sequence retrieval with host/taxonomy/date/genome-segment filters. An agent that doesn't realize it's missing information won't ask.

Third, it assumes the agent platform has a working HTTP fetch tool. The skill lists WebFetch, web_fetch, read_url_content, and curl as fallback. In practice, some platforms have broken or restricted web fetch, and the curl fallback requires bash access. The POST-only section (Open Targets, gnomAD, GDC, RummaGEO, SEC EDGAR) notes that WebFetch can't handle these — and if curl is also unavailable, those databases are simply unreachable. No fallback is offered for that case.

Fourth, there's a subtle assumption about the user: that they care about reproducibility. For a researcher building a dataset for publication, the provenance requirements are essential. For an executive asking "what's the GDP of France," they're noise. The skill doesn't help the agent calibrate rigor to the user's actual needs.

## What could go wrong

The skill needs curl/bash access for POST-only APIs and for any platform without a native fetch tool. The worst realistic outcome from curl misuse is command injection: an agent concatenates a user-provided SMILES string like `CCO); rm -rf /` into a curl URL without encoding, and the shell interprets it. The skill does include a "Query Construction Safety" section that warns against this, but it's advisory, not enforced — if the reference file for a specific database doesn't repeat the encoding rules, the agent may skip them.

API key exposure is a real risk. The skill's key-loading protocol (silent presence test, narrow .env inspection, never echo the value) is well-designed, but agents routinely leak environment variables by printing them in debug output or including them in error messages. The skill can't prevent an agent from being sloppy.

Rate-limit violations could cause IP blocks. The skill documents rate limits (NCBI: 3 req/sec, Ensembl: 15 req/sec, BLS: 25/day) but doesn't enforce them mechanically — it relies on the agent to read and follow the reference file. A single enthusiastic parallel fetch across 5 NCBI endpoints could exceed the rate limit before the first response even arrives.

There's also a quiet cost risk for services like Alpha Vantage (free tier has daily caps) and OpenWeatherMap. The skill flags which databases need API keys but doesn't surface quota limits per service. An exhaustive forex retrieval could exhaust a free Alpha Vantage key in one session. The user doesn't need to be physically present for every call, but they should be present before any bulk retrieval crosses the 100-request threshold the skill defines.

## Bottom line

This is the best database-lookup skill I've analyzed for scientific and regulatory domains. Its reproducibility contract — explicit provenance, count reconciliation, filter transparency — is genuinely distinctive and raises the bar for what agent-assisted research retrieval should look like. The biggest risk is that its quality depends on 78 separate reference files maintained outside the skill itself; a stale or thin reference file for a specific database silently degrades the entire retrieval pipeline. The biggest benefit is that it transforms the agent from a search engine into a research instrument. This skill earns a spot in any tight catalog as the canonical entry for structured, auditable public-database retrieval. If the reference files are well-maintained, there is no real competitor.

## Confidence: high

I read the complete source artifact — all 78 database entries, the core workflow, the identifier resolution table, the safety and pagination rules, and the provenance requirements. The skill's design philosophy is clear and internally consistent, and I would defend these judgments to the author.
