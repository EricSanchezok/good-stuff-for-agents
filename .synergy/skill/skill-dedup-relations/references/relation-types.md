# Relation Types

Allowed canonical relation predicates:

- `same_as` — same logical skill; exact duplicate or approved duplicate resolution.
- `variant_of` — adapted variant with meaningful differences.
- `fork_of` — provenance fork from a known upstream.
- `supersedes` — newer record replaces older record.
- `overlaps_with` — capabilities overlap enough to affect pack design.
- `complements` — skills work better together in a workflow.
- `conflicts_with` — tools, instructions, assumptions, or outputs conflict.
- `requires_tool` — skill depends on a named tool or capability.
- `fits_workflow_stage` — skill maps strongly to a workflow stage.
- `input_enables` — one skill's output enables another skill's input.
- `belongs_to_domain` — skill is a strong fit for a domain.

Every edge must include `schema_version`, `subject`, `predicate`, `object`, `weight`, `evidence`, `source`, and `created_at`.
