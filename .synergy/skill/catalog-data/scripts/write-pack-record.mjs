#!/usr/bin/env node
import { assertPackCandidateDraft, loadSkillsById, nowIso, packRecordPath, preflightPackWorkflow, readDraft, writeYaml } from './lib/catalog-lib.mjs'

const draft = readDraft(process.argv.slice(2))
assertPackCandidateDraft(draft)

const memberIds = (draft.members || []).map((m) => m.skill_id)
const skills = new Map(loadSkillsById(memberIds).map(({ record: r }) => [r.canonical_skill_id, r]))
const preflight = preflightPackWorkflow(draft, skills)
if (!preflight.ok) {
  const reasons = preflight.errors.map((e) => `  - [${e.code}] ${e.reason}`).join('\n')
  throw new Error(`Pack candidate ${draft.pack_id} failed workflow preflight:\n${reasons}`)
}

const record = {
  schema_version: 2,
  pack_id: draft.pack_id,
  name: draft.name,
  status: 'candidate',
  intent: draft.intent,
  domain: draft.domain ?? 'uncategorized',
  created_by_run: draft.created_by_run ?? 'run_manual',
  version: draft.version ?? '0.1.0',
  members: draft.members ?? [],
  excluded: draft.excluded ?? [],
  workflow: normalizeWorkflow(draft.workflow),
  compatibility: normalizeCompatibility(draft.compatibility),
  evidence: draft.evidence ?? { analysis_paths: [], relation_edges: [] },
  evaluation: draft.evaluation ?? { evaluation_id: null, score: null, status: 'pending' },
  updated_at: draft.updated_at ?? nowIso(),
}
writeYaml(packRecordPath(record.pack_id, 'candidate'), record)
console.log(JSON.stringify(record, null, 2))

function normalizeWorkflow(workflow) {
  if (!workflow) return { summary: '', entry: { description: '', input_contract: '' }, terminal: { description: '', output_contract: '' }, stages: [], branches: [] }
  if (typeof workflow === 'string') return { summary: workflow, entry: { description: '', input_contract: '' }, terminal: { description: '', output_contract: '' }, stages: [], branches: [] }
  const stages = (workflow.stages ?? []).map(normalizeStage)
  return {
    summary: workflow.summary ?? '',
    entry: normalizeEntry(workflow.entry),
    terminal: normalizeTerminal(workflow.terminal),
    stages,
    branches: Array.isArray(workflow.branches) ? workflow.branches.map(normalizeBranch) : [],
  }
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { description: '', input_contract: '' }
  return { description: entry.description ?? '', input_contract: entry.input_contract ?? '' }
}

function normalizeTerminal(terminal) {
  if (!terminal || typeof terminal !== 'object' || Array.isArray(terminal)) return { description: '', output_contract: '' }
  return { description: terminal.description ?? '', output_contract: terminal.output_contract ?? '' }
}

function normalizeStage(stage) {
  if (!stage || typeof stage !== 'object' || Array.isArray(stage)) return { stage_id: '', name: '', description: '', member_ids: [], handoffs: [] }
  return {
    stage_id: stage.stage_id ?? stage.name ?? stage.stage ?? '',
    name: stage.name ?? stage.stage ?? stage.stage_id ?? '',
    description: stage.description ?? '',
    member_ids: Array.isArray(stage.member_ids) ? stage.member_ids : [],
    handoffs: Array.isArray(stage.handoffs) ? stage.handoffs.map(normalizeHandoff) : [],
  }
}

function normalizeHandoff(handoff) {
  if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) return { from_stage: '', from_skill: '', to_stage: '', to_skill: '', produced_artifact: '', consumed_as: '' }
  return {
    from_stage: handoff.from_stage ?? '',
    from_skill: handoff.from_skill ?? '',
    to_stage: handoff.to_stage ?? '',
    to_skill: handoff.to_skill ?? '',
    produced_artifact: handoff.produced_artifact ?? '',
    consumed_as: handoff.consumed_as ?? '',
  }
}

function normalizeBranch(branch) {
  if (!branch || typeof branch !== 'object' || Array.isArray(branch)) return { condition: '', description: '', from_stage: '', to_stage: '' }
  return {
    condition: branch.condition ?? '',
    description: branch.description ?? '',
    from_stage: branch.from_stage ?? '',
    to_stage: branch.to_stage ?? '',
  }
}

function normalizeCompatibility(compatibility) {
  return {
    notes: compatibility?.notes ?? '',
    chains: compatibility?.chains ?? [],
    strengthens: compatibility?.strengthens ?? [],
    alternatives: compatibility?.alternatives ?? [],
    conflicts: compatibility?.conflicts ?? [],
    unresolved: compatibility?.unresolved ?? [],
  }
}
