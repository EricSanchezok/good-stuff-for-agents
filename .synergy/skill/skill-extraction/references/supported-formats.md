# Supported Formats

Recognized skill-like artifacts:

- Standard skill folders with `SKILL.md`.
- Claude/Codex-compatible skills: skill folders with `SKILL.md` and frontmatter.
- Prompt/workflow markdown with reusable instructions.
- README/docs sections that describe agent task execution.
- Agent templates that define a reusable role, constraints, process, and handoff.
- Task-specific checklists/templates that an agent can execute.
- Semi-structured workflow documents that contain enough procedural content for downstream analysis to judge.

Unsupported formats should be reported with parse confidence `unsupported` or an explicit skip reason, not silently ignored.

Do not add MCP as a special discovery direction here. If an MCP-related document contains reusable agent procedure, treat it like any other workflow doc; otherwise skip it as tool documentation.
