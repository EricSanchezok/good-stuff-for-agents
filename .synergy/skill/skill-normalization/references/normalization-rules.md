# Normalization Rules

Normalization is identity work, not interpretation work.

## You Must

- Generate stable IDs deterministically.
- Preserve `source_id`, source path, declared name/title, content digest, and version identity.
- Preserve existing curation notes, analysis references, duplicate resolutions, aliases, pack references, and stable IDs.
- Classify each candidate as new, update, duplicate-needs-curation, rejected, or blocked.
- Keep records schema-valid with empty/unknown semantic fields when evidence is absent.
- Preserve enough provenance for deep analysis to recover the original artifact.

## You Must Not

- Infer capabilities from filenames alone.
- Infer tool/risk profile unless explicitly stated in the artifact.
- Convert workflow prose into final semantic taxonomy during normalization.
- Decide pack usefulness.
- Write deep qualitative claims.
- Treat source popularity or official status as proof of quality.
- Silently merge possible duplicates.

## Identity Inputs

Use these evidence points, in this order:

1. Existing canonical record with matching source_skill_id or stable source/path mapping.
2. `source_id` + source-relative path + declared name/title.
3. `content_digest` from the snapshot artifact.
4. Existing aliases or curation notes.
5. Platform metadata only when explicitly present.

Filename is supporting evidence only. Never use it as the sole basis for canonical identity.

## Semantic Fields

Capabilities, interfaces, tools, risk, workflow role, and quality confidence should remain empty/unknown unless explicitly stated in the candidate artifact or required by schema. Deep analysis owns real semantic interpretation.

Minimal honest records are preferred over richly populated guessed records.
