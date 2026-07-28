#!/usr/bin/env node
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadPublishedEvaluation, renderPackPage } from './lib/publishing-lib.mjs'

const evaluation = {
  schema_version: 2,
  evaluation_id: 'eval_pack-publishing-test',
  synthesis_session_id: 'session_synthesis',
  evaluation_session_id: 'session_evaluation',
  pack_id: 'pack_publishing-test',
  metrics: {},
  blockers: [],
  checked_claim_ids: ['claim_brief', 'claim_options', 'claim_decision'],
  warnings: [{ message: 'Confirm the decision criteria for the current context.', disposition: 'acknowledged' }],
  proof_digest: 'sha256:test-proof',
  decision: {
    passed: true,
    level: 'passed',
    reason: 'All dimensions passed the MIN gate.',
    min_metric: 0.73,
    blocker_count: 0,
  },
  created_by_run: 'run_test',
  created_at: '2026-07-28T00:00:00.000Z',
}

const model = {
  skills: [
    { canonical_skill_id: 'skl_brief', display_name: 'Brief Builder' },
    { canonical_skill_id: 'skl_research', display_name: 'Research Scout' },
    { canonical_skill_id: 'skl_risk', display_name: 'Risk Reviewer' },
  ],
}

const pack = {
  schema_version: 3,
  pack_id: 'pack_publishing-test',
  name: 'Publishing Test Pack',
  status: 'published',
  intent: 'Turn an uncertain request into a reviewed decision.',
  domain: 'decision-support',
  version: '1.0.0',
  members: [
    { skill_id: 'skl_brief', version_id: 'v1', role: 'framing', inclusion_reason: 'Turns the request into a concrete brief.' },
    { skill_id: 'skl_research', version_id: 'v1', role: 'research', inclusion_reason: 'Builds an evidence-backed option set.' },
    { skill_id: 'skl_risk', version_id: 'v1', role: 'review', inclusion_reason: 'Challenges the option set before the final decision.' },
  ],
  workflow: {
    nodes: [
      { node_id: 'node-merge', type: 'fan_in', member_ids: [], label: 'Make the decision', description: 'Merge the evidence and review into one decision.', output_contract: 'a decision with rationale' },
      { node_id: 'node-risk', type: 'decision_gate', member_ids: ['skl_risk'], label: 'Challenge risks', description: 'Test the option set against failure modes.', condition: 'material risks remain' },
      { node_id: 'node-research', type: 'task', member_ids: ['skl_research'], label: 'Research options', description: 'Build the evidence-backed option set.' },
      { node_id: 'node-root', type: 'fan_out', member_ids: ['skl_brief'], label: 'Frame the brief', description: 'Turn the request into a concrete brief.', entry_contract: 'an uncertain request' },
    ],
    edges: [
      { edge_id: 'edge-root-risk', from_node: 'node-root', to_node: 'node-risk', direction: 'fan_out', artifact_handoff: { produced: 'the concrete brief', consumed_as: 'review criteria' } },
      { edge_id: 'edge-risk-merge', from_node: 'node-risk', to_node: 'node-merge', direction: 'conditional', condition: 'the risk review is complete', artifact_handoff: { produced: 'the risk review', consumed_as: 'decision constraints' } },
      { edge_id: 'edge-root-research', from_node: 'node-root', to_node: 'node-research', direction: 'fan_out', artifact_handoff: { produced: 'the concrete brief', consumed_as: 'research scope' } },
      { edge_id: 'edge-research-merge', from_node: 'node-research', to_node: 'node-merge', direction: 'fan_in', artifact_handoff: { produced: 'the option set', consumed_as: 'decision evidence' } },
    ],
    entry_roots: ['node-root'],
    terminal_sinks: ['node-merge'],
  },
  compatibility: {
    notes: 'The research and risk review run independently from the same brief.',
    chains: [],
    strengthens: [],
    alternatives: [],
    conflicts: [],
  },
  evidence: { analysis_ids: [], relation_ids: [] },
  mitigation: [{ risk: 'The criteria may drift', strategy: 'Freeze the brief before parallel work begins.' }],
  artifact_mapping: [],
  created_by_run: 'run_test',
  updated_at: '2026-07-28T00:00:00.000Z',
  __path: 'catalog/packs/published/pack_publishing-test/pack.yaml',
  __hash: 'sha256:pack',
  __evaluation: evaluation,
}

const page = renderPackPage(model, pack)
const rootPosition = page.indexOf('**Frame the brief**')
const researchPosition = page.indexOf('**Research options**')
const riskPosition = page.indexOf('**Challenge risks**')
const mergePosition = page.indexOf('**Make the decision**')
assert.ok(rootPosition >= 0, 'entry root must be rendered')
assert.ok(researchPosition > rootPosition, 'research branch must follow the entry root')
assert.ok(riskPosition > researchPosition, 'parallel siblings must use stable node-id order')
assert.ok(mergePosition > riskPosition, 'fan-in sink must render after both branches')
assert.match(page, /Continue in parallel to Research options, handing off the concrete brief as research scope\./)
assert.match(page, /Merge into Make the decision, handing off the option set as decision evidence\./)
assert.match(page, /If the risk review is complete, continue to Make the decision, handing off the risk review as decision constraints\./)
assert.match(page, /the lowest score was 0\.73/)
assert.match(page, /checked 3 specific evidence claims/)
assert.match(page, /The criteria may drift: Freeze the brief before parallel work begins\./)
assert.match(page, /Confirm the decision criteria for the current context\./)
assert.doesNotMatch(page, /workflow\.stages|member\.stage|evaluation landed at/)

const tempDir = mkdtempSync(join(tmpdir(), 'pack-publishing-test-'))
try {
  const evaluationPath = join(tempDir, 'evaluation.json')
  writeFileSync(evaluationPath, `${JSON.stringify(evaluation)}\n`)
  assert.deepEqual(loadPublishedEvaluation(evaluationPath, pack.pack_id), evaluation)
  assert.throws(() => loadPublishedEvaluation(evaluationPath, 'pack_other'), /not a passing v2 record bound to pack_other/)

  writeFileSync(evaluationPath, `${JSON.stringify({ ...evaluation, decision: { ...evaluation.decision, passed: false, level: 'needs_work' } })}\n`)
  assert.throws(() => loadPublishedEvaluation(evaluationPath, pack.pack_id), /not a passing v2 record/)
  assert.throws(() => loadPublishedEvaluation(join(tempDir, 'missing.json'), pack.pack_id), /missing evaluation/)
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}

console.log('pack v3 publishing tests passed')
