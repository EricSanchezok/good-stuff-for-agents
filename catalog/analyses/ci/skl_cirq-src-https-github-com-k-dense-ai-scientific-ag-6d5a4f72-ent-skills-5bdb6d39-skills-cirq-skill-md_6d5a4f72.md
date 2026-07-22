---
schema_version: 1
skill_id: skl_cirq-src-https-github-com-k-dense-ai-scientific-ag-6d5a4f72-ent-skills-5bdb6d39-skills-cirq-skill-md_6d5a4f72
source_hash: git_sha1:c9700a869ae7926f391d954a23e596049304c421
analysis_version: 1
confidence: high
updated_at: "2026-07-22T03:28:48.107Z"
---

# Cirq: Google's Quantum Computing Framework

# Cirq

This is a Cirq API reference sheet packaged as an agent skill. It provides correct-but-shallow code templates for building quantum circuits, running simulations, targeting Google and partner quantum hardware, modeling noise, and structuring variational experiments. If you already know quantum computing and just need to avoid hallucinating Cirq method signatures, it will help. If you need to learn quantum computing or debug a real hardware job, it will leave you stranded.

## Why it matters — or doesn't

There is nothing distinctive here. Every code snippet, every concept, and every hardware provider covered is a restatement of the official Cirq documentation at quantumai.google/cirq. The three "templates" (variational algorithm, hardware execution, noise study) are thin wrappers — conditional imports and environment-variable lookups that any competent agent could reproduce from the standard API reference. The skill covers breadth (qubits, gates, simulators, noise, hardware, transformations, experiments) but depth is nearly zero — each section is a few paragraphs followed by a pointer to a separate reference file.

Those reference files — references/building.md, references/simulation.md, references/transformation.md, references/hardware.md, references/noise.md, references/experiments.md — are the real content. And they are not bundled in the skill. The skill is a table of contents for a book that isn't here. An agent loading this skill gets landing pages, not the actual reference material.

## Where it helps, where it hurts

**Best case**: You're writing a VQE or QAOA implementation in Cirq, you know exactly which gates and simulators you need, and you want verified syntax so you don't waste three turns debugging a misspelled `cirq.depolarize` vs `cirq.depolarizing_channel`. The template code is syntactically correct, and the parameter sweep pattern with `sympy.Symbol` + `cirq.Linspace` + `run_sweep` works. You shave 10 minutes off a task you could have done anyway.

**Worst case**: You load this skill because a user asks you to "run this circuit on IBM's quantum computer" and you think the skill will help you compare Cirq vs Qiskit. It won't — it mentions Qiskit exactly once. Worse: you try the hardware execution template without realizing Google Quantum Engine requires an approved GCP project. The template function defaults to `processor_id='weber'` — a processor your project almost certainly doesn't have access to. You get a cryptic authentication error with no troubleshooting. Or you submit a 50-qubit circuit to the density matrix simulator and watch memory explode because `DensityMatrixSimulator` scales as O(2^2n).

## What it quietly assumes

- **Domain knowledge**: The skill never defines a qubit, a gate, superposition, measurement, or any quantum concept. Every paragraph presumes the reader understands what it's talking about. Reasonable for an expert audience but a hard failure otherwise.
- **Python 3.11+ with uv**: Uses `uv pip install`. Opinionated about tooling.
- **Cloud credentials are pre-configured**: Templates read environment variables with no guidance on obtaining or setting them.
- **Reference files exist**: The skill delegates detailed coverage to six separate Markdown files. An agent loading this skill gets none of them. The skill is a skeleton delivering ~15% of its promised value.
- **Cirq 1.6.1 specifically**: No compatibility guidance for other versions.
- **NISQ-era computing**: The focus on noise modeling and variational algorithms assumes we're in the noisy intermediate-scale quantum era. Correct for 2025-2026, but will age badly.

## What could go wrong

**Cost and access risk**: Hardware execution template can submit jobs to real quantum processors. Google Quantum Engine is restricted-access and costs money. The skill never mentions costs, rate limits, or queue times.

**Memory exhaustion**: The skill offers `DensityMatrixSimulator` alongside `Simulator` without clearly explaining the exponential memory cost difference. A 20-qubit density matrix simulation will attempt 2^40 complex numbers.

**Credential leakage**: Templates read from environment variables. If the agent writes code that logs or commits API keys or cloud project IDs, credentials end up in version control.

**Environment breakage**: The pinned version installs could downgrade or break existing dependencies.

**User presence**: Not needed for simulation work. Strongly recommended for hardware execution.

## Bottom line

This is a Cirq syntax cheat sheet — correct, broad, and shallow. But fundamentally incomplete: the reference files that contain the actual substance are absent. The official Cirq documentation covers everything here in more depth. In a catalog of 100 skills, this doesn't earn a spot — there are far more impactful scientific computing skills serving much larger audiences. The single biggest risk is the hardware execution path; the single biggest benefit is preventing Cirq API hallucinations during rapid prototyping.