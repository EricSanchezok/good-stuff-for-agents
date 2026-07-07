# Autonomous Discovery Policy

Use this policy before calling `source-discovery` from a growth run.

## Discovery Channels

Use public, non-invasive channels:

- GitHub search for `SKILL.md`, `.synergy/skill`, `.claude/skills`, Codex skills, reusable agent workflows, and agent operation guides;
- official docs for agent platforms and MCP ecosystems;
- public package registries or marketplaces when they expose skill-like metadata;
- community repositories only when provenance and license evidence can be recorded.

## Source Quality Threshold

Prefer sources with:

- public URL;
- clear license evidence or explicit reuse posture;
- maintained activity;
- parseable skill-like artifacts or high-quality agent SOP/workflow content;
- concrete trigger/procedure/input-output semantics;
- source provenance that can be revisited.

Avoid sources with private access, credential requirements, unclear licensing, sensitive material, raw prompt dumps without procedure, abandoned state, low-signal lists, or unsupported sync paths.

## Bounded Batch Defaults

For an empty catalog, inspect roughly 8-12 sources and activate or preview 3-6 only when they pass policy. Keep the rest as candidates, blocked, or rejected with reasons.

For a non-empty catalog, choose a smaller batch focused on stale coverage, missing domains, or demand spikes. The agent chooses the count from evidence quality and run budget; it does not ask the user.

## Evidence Required

For each accepted source, record search query or discovery path, URL, license evidence, parseability evidence, maintenance signal, duplicate check, and activation/rejection rationale.
