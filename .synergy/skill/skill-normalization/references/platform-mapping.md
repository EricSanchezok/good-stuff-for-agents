# Platform Mapping

Preserve platform-specific fields rather than forcing all skills into Synergy format.

Map common fields:

- frontmatter `name` → `canonical_name` and `display_name` candidate.
- frontmatter `description` → trigger semantics and summary evidence.
- folder/path → source identity.
- referenced tools or permissions → `tools` and `risk`.
- workflow steps → capabilities and workflow stages.

Unmapped fields stay in raw metadata or analysis notes.
