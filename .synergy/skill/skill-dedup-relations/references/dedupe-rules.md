# Dedupe Rules

## Identity vs Relations

Identity deduplication belongs to `skill-normalization`. It resolves whether two candidates are the same logical skill using source_id, path, declared_name, and content_digest.

Relations handles what remains after identity is resolved: two distinct canonical skills and their actual relationship — do they chain, strengthen, conflict, or serve as alternatives?

Do not use relations to re-litigate identity questions. If two skills have different canonical_skill_ids, they are distinct records. Your job is to judge how they relate, not whether normalization should have merged them.

## When to use `alternatives`

`alternatives` applies when two skills' analyses describe solving the same core task, but with meaningfully different methods, target platforms, or depth. Evidence must cite specific analysis claims, not names or domains.

Examples:

- Both describe "code review" — one is checklist-based (lightweight, fast), the other is a structured questioning technique (deep, slow). Same task, different approach. → `alternatives`
- Both target "scientific figure generation" — one is matplotlib (general, script-driven), the other is a specialized biological-visualization library (domain-specific, guided). Same output goal, different tools. → `alternatives`

Counter-examples — these are NOT alternatives:

- One does "single-cell clustering" and another does "UMAP visualization". Different tasks, same domain. → check for `chains_with`
- Both mention "Python" in their descriptions. Same language, unrelated tasks. → no edge

## Preserve

- source IDs and source skill IDs
- version IDs
- provenance paths and refs
- curation notes
- published pack references

Never delete a skill record because it appears to duplicate another. Use `alternatives` edges instead.
