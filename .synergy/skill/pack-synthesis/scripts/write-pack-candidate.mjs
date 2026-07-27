#!/usr/bin/env node
import { assertPackCandidateDraft, loadSkillsById, preflightPackWorkflow } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const preflightOnly = process.argv.includes('--preflight-only')
const draft = readJsonInput(null)
assertPackCandidateDraft(draft)

const memberIds = (draft.members || []).map((m) => m.skill_id)
const skills = new Map(loadSkillsById(memberIds).map(({ record: r }) => [r.canonical_skill_id, r]))
const preflight = preflightPackWorkflow(draft, skills)

if (preflightOnly) {
  printResult(preflight)
  process.exit(preflight.ok ? 0 : 1)
}

if (!preflight.ok) {
  const reasons = preflight.errors.map((e) => `  - [${e.code}] ${e.reason}`).join('\n')
  throw new Error(`Pack candidate ${draft.pack_id} failed workflow preflight:\n${reasons}`)
}

const record = catalogData('write-pack-record.mjs', draft)
printResult({ written: true, pack_id: record.pack_id, record })
