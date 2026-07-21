#!/usr/bin/env node
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const draft = readJsonInput(null)
if (!draft || typeof draft !== 'object') throw new Error('Provide a reviewed pack candidate draft')
assertCandidateControlFields(draft)
assertPackDraft(draft)
const record = catalogData('write-pack-record.mjs', draft)
printResult({ written: true, pack_id: record.pack_id, record })

function assertCandidateControlFields(draft) {
  if (Object.hasOwn(draft, 'status') && draft.status !== 'candidate') {
    throw new Error('Pack candidate draft status must be candidate')
  }
  const controlledFields = new Set(['record_bucket', 'published_at', 'output_path', 'expected_path', 'destination'])
  for (const field of Object.keys(draft)) {
    if (controlledFields.has(field) || /^promot(?:e|ed|ion)/.test(field)) {
      throw new Error(`Pack candidate draft must not include controller field ${field}`)
    }
  }
}

function assertPackDraft(draft) {
  if (!draft.pack_id) throw new Error('Pack draft is missing pack_id')
  if (!draft.name) throw new Error(`Pack draft ${draft.pack_id} is missing name`)
  if (!draft.intent) throw new Error(`Pack draft ${draft.pack_id} is missing intent`)
  if (!draft.domain) throw new Error(`Pack draft ${draft.pack_id} is missing domain`)
  if (!Array.isArray(draft.members) || draft.members.length === 0) throw new Error(`Pack draft ${draft.pack_id} must include reviewed members`)
  for (const member of draft.members) {
    if (!member.skill_id) throw new Error(`Pack draft ${draft.pack_id} has a member without skill_id`)
    if (!member.version_id) throw new Error(`Pack draft ${draft.pack_id} member ${member.skill_id} is missing version_id`)
    if (!member.role) throw new Error(`Pack draft ${draft.pack_id} member ${member.skill_id} is missing role`)
    if (!member.stage) throw new Error(`Pack draft ${draft.pack_id} member ${member.skill_id} is missing stage`)
    if (!member.inclusion_reason) throw new Error(`Pack draft ${draft.pack_id} member ${member.skill_id} is missing inclusion_reason`)
  }
  if (!draft.workflow || typeof draft.workflow !== 'object' || Array.isArray(draft.workflow)) {
    throw new Error(`Pack draft ${draft.pack_id} must include structured workflow object with stages`)
  }
  if (!Array.isArray(draft.workflow.stages) || draft.workflow.stages.length === 0) {
    throw new Error(`Pack draft ${draft.pack_id} workflow.stages must be a non-empty array`)
  }
  for (const stage of draft.workflow.stages) {
    if (!stage || typeof stage !== 'object') throw new Error(`Pack draft ${draft.pack_id} has a non-object workflow stage`)
    if (!stage.name && !stage.stage) throw new Error(`Pack draft ${draft.pack_id} workflow stage is missing name or stage`)
    if (!stage.description) throw new Error(`Pack draft ${draft.pack_id} workflow stage ${stage.name ?? stage.stage} is missing description`)
  }
  const compatibility = draft.compatibility
  if (!compatibility || typeof compatibility !== 'object' || Array.isArray(compatibility)) {
    throw new Error(`Pack draft ${draft.pack_id} must include compatibility notes or evidence arrays`)
  }
  const hasCompatibilityEvidence = Boolean(compatibility.notes)
    || nonEmptyArray(compatibility.complements)
    || nonEmptyArray(compatibility.overlaps)
    || nonEmptyArray(compatibility.conflicts)
    || nonEmptyArray(compatibility.unresolved)
  if (!hasCompatibilityEvidence) {
    throw new Error(`Pack draft ${draft.pack_id} compatibility must include notes or a non-empty evidence array`)
  }
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0
}
