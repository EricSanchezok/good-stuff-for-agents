#!/usr/bin/env node
import { analysisPath, nowIso, sha256, toYaml, writeTextAtomic } from './lib/catalog-lib.mjs'
import { option, readJsonInput } from './lib/pipeline-cli.mjs'
import { analysisSchemaV2, validateAgainstSchema } from './lib/schema-validators.mjs'
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
const validated = assertAnalysisDraftMatchesDispatch(draft, envelope)
const skillId = envelope.binding.canonical_skill_id
const title = validated.title ?? skillId
const analysisVersion = validated.analysis_version ?? 1
const confidence = validated.confidence ?? 'unknown'
const updatedAt = validated.updated_at ?? nowIso()

const frontmatterRecord = {
  schema_version: 2,
  analysis_id: validated.analysis_id,
  skill_id: validated.skill_id,
  source_hash: validated.source_hash,
  analysis_version: analysisVersion,
  confidence,
  updated_at: updatedAt,
  created_by_run: envelope.run_id,
}

if (validated.claims) {
  frontmatterRecord.claims = validated.claims
} else {
  frontmatterRecord.claims = {
    requires: { required: [], optional: [] },
    produces: [],
    preconditions: [],
    refusal: [],
    failure_warnings: [],
    tool_constraints: [],
    alternatives: [],
    judgement: [],
  }
}
if (validated.notes !== undefined && validated.notes !== null) frontmatterRecord.notes = validated.notes

{
  const schemaResult = validateAgainstSchema(frontmatterRecord, analysisSchemaV2)
  if (!schemaResult.ok) {
    const details = schemaResult.errors.join('; ')
    throw new Error(`analysis v2 schema validation failed before write: ${details}`)
  }
}

const frontmatterYaml = toYaml(frontmatterRecord).trim()
const bodyContent = validated.body
const markdown = `---\n${frontmatterYaml}\n---\n\n# ${title}\n\n${bodyContent}`

claimAnalysisDispatch(envelope)
try {
  const target = analysisPath(skillId)
  writeTextAtomic(target, markdown)
  console.log(JSON.stringify({ path: target, hash: sha256(markdown), dispatch_digest: envelope.dispatch_digest }, null, 2))
} catch (error) {
  releaseAnalysisDispatchClaim(envelope)
  throw error
}
