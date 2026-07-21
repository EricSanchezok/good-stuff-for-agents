#!/usr/bin/env node
import { analysisPath, nowIso, sha256, writeTextAtomic } from './lib/catalog-lib.mjs'
import { option, readJsonInput } from './lib/pipeline-cli.mjs'
import {
  assertAnalysisDraftMatchesDispatch,
  assertDispatchMatchesCatalog,
  claimAnalysisDispatch,
  loadAnalysisDispatch,
  releaseAnalysisDispatchClaim,
} from '../../skill-deep-analysis/scripts/lib/analysis-dispatch.mjs'

const draft = readJsonInput(null)
const dispatch = loadAnalysisDispatch(option('--dispatch'))
const envelope = assertDispatchMatchesCatalog(dispatch.envelope)
assertAnalysisDraftMatchesDispatch(draft, envelope)
const skillId = envelope.binding.canonical_skill_id
const bodyContent = draft.body ?? (() => {
  const sections = draft.sections ?? {}
  return `## Core Purpose\n${sections.core_purpose ?? 'Unavailable.'}\n\n## Trigger Semantics\n${sections.trigger_semantics ?? 'Unavailable.'}\n\n## Capability Breakdown\n${sections.capability_breakdown ?? 'Unavailable.'}\n\n## Workflow Role\n${sections.workflow_role ?? 'Unavailable.'}\n\n## Inputs / Outputs\n${sections.inputs_outputs ?? 'Unavailable.'}\n\n## Tool and Permission Profile\n${sections.tool_permission_profile ?? 'Unavailable.'}\n\n## Compatibility Notes\n${sections.compatibility_notes ?? 'Unavailable.'}\n\n## Conflict Notes\n${sections.conflict_notes ?? 'Unavailable.'}\n\n## Dedupe Notes\n${sections.dedupe_notes ?? 'Unavailable.'}\n\n## Evaluation Hooks\n${sections.evaluation_hooks ?? 'Unavailable.'}\n\n## Evidence and Confidence\n${sections.evidence_confidence ?? 'Unavailable.'}\n`
})()
const title = draft.title ?? skillId
const body = `---\nschema_version: 1\nskill_id: ${skillId}\nsource_hash: ${envelope.binding.git_blob_oid}\nanalysis_version: ${draft.analysis_version ?? 1}\nconfidence: ${draft.confidence ?? 'unknown'}\nupdated_at: ${JSON.stringify(draft.updated_at ?? nowIso())}\n---\n\n# ${title}\n\n${bodyContent}`
claimAnalysisDispatch(envelope)
try {
  const target = analysisPath(skillId)
  writeTextAtomic(target, body)
  console.log(JSON.stringify({ path: target, hash: sha256(body), dispatch_digest: envelope.dispatch_digest }, null, 2))
} catch (error) {
  releaseAnalysisDispatchClaim(envelope)
  throw error
}
