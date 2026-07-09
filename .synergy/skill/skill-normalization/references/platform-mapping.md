# Platform Mapping

Preserve explicit platform-specific fields. Do not force all skills into Synergy-style semantic interpretation during normalization.

## Map Only Explicit Fields

- frontmatter `name` → canonical/display name candidate;
- frontmatter `description` → raw metadata or summary hint, not final analysis;
- folder/path → source identity;
- declared tools/permissions → provisional tool/risk hints only when explicitly stated;
- declared inputs/outputs → provisional schema fields only when explicit;
- workflow steps → raw metadata hint, not normalized capability taxonomy.

## What To Preserve

Preserve unmapped fields in raw metadata or curation notes when useful for downstream analysis. The goal is to keep evidence available, not to force a complete semantic model now.

## What Not To Infer

Do not convert workflow prose into capability arrays during normalization. Do not infer risk from a tool name unless the artifact explicitly describes the tool or permission. Do not infer domain taxonomy from a folder name alone.

Deep analysis owns semantic interpretation after reading the full artifact.
