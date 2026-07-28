#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, readFileSync, rmSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  CATALOG,
  createEvaluationBinding,
  evaluationPathForPack,
  loadSkillRecords,
  packRecordPath,
  parseYamlFile,
  ROOT,
  stableStringify,
  writeTextAtomic,
  writeYaml,
} from './lib/catalog-lib.mjs'

const packWriter = join(ROOT, '.synergy', 'skill', 'catalog-data', 'scripts', 'write-pack-record.mjs')
const evaluationWriter = join(ROOT, '.synergy', 'skill', 'catalog-data', 'scripts', 'write-evaluation.mjs')
const packIds = {
  normal: 'pack_test-evalbind-normal_20000001',
  stale: 'pack_test-evalbind-stale_20000002',
}
const REL_ID = 'rel_test-evalbind'
const REL_DIR = join(CATALOG, 'relations')
const REL_PATH = join(REL_DIR, 'edges-00000.jsonl')
const REL_DIR_EXISTED = existsSync(REL_DIR)
const REL_PATH_EXISTED = existsSync(REL_PATH)
const REL_ORIGINAL_CONTENT = REL_PATH_EXISTED ? readFileSync(REL_PATH, 'utf8') : null

const eligibleMembers = loadSkillRecords()
  .map(({ record }) => record)
  .filter((record) => ['active', 'preview'].includes(record.status) && record.identity?.current_version_id)
  .slice(0, 2)
  .map((record, index) => ({
    skill_id: record.canonical_skill_id,
    version_id: record.identity.current_version_id,
    role: `role-${index + 1}`,
    inclusion_reason: `test member ${index + 1}`,
  }))
assert.equal(eligibleMembers.length, 2, 'fixture requires two eligible catalog skills')

const [skl0, skl1] = eligibleMembers
const analysisPrefix = (id) => id.replace(/^[^_]+_/, '').slice(0, 2).toLowerCase().replace(/[^a-z0-9]/g, 'x') || 'xx'

const ANL_ID_0 = `anl_${skl0.skill_id}`
const ANL_ID_1 = `anl_${skl1.skill_id}`
const PREFIX_0 = analysisPrefix(skl0.skill_id)
const PREFIX_1 = analysisPrefix(skl1.skill_id)
const ANL_PATH_0 = join(CATALOG, 'analyses', PREFIX_0, `${ANL_ID_0}.md`)
const ANL_PATH_1 = join(CATALOG, 'analyses', PREFIX_1, `${ANL_ID_1}.md`)

function restoreRelationFixture() {
  if (REL_PATH_EXISTED) {
    mkdirSync(REL_DIR, { recursive: true })
    writeFileSync(REL_PATH, REL_ORIGINAL_CONTENT)
    return
  }
  rmSync(REL_PATH, { force: true })
  if (!REL_DIR_EXISTED) rmSync(REL_DIR, { recursive: true, force: true })
}

function makeAnalysisContent(analysisId, skillId, { requiredClaimIds, producesClaimIds }) {
  const required = requiredClaimIds.length === 0
    ? '    required: []'
    : `    required:\n${requiredClaimIds.map((claimId) => `      - claim_id: ${claimId}\n        content: Required claim ${claimId}`).join('\n')}`
  const produces = producesClaimIds.length === 0
    ? '  produces: []'
    : `  produces:\n${producesClaimIds.map((claimId) => `    - claim_id: ${claimId}\n      content: Produces claim ${claimId}`).join('\n')}`
  return `---
schema_version: 2
analysis_id: ${analysisId}
skill_id: ${skillId}
source_hash: sha256:test-evalbind-fixture
analysis_version: 1
claims:
  requires:
${required}
    optional: []
${produces}
  preconditions: []
  refusal: []
  failure_warnings: []
  tool_constraints: []
  alternatives: []
  judgement: []
confidence: high
updated_at: '2026-07-27T12:00:00Z'
created_by_run: run_test-evalbind
---`
}

function ec(desc) {
  return { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: desc }
}
function oc(desc, producesClaimIds) {
  return { produces_claim_ids: producesClaimIds, description: desc }
}
function handoff(relId, producerId, producerClaim, consumerId, consumerClaim, produced, consumed) {
  return { relation_id: relId, producer_skill_id: producerId, producer_claim_id: producerClaim, consumer_skill_id: consumerId, consumer_claim_id: consumerClaim, produced, consumed_as: consumed }
}

try {
  // Create analysis fixtures
  mkdirSync(join(CATALOG, 'analyses', PREFIX_0), { recursive: true })
  mkdirSync(join(CATALOG, 'analyses', PREFIX_1), { recursive: true })
  writeFileSync(ANL_PATH_0, makeAnalysisContent(ANL_ID_0, skl0.skill_id, {
    requiredClaimIds: [],
    producesClaimIds: ['clm_prd_eval'],
  }))
  writeFileSync(ANL_PATH_1, makeAnalysisContent(ANL_ID_1, skl1.skill_id, {
    requiredClaimIds: ['clm_req_eval'],
    producesClaimIds: ['clm_prd_eval-final'],
  }))
  // Create v2 relation record in catalog for the test
  mkdirSync(REL_DIR, { recursive: true })
  const testRelation = {
    schema_version: 2,
    relation_id: REL_ID,
    predicate: 'chains_with',
    subject: eligibleMembers[0].skill_id,
    object: eligibleMembers[1].skill_id,
    weight: 0.85,
    evidence: 'Test relation for evaluation binding tests',
    created_at: '2026-07-27T12:00:00Z',
    created_by_run: 'run_test-evalbind',
    chains_with: {
      producer_skill: eligibleMembers[0].skill_id,
      consumer_skill: eligibleMembers[1].skill_id,
      producer_claim_id: 'clm_prd_eval',
      consumer_claim_id: 'clm_req_eval',
      direction: 'sequential',
      description: 'Producer feeds consumer for evalbind test',
    },
  }
  appendFileSync(REL_PATH, JSON.stringify(testRelation) + '\n')

  run(packWriter, [], packDraft(packIds.normal))
  run(packWriter, [], packDraft(packIds.stale))

  // Create binding
  const binding = run(evaluationWriter, ['--pack-id', packIds.normal, '--create-binding'])
  assert.equal(binding.pack_id, packIds.normal)
  assert.equal(binding.pack_status, 'candidate')
  assert.match(binding.evaluation_id, /^eval_/)
  assert.ok(binding.proof_digest, 'binding should include proof_digest')
  const expectedEvalPath = `catalog/packs/candidates/${packIds.normal}/evaluation.json`.replace(/\//g, process.platform === 'win32' ? '\\' : '/')
  assert.equal(binding.expected_path, expectedEvalPath)

  // Reject forged bindings
  for (const [field, value] of [
    ['pack_id', packIds.stale],
    ['evaluation_id', 'eval_forged_20000001'],
    ['pack_status', 'published'],
  ]) {
    assertRejected(evaluationWriter, ['--pack-id', packIds.normal], {
      binding: { ...binding, [field]: value },
      draft: evaluationDraft(binding.evaluation_id, binding.proof_digest),
    }, new RegExp(field))
  }

  // Write evaluation
  const result = run(evaluationWriter, ['--pack-id', packIds.normal], {
    binding,
    draft: evaluationDraft(binding.evaluation_id, binding.proof_digest),
  })
  const evaluation = result
  assert.equal(evaluation.schema_version, 2)
  assert.equal(evaluation.pack_id, packIds.normal)
  assert.equal(evaluation.evaluation_id, binding.evaluation_id)
  assert.equal(evaluation.decision.passed, true)
  assert.equal(evaluation.decision.level, 'passed')

  // Verify evaluation file was written
  const evalPath = evaluationPathForPack(packIds.normal, 'candidate')
  assert.equal(existsSync(evalPath), true)
  const writtenEval = JSON.parse(readFileSync(evalPath, 'utf8'))
  assert.equal(writtenEval.evaluation_id, binding.evaluation_id)
  assert.equal(writtenEval.schema_version, 2)

  // Pack YAML must not have inline evaluation
  const pack = parseYamlFile(packRecordPath(packIds.normal, 'candidate'))
  assert.ok(!('evaluation' in pack), 'pack must not have inline evaluation')

  // Reject reuse of binding
  assertRejected(evaluationWriter, [], { binding, draft: evaluationDraft(binding.evaluation_id, binding.proof_digest) }, /already been used/)

  // Stale binding (pack changed after binding)
  const staleBinding = createEvaluationBinding(packIds.stale)
  const stalePackPath = packRecordPath(packIds.stale, 'candidate')
  const stalePack = parseYamlFile(stalePackPath)
  stalePack.intent = 'Changed after the controller issued its binding'
  writeYaml(stalePackPath, stalePack)
  assertRejected(evaluationWriter, [], { binding: staleBinding, draft: evaluationDraft(staleBinding.evaluation_id, staleBinding.proof_digest) }, /stale or mismatched/)

  console.log('evaluation binding tests passed')
} finally {
  for (const packId of Object.values(packIds)) {
    rmSync(dirname(packRecordPath(packId, 'candidate')), { recursive: true, force: true })
    rmSync(dirname(packRecordPath(packId, 'published')), { recursive: true, force: true })
  }
  // Remove test analysis fixtures
  try { rmSync(ANL_PATH_0, { force: true }) } catch {}
  try { rmSync(ANL_PATH_1, { force: true }) } catch {}
  restoreRelationFixture()
}

function packDraft(packId) {
  const relId = REL_ID
  return {
    pack_id: packId,
    name: `Test ${packId}`,
    intent: 'Verify controller-derived evaluation destinations',
    domain: 'testing',
    members: eligibleMembers,
    excluded: [],
    workflow: {
      nodes: [
        {
          node_id: 'n1', type: 'task', member_ids: [eligibleMembers[0].skill_id],
          label: 'Stage 1', entry_contract: ec('User input'), output_contract: oc('Intermediate', ['clm_prd_eval']),
        },
        {
          node_id: 'n2', type: 'task', member_ids: [eligibleMembers[1].skill_id],
          label: 'Stage 2', entry_contract: ec('Receives intermediate'), output_contract: oc('Final', ['clm_prd_eval-final']),
        },
      ],
      edges: [
        {
          edge_id: 'e1', from_node: 'n1', to_node: 'n2', direction: 'sequential',
          artifact_handoff: handoff(relId, eligibleMembers[0].skill_id, 'clm_prd_eval', eligibleMembers[1].skill_id, 'clm_req_eval', 'intermediate', 'input'),
        },
      ],
      entry_roots: ['n1'],
      terminal_sinks: ['n2'],
    },
    compatibility: { notes: 'Test members are independently eligible', chains: [{ relation_id: relId, state: 'used', disposition: 'required' }], strengthens: [], alternatives: [], conflicts: [] },
    evidence: { analysis_ids: [ANL_ID_0, ANL_ID_1], relation_ids: [relId] },
    mitigation: [],
    artifact_mapping: [],
  }
}

function evaluationDraft(evaluationId, proofDigest) {
  return {
    synthesis_session_id: 'synth_test-evalbind',
    evaluation_session_id: 'evalses_test-evalbind',
    metrics: {
      relevance: { score: 0.85 }, coverage: { score: 0.80 }, non_redundancy: { score: 0.90 },
      workflow_coherence: { score: 0.88 }, compatibility: { score: 0.82 }, conflict_control: { score: 0.95 },
      evidence_quality: { score: 0.75 }, actionability: { score: 0.80 }, freshness: { score: 0.78 },
      source_quality: { score: 0.85 },
    },
    blockers: [],
    checked_claim_ids: ['clm_prd_eval', 'clm_req_eval', 'clm_prd_eval-final'],
    warnings: [],
    proof_digest: proofDigest,
  }
}

function run(script, args, input) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    input: input === undefined ? undefined : JSON.stringify(input),
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return JSON.parse(result.stdout)
}

function assertRejected(script, args, input, pattern) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, input: JSON.stringify(input), encoding: 'utf8' })
  assert.notEqual(result.status, 0, 'writer should reject forged or stale control data')
  assert.match(result.stderr || result.stdout, pattern)
}
