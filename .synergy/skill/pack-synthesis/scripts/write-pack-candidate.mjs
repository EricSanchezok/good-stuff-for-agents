#!/usr/bin/env node
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const draft = readJsonInput(null)
if (!draft || typeof draft !== 'object') throw new Error('Provide a reviewed pack candidate draft')
assertPackDraft(draft)
const record = catalogData('write-pack-record.mjs', { ...draft, status: draft.status ?? 'candidate' })
printResult({ written: true, pack_id: record.pack_id, record })

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
}
