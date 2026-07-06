#!/usr/bin/env node
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput(null)
const analyses = Array.isArray(input) ? input : input?.analyses ? input.analyses : input ? [input] : []
if (!Array.isArray(analyses) || analyses.length === 0) throw new Error('Provide an analysis draft or an object with an analyses array')

const records = []
for (const analysis of analyses) {
  assertAnalysisDraft(analysis)
  records.push(catalogData('write-analysis.mjs', analysis))
}

printResult({ written: records.length, records })

function assertAnalysisDraft(analysis) {
  if (!analysis || typeof analysis !== 'object') throw new Error('Analysis draft must be an object')
  if (!analysis.skill_id) throw new Error('Analysis draft is missing skill_id')
  const sections = analysis.sections ?? {}
  const required = ['core_purpose', 'trigger_semantics', 'capability_breakdown', 'workflow_role', 'inputs_outputs', 'tool_permission_profile', 'compatibility_notes', 'conflict_notes', 'dedupe_notes', 'evaluation_hooks', 'evidence_confidence']
  const missing = required.filter((key) => !sections[key])
  if (missing.length) throw new Error(`Analysis draft for ${analysis.skill_id} is missing sections: ${missing.join(', ')}`)
}
