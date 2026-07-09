# Extraction Rules

Extract candidates when there is enough evidence for a reusable skill-like unit. Extraction preserves evidence; it does not judge final value.

## Discovery Alignment

Discovery may hand off structured, semi-structured, or promising-unstructured sources. Extraction must not shrink that input back to standard SKILL.md only.

Candidate evidence is sufficient when the artifact has:

- a title/name or clearly inferable task label;
- a stable source path or URL;
- a content digest;
- enough procedural content for a downstream agent to read and judge.

Do not require perfect trigger/procedure/input/output structure at extraction time. If the artifact is plausibly a reusable agent workflow, preserve it and let deep analysis decide its real value.

## Minimum Candidate Evidence

A candidate should preserve:

- name or declared title when available;
- source path or stable artifact URL;
- format;
- parse confidence;
- raw metadata when available;
- content digest;
- enough provenance for deep analysis to recover the original artifact.

## What Extraction Must Not Do

Do not normalize domains, capabilities, quality, tools, risk, relations, workflow role, or pack membership during extraction.

Do not infer semantic identity from filenames. A filename can help locate an artifact, but it does not prove what the skill actually does.

Do not discard unsupported or ambiguous artifacts silently. Report them with parse confidence or skip reason so discovery/sync can be improved later.
