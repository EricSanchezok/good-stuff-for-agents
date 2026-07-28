#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, readFileSync, rmSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  CATALOG,
  evaluationPathForPack,
  loadSkillRecords,
  packRecordPath,
  parseYamlFile,
  promotePassingCandidates,
  ROOT,
  stableStringify,
  validateCatalog,
  writeTextAtomic,
  writeYaml,
} from './lib/catalog-lib.mjs'
import { proofPathForPack } from './lib/pack-v3-lib.mjs'

const packWriter = join(ROOT, '.synergy', 'skill', 'catalog-data', 'scripts', 'write-pack-record.mjs')
const packIds = {
  normal: 'pack_test-dest-normal_10000001',
  missingEvaluation: 'pack_test-dest-missing-eval_10000002',
  staleMember: 'pack_test-dest-stale-member_10000003',
  promotion: 'pack_test-dest-promo_10000004',
}
const REL_DIR = join(CATALOG, 'relations')
const REL_PATH = join(REL_DIR, 'edges-00000.jsonl')
const REL_DIR_EXISTED = existsSync(REL_DIR)
const REL_PATH_EXISTED = existsSync(REL_PATH)
const REL_ORIGINAL_CONTENT = REL_PATH_EXISTED ? readFileSync(REL_PATH, 'utf8') : null
const ANALYSIS_DIR = join(CATALOG, 'analyses', 'td-test-destination')
const ANL_ID_0 = 'anl_test-destination-producer_10000001'
const ANL_ID_1 = 'anl_test-destination-consumer_10000002'
const ANL_PATH_0 = join(ANALYSIS_DIR, `${ANL_ID_0}.md`)
const ANL_PATH_1 = join(ANALYSIS_DIR, `${ANL_ID_1}.md`)

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

function ec(desc) {
  return { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: desc }
}
function oc(desc, producesClaimIds = []) {
  return { produces_claim_ids: producesClaimIds, description: desc }
}
function ah(relId, pId, pCl, cId, cCl, prod, cons) {
  return { relation_id: relId, producer_skill_id: pId, producer_claim_id: pCl, consumer_skill_id: cId, consumer_claim_id: cCl, produced: prod, consumed_as: cons }
}

function analysisMarkdown({ analysisId, skillId, requiredClaims, producesClaims }) {
  const required = requiredClaims.length === 0
    ? '    required: []'
    : `    required:\n${requiredClaims.map((claimId) => `      - claim_id: ${claimId}\n        content: Required input ${claimId}`).join('\n')}`
  const produces = producesClaims.length === 0
    ? '  produces: []'
    : `  produces:\n${producesClaims.map((claimId) => `    - claim_id: ${claimId}\n      content: Produced artifact ${claimId}`).join('\n')}`
  return `---
schema_version: 2
analysis_id: ${analysisId}
skill_id: ${skillId}
source_hash: sha256:test-destination-fixture
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
created_by_run: run_test-destination
---
`
}

function createAnalyses() {
  mkdirSync(ANALYSIS_DIR, { recursive: true })
  writeFileSync(ANL_PATH_0, analysisMarkdown({
    analysisId: ANL_ID_0,
    skillId: eligibleMembers[0].skill_id,
    requiredClaims: [],
    producesClaims: ['clm_prd_dest'],
  }))
  writeFileSync(ANL_PATH_1, analysisMarkdown({
    analysisId: ANL_ID_1,
    skillId: eligibleMembers[1].skill_id,
    requiredClaims: ['clm_req_dest'],
    producesClaims: ['clm_prd_dest-final'],
  }))
}

function restoreRelationFixture() {
  if (REL_PATH_EXISTED) {
    mkdirSync(REL_DIR, { recursive: true })
    writeFileSync(REL_PATH, REL_ORIGINAL_CONTENT)
    return
  }
  rmSync(REL_PATH, { force: true })
  if (!REL_DIR_EXISTED) rmSync(REL_DIR, { recursive: true, force: true })
}

function createRelation(id) {
  mkdirSync(REL_DIR, { recursive: true })
  const rel = {
    schema_version: 2,
    relation_id: id,
    predicate: 'chains_with',
    subject: eligibleMembers[0].skill_id,
    object: eligibleMembers[1].skill_id,
    weight: 0.85,
    evidence: 'Test relation for destination tests',
    created_at: '2026-07-27T12:00:00Z',
    created_by_run: 'run_test-dest',
    chains_with: {
      producer_skill: eligibleMembers[0].skill_id,
      consumer_skill: eligibleMembers[1].skill_id,
      producer_claim_id: 'clm_prd_dest',
      consumer_claim_id: 'clm_req_dest',
      direction: 'sequential',
      description: 'Producer feeds consumer for destination tests',
    },
  }
  appendFileSync(REL_PATH, JSON.stringify(rel) + '\n')
}

try {
  createAnalyses()

  // Create test relations in catalog
  for (const key of Object.keys(packIds)) {
    createRelation(`rel_test-dest-${packIds[key]}`)
  }

  // Reject controller fields
  assertRejected(packWriter, [], { ...packDraft(packIds.normal), status: 'published' }, /status must be candidate/)
  assertRejected(packWriter, [], { ...packDraft(packIds.normal), record_bucket: 'published' }, /controller field/)

  // Normal candidate pack write
  const normal = run(packWriter, [], packDraft(packIds.normal))
  assert.equal(normal.schema_version, 3)
  assert.equal(normal.status, 'candidate')
  assert.equal(existsSync(packRecordPath(packIds.normal, 'candidate')), true)
  assert.equal(existsSync(packRecordPath(packIds.normal, 'published')), false)

  // Verify preflight-proof.json was created
  const candidateDir = dirname(packRecordPath(packIds.normal, 'candidate'))
  assert.equal(existsSync(join(candidateDir, 'preflight-proof.json')), true)

  // Invalid published: missing evaluation
  writePublished(packIds.missingEvaluation, {
    ...normal,
    pack_id: packIds.missingEvaluation,
    status: 'published',
  })

  // Invalid published: stale member
  writePublished(packIds.staleMember, {
    ...normal,
    pack_id: packIds.staleMember,
    status: 'published',
    members: [{ ...eligibleMembers[0], version_id: 'sha256:stale' }, eligibleMembers[1]],
  })
  writePublishedEvaluation(packIds.staleMember)

  const invalidValidation = validateCatalog({ strict: true })
  assert.ok(
    invalidValidation.errors.some((error) => error.includes(packIds.missingEvaluation) && /missing v2 evaluation file/.test(error)),
    `expected missing evaluation error for ${packIds.missingEvaluation}`,
  )
  assert.ok(
    invalidValidation.errors.some((error) => error.includes(packIds.staleMember) && /does not pin/.test(error)),
    `expected stale member error for ${packIds.staleMember}`,
  )

  // Promotion test
  const promo = run(packWriter, [], { ...packDraft(packIds.promotion), pack_id: packIds.promotion })
  assert.equal(promo.pack_id, packIds.promotion)

  // Write v2 evaluation
  const proofPath = proofPathForPack(packIds.promotion)
  let proofDigest = null
  if (existsSync(proofPath)) {
    proofDigest = JSON.parse(readFileSync(proofPath, 'utf8')).content_digest
  }

  writeTextAtomic(evaluationPathForPack(packIds.promotion, 'candidate'), stableStringify({
    schema_version: 2,
    evaluation_id: `eval_${packIds.promotion}`,
    synthesis_session_id: 'synth_dest_test',
    evaluation_session_id: 'evalses_dest_test',
    pack_id: packIds.promotion,
    metrics: {
      relevance: { score: 0.85 }, coverage: { score: 0.80 }, non_redundancy: { score: 0.90 },
      workflow_coherence: { score: 0.88 }, compatibility: { score: 0.82 }, conflict_control: { score: 0.95 },
      evidence_quality: { score: 0.75 }, actionability: { score: 0.80 }, freshness: { score: 0.78 },
      source_quality: { score: 0.85 },
    },
    blockers: [],
    checked_claim_ids: ['clm_prd_dest', 'clm_req_dest', 'clm_prd_dest-final'],
    warnings: [],
    proof_digest: proofDigest,
    decision: { passed: true, level: 'passed', reason: 'All pass', min_metric: null, blocker_count: 0 },
    created_by_run: 'run_dest_test',
    created_at: '2026-01-01T00:00:00Z',
  }))

  // Now promote
  const changed = promotePassingCandidates(false, new Set([packIds.promotion]))
  const expectedPath = `catalog/packs/published/${packIds.promotion}/pack.yaml`.replace(/\//g, process.platform === 'win32' ? '\\' : '/')
  assert.deepEqual(changed, [expectedPath])

  // Verify published record
  const published = parseYamlFile(packRecordPath(packIds.promotion, 'published'))
  assert.equal(published.status, 'published')
  assert.ok(!('evaluation' in published), 'published pack must not have inline evaluation')

  // Verify candidate directory was removed
  assert.equal(existsSync(dirname(packRecordPath(packIds.promotion, 'candidate'))), false)

  // Validate catalog
  const validation = validateCatalog({ strict: true })
  const promoErrors = validation.errors.filter((error) => error.includes(packIds.promotion))
  assert.equal(promoErrors.length, 0, `unexpected validation errors: ${promoErrors.join('\n')}`)

  console.log('pack destination tests passed')
} finally {
  for (const packId of Object.values(packIds)) {
    rmSync(dirname(packRecordPath(packId, 'candidate')), { recursive: true, force: true })
    rmSync(dirname(packRecordPath(packId, 'published')), { recursive: true, force: true })
  }
  restoreRelationFixture()
  rmSync(ANALYSIS_DIR, { recursive: true, force: true })
}

function packDraft(packId) {
  const relId = `rel_test-dest-${packId}`
  return {
    pack_id: packId,
    name: `Test ${packId}`,
    intent: 'Verify controller-derived pack destinations',
    domain: 'testing',
    members: eligibleMembers,
    excluded: [],
    workflow: {
      nodes: [
        { node_id: 'n1', type: 'task', member_ids: [eligibleMembers[0].skill_id], label: 'Stage 1', entry_contract: ec('User input'), output_contract: oc('Intermediate', ['clm_prd_dest']) },
        { node_id: 'n2', type: 'task', member_ids: [eligibleMembers[1].skill_id], label: 'Stage 2', entry_contract: ec('Receives'), output_contract: oc('Final result', ['clm_prd_dest-final']) },
      ],
      edges: [
        { edge_id: 'e1', from_node: 'n1', to_node: 'n2', direction: 'sequential', artifact_handoff: ah(relId, eligibleMembers[0].skill_id, 'clm_prd_dest', eligibleMembers[1].skill_id, 'clm_req_dest', 'intermediate', 'input') },
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

function writePublished(packId, record) {
  writeYaml(packRecordPath(packId, 'published'), record)
}

function writePublishedEvaluation(packId) {
  writeTextAtomic(evaluationPathForPack(packId, 'published'), stableStringify({
    schema_version: 2,
    evaluation_id: `eval_${packId}`,
    synthesis_session_id: 'synth_test',
    evaluation_session_id: 'evalses_test',
    pack_id: packId,
    metrics: {
      relevance: { score: 0.85 }, coverage: { score: 0.80 }, non_redundancy: { score: 0.90 },
      workflow_coherence: { score: 0.88 }, compatibility: { score: 0.82 }, conflict_control: { score: 0.95 },
      evidence_quality: { score: 0.75 }, actionability: { score: 0.80 }, freshness: { score: 0.78 },
      source_quality: { score: 0.85 },
    },
    blockers: [],
    checked_claim_ids: ['clm_prd_dest', 'clm_req_dest', 'clm_prd_dest-final'],
    warnings: [],
    proof_digest: 'sha256:0000000000000000000000000000000000000000000000000000000000000099',
    decision: { passed: true, level: 'passed', reason: 'All pass', min_metric: null, blocker_count: 0 },
    created_by_run: 'run_test',
    created_at: '2026-01-01T00:00:00Z',
  }))
}

function run(script, args, draft) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, input: JSON.stringify(draft), encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return JSON.parse(result.stdout)
}

function assertRejected(script, args, draft, pattern) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, input: JSON.stringify(draft), encoding: 'utf8' })
  assert.notEqual(result.status, 0, 'writer should reject controller fields')
  assert.match(result.stderr || result.stdout, pattern)
}

function assertValidationError(packId, pattern) {
  const validation = validateCatalog({ strict: true })
  assert.ok(validation.errors.some((error) => error.includes(packId) && pattern.test(error)), `expected ${pattern} for ${packId}`)
}
