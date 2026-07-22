---
schema_version: 1
skill_id: skl_aeon-src-https-github-com-k-dense-ai-scientific-ag-14af17c5-ent-skills-5bdb6d39-skills-aeon-skill-md_14af17c5
source_hash: git_sha1:9638c1d271324c04b4828ec6a3e53dddcfd0b92f
analysis_version: 1
confidence: medium
updated_at: "2026-07-22T03:05:36.210Z"
---

# aeon Time Series ML — API Reference Skill

# aeon Time Series ML — API Reference Skill

This skill teaches an agent how to use the aeon Python library for time series machine learning. At its core, it is a condensed API reference covering classification, regression, clustering, and annotation workflows — essentially a cheat sheet for the aeon library's sklearn-compatible interface, plus pointers to UCR/UEA data loading and model selection patterns. Its value is real but narrow: it turns an agent that knows sklearn into an agent that can operate on labeled time series data using aeon-specific algorithms.

## Why it matters

The aeon library itself is a legitimate, actively maintained successor to sktime — one of the few serious open-source toolkits for time series ML. Shape-based, dictionary-based, interval-based, and deep learning classifiers for time series are genuinely distinct from tabular ML, and the sklearn-compatible API lowers the barrier. But as a *skill document*, the question is whether this provides insight beyond what the aeon documentation already does. The answer is almost certainly no. This reads like a distilled API reference — useful if you are mid-session and need the syntax without hunting through docs, but not something that encodes hard-won practitioner judgment. You could swap this with any other sklearn-ecosystem API reference skill and the template would be the same. The distinctiveness comes entirely from the domain (time series), not from the craft of the instruction.

## Where it helps, where it hurts

**Best-case scenario**: You are building a rapid classification pipeline for a well-known time series benchmark — say, classifying human activity from accelerometer data, or distinguishing between cardiac arrhythmia patterns from ECG readings. The data is already in UCR/UEA `.ts` format or easily reshaped into `(n_samples, n_timesteps)`. The agent loads this skill, follows the fit/predict pattern, tries a few algorithm families (shape-based for morphological patterns, interval-based for frequency-domain features), and delivers a working baseline in minutes. The skill genuinely accelerates that workflow.

**Worst-case / failure scenario**: The user says "I have sensor data, build me a predictive model," and the agent blindly loads this skill and applies time series classification. But the data is actually streaming, unlabeled, has irregular sampling, contains multiple channels with different sample rates, or the real problem is anomaly detection (not classification) on equipment telemetry. The skill says nothing about these failure modes. The agent produces a model that fits the sklearn API but is answering the wrong question entirely. Worse, if the data is large and the agent reaches for deep learning methods without understanding compute implications, it could burn through resources on a dead end.

## What it quietly assumes

- **Labeled, regularly-sampled time series data in numpy-compatible arrays.** This is the biggest hidden assumption. UCR/UEA archives are curated, balanced, and uniformly sampled. Real-world sensor data rarely is. This assumption holds for academic benchmarks but breaks for most production time series. When it breaks, the skill degrades silently — the API will accept the data but produce meaningless results.
- **Python 3.9+ with pip and network access.** Reasonable for development environments, unreasonable for air-gapped or production-restricted environments. Holds in roughly 80% of agent coding sessions.
- **The user already knows whether their problem is classification, regression, clustering, or annotation.** The skill covers all four task types but provides no decision framework for choosing among them. An agent without domain context could easily apply classification to a regression problem. This assumption fails frequently with novice users — perhaps 40% of the time.
- **Time series length is manageable in memory.** The sklearn-compatible `(n_samples, n_timesteps)` matrix assumes the data fits in RAM. For long physiological recordings or high-frequency sensor data, this assumption fails hard and the skill offers no escape hatch.
- **The agent has permission to install packages.** `pip install aeon` is assumed trivial. In sandboxed or enterprise environments, this may not be true.

## What could go wrong

- **Package installation conflicts.** `pip install aeon` pulls in numpy, scipy, numba, scikit-learn, and potentially CUDA dependencies. In an environment with existing pinned dependencies, this could break other packages. The worst realistic outcome: the agent breaks a user's working ML environment by upgrading a transitive dependency.
- **Network data loading.** Loading from UCR/UEA archives fetches data from remote servers. If the server is down, the URL has changed, or the user is offline, the workflow fails with a cryptic HTTP error. No fallback is described.
- **Computational cost without guardrails.** Time series deep learning classifiers can train for hours on CPU. The skill mentions deep learning approaches but says nothing about hardware requirements, training time expectations, or early stopping. An agent could launch a training job that ties up a laptop for the afternoon.
- **User presence needed?** No — and that is part of the risk. The agent can install packages, download data, and train models autonomously. If it chooses the wrong algorithm or misinterprets the task type, the user discovers the mistake only after compute has been spent and a wrong answer is delivered.

## Bottom line

This is a competent but generic domain reference skill. It earns its keep only if your catalog specifically serves time series practitioners who work with the aeon/sktime ecosystem. In a general catalog of 100 skills, I would not pick this over a broader sklearn pipeline skill that covers time series as one of many modalities. The single biggest benefit is that it gets an agent productive on time series benchmarks in under a minute. The single biggest risk is that an agent misapplies time series algorithms to problems that are not time series classification/regression, and does so silently because the skill offers no diagnostic guidance.

## Confidence: medium

I worked from a descriptive summary of the SKILL.md rather than the full source text. The description is detailed enough to form judgments about the skill's scope, assumptions, and risks, but line-level nuance — particularly around error handling, edge cases, and the depth of algorithm selection guidance — is not available to me.