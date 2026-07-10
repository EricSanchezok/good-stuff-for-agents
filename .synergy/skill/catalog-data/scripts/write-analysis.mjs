#!/usr/bin/env node
import { analysisPath, nowIso, readDraft, sha256, writeTextAtomic } from './lib/catalog-lib.mjs'

const draft = readDraft(process.argv.slice(2))
const skillId = draft.skill_id
// Use the provided body (new 6-question flowing format) when available.
// Fall back to old 11-section construction only when a sections object is passed.
const bodyContent = draft.body ?? (() => {
  const sections = draft.sections ?? {}
  return `## Core Purpose\n${sections.core_purpose ?? 'Unavailable.'}\n\n## Trigger Semantics\n${sections.trigger_semantics ?? 'Unavailable.'}\n\n## Capability Breakdown\n${sections.capability_breakdown ?? 'Unavailable.'}\n\n## Workflow Role\n${sections.workflow_role ?? 'Unavailable.'}\n\n## Inputs / Outputs\n${sections.inputs_outputs ?? 'Unavailable.'}\n\n## Tool and Permission Profile\n${sections.tool_permission_profile ?? 'Unavailable.'}\n\n## Compatibility Notes\n${sections.compatibility_notes ?? 'Unavailable.'}\n\n## Conflict Notes\n${sections.conflict_notes ?? 'Unavailable.'}\n\n## Dedupe Notes\n${sections.dedupe_notes ?? 'Unavailable.'}\n\n## Evaluation Hooks\n${sections.evaluation_hooks ?? 'Unavailable.'}\n\n## Evidence and Confidence\n${sections.evidence_confidence ?? 'Unavailable.'}\n`
})()
const title = draft.title ?? skillId
const body = `---\nschema_version: 1\nskill_id: ${skillId}\nsource_hash: ${draft.source_hash ?? 'sha256:unknown'}\nanalysis_version: ${draft.analysis_version ?? 1}\nconfidence: ${draft.confidence ?? 'unknown'}\nupdated_at: ${JSON.stringify(draft.updated_at ?? nowIso())}\n---\n\n# ${title}\n\n${bodyContent}`
writeTextAtomic(analysisPath(skillId), body)
console.log(JSON.stringify({ path: analysisPath(skillId), hash: sha256(body) }, null, 2))
