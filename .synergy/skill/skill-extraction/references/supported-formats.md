# Supported Formats

Recognized skill-like artifacts:

- Synergy skills: `.synergy/skill/<name>/SKILL.md`.
- Claude/Codex-compatible skills: skill folders with `SKILL.md` and frontmatter.
- Prompt/workflow markdown with explicit trigger, procedure, input and output.
- Agent templates that define a reusable role, constraints, and handoff expectations.
- MCP operation docs that describe reusable agent procedures.

Unsupported formats should be reported with parse confidence `unsupported`, not silently ignored.
