---
schema_version: 1
skill_id: skl_esm-src-https-github-com-k-dense-ai-scientific-age-bf7566da-gent-skills-5bdb6d39-skills-esm-skill-md_bf7566da
source_hash: git_sha1:39c5678b8d830ed3ed44a7b518b5ab9b06beab1f
analysis_version: 1
confidence: medium
updated_at: "2026-07-22T03:47:43.266Z"
---

# ESM Protein Language Models

# ESM Protein Language Models

Teaches agents to use Meta AI's ESM family of protein language models via the fair-esm PyTorch library. Covers loading pre-trained models (ESM-1b, ESM-2, ESM-IF, ESMFold at 8M to 15B parameters), generating protein sequence embeddings, predicting 3D structure via ESMFold (~10x faster than AlphaFold2 at slightly lower accuracy), inverse folding to design sequences from backbone structures, and scoring mutation effects via evolutionary likelihoods.

## Why it matters

Occupies a genuinely narrow niche that almost no other agent skill covers — computational structural biology. The library is widely used and ESMFold's speed advantage is legitimately distinctive. But as a skill, this is a thin wrapper around API documentation. It doesn't teach protein biology fundamentals, doesn't explain when to choose one model over another, and doesn't provide judgment about when embeddings are informative versus noise.

## Where it helps, where it hurts

**Best case**: A computational biologist needs per-residue embeddings for 50,000 protein sequences from metagenomics for functional clustering. The skill correctly guides model selection (ESM-2 650M), batch processing, and embedding extraction.

**Worst case**: A clinician asks the agent to "predict whether this mutation is dangerous" and the agent loads this skill. The skill teaches mutation effect scoring via evolutionary likelihood — a zero-shot method that correlates with fitness effects but has no clinical validation. The agent confidently returns a score implying clinical significance. Someone makes a health decision on a computational proxy designed for protein engineering, not diagnostics.

## What it quietly assumes

PyTorch environment with CUDA GPU (CPU inference non-viable above 650M params). Apple Silicon has known installation friction. User understands protein sequence format and what embeddings are. User can distinguish four distinct model families with incompatible interfaces. These assumptions eliminate ~95% of potential users.

## What could go wrong

ESMFold produces plausible-looking PDB with confident pLDDT scores but a functionally critical region is wrong — the skill never discusses trust boundaries. Multi-gigabyte model downloads silently fill disks. GPU memory exhaustion loading multiple models. User should be present during interpretation, especially for anything potentially mistaken as clinical prediction.

## Bottom line

Narrowly useful for a narrowly defined audience. In a 100-skill catalog, doesn't earn a spot — the audience of agents needing protein language models but unable to read fair-esm docs is vanishingly small. Biggest risk: overinterpretation of mutation scores or structures by users unaware of limitations.

## Confidence: medium