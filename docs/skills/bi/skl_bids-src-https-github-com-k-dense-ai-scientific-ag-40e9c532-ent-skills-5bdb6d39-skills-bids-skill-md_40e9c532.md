# bids

> Ready to use

## Summary

# BIDS (Brain Imaging Data Structure)

This is a reference skill that encodes the BIDS standard — the dominant community convention for organizing and sharing neuroimaging datasets. It covers directory structure, naming rules, required metadata, modality-specific JSON sidecars, events files, the BIDS validator, DICOM-to-BIDS conversion tools, and programmatic access via pybids. If you need to organize, validate, or convert neuroimaging data in a way that any lab or toolchain will understand, this is the thing you want loaded.

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

This is an essential reference for a narrow, high-stakes domain. If your catalog is general-purpose, this is too niche. The biggest benefit is preventing an agent from inventing its own directory layout that no tool can read; the biggest risk is the agent mechanically applying brain-imaging conventions to the wrong kind of data, or silently corrupting files during DICOM conversion.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
