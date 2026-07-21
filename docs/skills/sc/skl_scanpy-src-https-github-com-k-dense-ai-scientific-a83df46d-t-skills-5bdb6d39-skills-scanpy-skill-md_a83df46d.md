# scanpy

> Ready to use

## Summary

This is a comprehensive single-cell RNA-seq analysis skill built on top of Scanpy, but it is far more than a prompt reminding an agent what `sc.pp.normalize_total` does. Its real value is a bundled CLI toolkit — fifteen ready-to-run Python scripts that chain together via `.h5ad` files — plus a set of reference documents, templates, and an R-interop runbook. The skill is designed so an agent can run an entire scRNA-seq pipeline from raw counts to annotated cell types without writing Scanpy code from scratch.

## Source

- Source: K-Dense Scientific Agent Skills
- License: MIT (verified)

## Capabilities

- Domains: —
- Task types: —
- Best stage: —
- Capabilities: —

## Best Used For / Not For

Use when the trigger semantics and task stage match the job. Do not use when required tools, permissions, license, or confidence do not fit the current run.

## Inputs / Outputs

- Inputs: —
- Outputs: —
- Handoff outputs: —

## Related Packs

No published packs use this skill yet.

## Related Skills

No related skills are public yet.

## Public Analysis Summary

This is the best scRNA-seq agent skill I've seen because it provides a defensible, script-based pipeline instead of just API documentation. The composable CLI toolkit with `--help` on every script means an agent can produce methodologically sound default results without composing error-prone scanpy code. The biggest risk is that its competence creates overconfidence — it will run successfully on data it shouldn't be applied to, and the output will look correct. If you have standard 3'-end scRNA-seq data and need a reproducible pipeline, pick this. If you have spatial, multi-modal, ATAC, or heavily batch-confounded data, skip it and use a tool-specific skill.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
