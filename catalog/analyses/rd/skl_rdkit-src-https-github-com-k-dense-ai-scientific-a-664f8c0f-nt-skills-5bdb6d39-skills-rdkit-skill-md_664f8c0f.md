---
schema_version: 1
skill_id: skl_rdkit-src-https-github-com-k-dense-ai-scientific-a-664f8c0f-nt-skills-5bdb6d39-skills-rdkit-skill-md_664f8c0f
source_hash: sha256:2a5363cbabcbb0017e0ad5b1360f95ef44a765a6
analysis_version: 1
confidence: high
updated_at: "2026-07-10T01:25:00+08:00"
---

# RDKit Cheminformatics Toolkit

This skill is a curated API reference and usage guide for RDKit, the dominant open-source cheminformatics library. It does not perform any molecular computation itself — it teaches an agent how to write RDKit Python code. It covers the standard surface area: molecular I/O, descriptors, fingerprints, substructure search, reactions, conformer generation, and visualization, plus common workflow templates (drug-likeness screening, similarity search, substructure filtering). For anyone who has used RDKit before, the content is familiar territory with no surprises.

## Why it matters — and why it doesn't

The skill's strongest section is its documentation of version-sensitive behavior changes across RDKit releases (2024.09 through 2026.03). Concrete examples: canonical SMILES stereo handling changed in 2026.03, tautomer hash outputs changed in 2024.09, legacy drawing functions were removed. These are sharp-edged details that matter when molecular identifiers are persisted in a database or used in a regulatory pipeline. That section alone is more practically useful than most RDKit references I have seen embedded in agent skills.

Everything else is competent but unremarkable. The code examples are correct, well-organized, and cover the major RDKit modules. They mirror what you would find in the official RDKit Cookbook or Getting Started guide, condensed and reorganized for an agent's consumption. If you replaced this skill with any other RDKit reference skill, you would get roughly the same code output. The `datamol` wrapper is mentioned in the description as an alternative for simpler workflows, but the skill never returns to that distinction — a missed opportunity to actually help an agent choose between tools.

The skill references three bundled files (`api_reference.md`, `descriptors_reference.md`, `smarts_patterns.md`) and three example scripts that are not included in the source artifact I analyzed. Those references are either downstream resources the agent must locate or content from outside the skill's SKILL.md. Their absence means the skill's actual value depends heavily on files I cannot evaluate here.

## Where it helps, where it hurts

**Best-case scenario:** You are an agent tasked with building a molecular screening pipeline. You need to read an SDF file, calculate Lipinski descriptors, generate Morgan fingerprints, and cluster molecules by Tanimoto similarity. You know the concepts but not the exact RDKit API calls. This skill gives you correct, copy-adaptable code for every step along that path, including the `ForwardSDMolSupplier` for memory-efficient file reading and the `BulkTanimotoSimilarity` call for vectorized comparison. You finish faster than reading the official docs because the examples are curated for exactly this kind of sequential workflow.

**Worst-case scenario:** You are an agent debugging a molecule that RDKit refuses to parse — maybe a weird valence state from a docking output, or a non-standard aromaticity model from another tool. The skill mentions `DetectChemistryProblems()` and sanitization options, but it does not teach diagnostic reasoning. An agent that trusts this skill as its sole authority will try `sanitize=False`, then `Chem.SanitizeMol()`, hit the same error, and stall. The skill also makes you confident about version-specific behavior, but if your environment runs RDKit 2024.03 or an older conda-forge build, the version notes about 2026.03 are irrelevant and potentially misleading. You might avoid an API that actually works fine for you, or use one that silently changed.

## What it quietly assumes

- **RDKit is already installed or installable via conda/uv.** The installation section is a few lines. If the agent is in a locked-down environment without conda-forge or uv, or on a platform where RDKit wheels are unavailable, this skill offers no fallback.
- **Python-only.** Every example is Python. RDKit has C++, Java, and JavaScript wrappers; none are acknowledged.
- **The molecules you process are well-behaved.** The skill covers sanitization failures but assumes the user's molecules are fundamentally valid chemical graphs. It does not prepare an agent for the genuinely pathological inputs that cheminformaticians encounter: corrupted SDF files, molecules with absurd ring systems, or valence models from quantum chemistry codes that RDKit rejects.
- **The agent has filesystem write access.** SDF writing, PNG rendering to file, and JSON caching of binary molecules all assume a writable workspace. In a sandboxed environment, these examples will fail.
- **The agent understands cheminformatics concepts.** The skill uses terms like "Morgan fingerprint," "Murcko scaffold," "kekulization," and "Tanimoto similarity" without defining them. An agent without cheminformatics background will copy code it does not understand, which is dangerous when interpreting results.
- **The bundled references exist and are current.** The three reference files (`api_reference.md`, `descriptors_reference.md`, `smarts_patterns.md`) are named but not included in the source artifact. The skill's quality depends on content I cannot assess.

Most of these assumptions are reasonable for the intended audience — a computational chemist or cheminformatics researcher working in a Python environment. The Python-only assumption holds broadly since RDKit's Python bindings are the dominant interface. The filesystem assumption is reasonable for local development but will trip up sandboxed agents.

## What could go wrong

The skill allows `Read`, `Write`, `Edit`, and `Bash`. The real risks cluster around two areas:

**Environment damage via Bash.** The `uv pip install rdkit` or `conda create -c conda-forge` commands can silently upgrade or conflict with existing packages. RDKit has nontrivial binary dependencies (Boost, numpy linkage). Installing it into an existing environment that already has a different RDKit version, or a conflicting numpy build, can corrupt the environment in ways that produce segfaults rather than clean error messages. The skill warns about mixing conda and PyPI installs but offers no recovery guidance.

**Data corruption via Write.** The SDF writer example (`Chem.SDWriter('output.sdf')`) will silently overwrite any existing file at that path. In a cheminformatics workflow, that file is often the result of hours of computation. The skill does not warn about this. Similarly, the JSON binary caching example writes to `molecules.rdmol.json` without existence checks. An agent following this pattern could overwrite a curated molecular dataset.

**Pickle safety.** The skill explicitly warns against loading pickle files from untrusted sources and recommends SMILES/SDF for interchange. This is responsible. However, the skill also shows how to write RDKit binary payloads to JSON via base64, which is safer but not a standard format — another agent reading that file later without this skill would not know how to deserialize it.

The user does not need to be present for these risks to materialize. An agent running autonomously could install conflicting packages, overwrite data files, and produce output in a non-standard serialization format without any human noticing until the results are consumed downstream.

## Bottom line

This is a solid, well-organized RDKit reference skill for agents that already know cheminformatics and need API-level guidance. The version-sensitive behavior section is genuinely valuable and reflects real RDKit evolution. But for a tight catalog of 100 skills, this would not earn a spot — it is too generic, too Python-specific, and overlaps too heavily with the official RDKit documentation and other RDKit reference materials. The biggest risk is an agent treating a 2026 snapshot as authoritative for a different RDKit version. The biggest benefit is the curated, sequential code examples that mirror real cheminformatics workflows better than the official docs' scattered API pages.

## Confidence: high

I read the full source artifact and understand RDKit's API surface and the cheminformatics domain well enough to judge which parts of this skill are genuinely distinctive and which are standard reference material.
