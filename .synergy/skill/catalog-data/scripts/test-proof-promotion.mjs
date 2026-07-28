#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, readFileSync, rmSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  CATALOG,
  evaluationPathForPack,
  loadSkillRecords,
  packRecordPath,
  promotePassingCandidates,
  ROOT,
  stableStringify,
  writeTextAtomic,
  writeYaml,
  parseYaml,
} from './lib/catalog-lib.mjs'
import { buildProofRecord, proofPathForPack } from './lib/pack-v3-lib.mjs'

const REL_ID = 'rel_test-proof-promo'
const REL_DIR = join(CATALOG, 'relations')
const REL_PATH = join(REL_DIR, 'edges-00000.jsonl')
const REL_DIR_EXISTED = existsSync(REL_DIR)
const REL_PATH_EXISTED = existsSync(REL_PATH)
const REL_ORIGINAL_CONTENT = REL_PATH_EXISTED ? readFileSync(REL_PATH, 'utf8') : null

function restoreRelationFixture() {
  if (REL_PATH_EXISTED) {
    mkdirSync(REL_DIR, { recursive: true })
    writeFileSync(REL_PATH, REL_ORIGINAL_CONTENT)
    return
  }
  rmSync(REL_PATH, { force: true })
  if (!REL_DIR_EXISTED) rmSync(REL_DIR, { recursive: true, force: true })
}

function runAllTests() {
  // --- Fixture setup: two eligible skills ---
  const eligibleRecords = loadSkillRecords()
    .map(({ record }) => record)
    .filter((record) => ['active', 'preview'].includes(record.status) && record.identity?.current_version_id)
    .slice(0, 2)
  assert.equal(eligibleRecords.length, 2, 'fixture requires two eligible catalog skills')

  const [skl0, skl1] = eligibleRecords
  const analysisPrefix = (id) => id.replace(/^[^_]+_/, '').slice(0, 2).toLowerCase().replace(/[^a-z0-9]/g, 'x') || 'xx'

  const ANL_0 = `anl_${skl0.canonical_skill_id}`
  const ANL_1 = `anl_${skl1.canonical_skill_id}`
  const PREFIX_0 = analysisPrefix(skl0.canonical_skill_id)
  const PREFIX_1 = analysisPrefix(skl1.canonical_skill_id)

  // Create fixture directories from a cold-start catalog.
  mkdirSync(join(CATALOG, 'analyses', PREFIX_0), { recursive: true })
  mkdirSync(join(CATALOG, 'analyses', PREFIX_1), { recursive: true })
  mkdirSync(REL_DIR, { recursive: true })

  const ANL_PATH_0 = join(CATALOG, 'analyses', PREFIX_0, `${ANL_0}.md`)
  const ANL_PATH_1 = join(CATALOG, 'analyses', PREFIX_1, `${ANL_1}.md`)

  // Fixture analysis content
  function makeAnalysisContent(analysisId, skillId, claimIdSuffix) {
    return `---
schema_version: 2
analysis_id: ${analysisId}
skill_id: ${skillId}
source_hash: sha256:test-promo-fixture
analysis_version: 1
claims:
  requires:
    required:
      - claim_id: clm_req_${claimIdSuffix}
        content: Required claim ${claimIdSuffix}
    optional: []
  produces:
    - claim_id: clm_prd_${claimIdSuffix}
      content: Produces claim ${claimIdSuffix}
  preconditions: []
  refusal: []
  failure_warnings: []
  tool_constraints: []
  alternatives: []
  judgement: []
confidence: high
updated_at: '2026-07-27T12:00:00Z'
created_by_run: run_test-promo
---`
  }

  // Fixture relation
  function makeRelationRecord(suffix = '') {
    return {
      schema_version: 2,
      relation_id: `${REL_ID}${suffix}`,
      predicate: 'chains_with',
      subject: skl0.canonical_skill_id,
      object: skl1.canonical_skill_id,
      weight: 0.85,
      evidence: 'Test relation for promotion tests',
      created_at: '2026-07-27T12:00:00Z',
      created_by_run: 'run_test-promo',
      chains_with: {
        producer_skill: skl0.canonical_skill_id,
        consumer_skill: skl1.canonical_skill_id,
        producer_claim_id: `clm_prd_pf`,
        consumer_claim_id: `clm_req_pf1`,
        direction: 'sequential',
        description: 'Producer feeds consumer for promo test',
      },
    }
  }

  function makePackRecord(packId) {
    return {
      schema_version: 3,
      pack_id: packId,
      name: `Test Promotion ${packId}`,
      status: 'candidate',
      intent: 'Verify promotion lifecycle',
      domain: 'testing',
      version: '1.0.0',
      members: [
        { skill_id: skl0.canonical_skill_id, version_id: skl0.identity.current_version_id, role: 'entry', inclusion_reason: 'test member 1' },
        { skill_id: skl1.canonical_skill_id, version_id: skl1.identity.current_version_id, role: 'processor', inclusion_reason: 'test member 2' },
      ],
      excluded: [],
      workflow: {
        nodes: [
          { node_id: 'n1', type: 'task', member_ids: [skl0.canonical_skill_id], label: 'Stage 1', entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'Input' }, output_contract: { produces_claim_ids: ['clm_prd_pf'], description: 'Intermediate' } },
          { node_id: 'n2', type: 'task', member_ids: [skl1.canonical_skill_id], label: 'Stage 2', entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'Receives' }, output_contract: { produces_claim_ids: [], description: 'Output' } },
        ],
        edges: [
          { edge_id: 'e1', from_node: 'n1', to_node: 'n2', direction: 'sequential', artifact_handoff: { relation_id: `${REL_ID}`, producer_skill_id: skl0.canonical_skill_id, producer_claim_id: `clm_prd_pf`, consumer_skill_id: skl1.canonical_skill_id, consumer_claim_id: `clm_req_pf1`, produced: 'intermediate', consumed_as: 'input' } },
        ],
        entry_roots: ['n1'],
        terminal_sinks: ['n2'],
      },
      compatibility: { notes: 'Test', chains: [{ relation_id: `${REL_ID}`, state: 'used', disposition: 'required' }], strengthens: [], alternatives: [], conflicts: [] },
      evidence: { analysis_ids: [ANL_0, ANL_1], relation_ids: [`${REL_ID}`] },
      mitigation: [],
      artifact_mapping: [{ node_id: 'n2', artifact: 'result', description: 'Final output' }],
      created_by_run: 'run_test',
      updated_at: '2026-07-27T12:00:00Z',
    }
  }

  function makePassingEval(packId, proofDigest) {
    return {
      schema_version: 2,
      evaluation_id: `eval_${packId}`,
      pack_id: packId,
      synthesis_session_id: 'synth_test-promo',
      evaluation_session_id: 'evalses_test-promo',
      proof_digest: proofDigest,
      metrics: {
        relevance: { score: 0.85 }, coverage: { score: 0.80 }, non_redundancy: { score: 0.90 },
        workflow_coherence: { score: 0.88 }, compatibility: { score: 0.82 }, conflict_control: { score: 0.95 },
        evidence_quality: { score: 0.75 }, actionability: { score: 0.80 }, freshness: { score: 0.78 },
        source_quality: { score: 0.85 },
      },
      blockers: [],
      checked_claim_ids: ['clm_prd_pf', 'clm_req_pf1'],
      warnings: [],
      decision: { passed: true, level: 'passed', reason: 'All pass', min_metric: null, blocker_count: 0 },
      created_by_run: 'run_test',
      created_at: '2026-01-01T00:00:00.000Z',
    }
  }

  const toClean = []
  function registerCleanup(packId) {
    toClean.push(packId)
  }

  function cleanupAll() {
    for (const packId of toClean) {
      try { rmSync(dirname(packRecordPath(packId, 'candidate')), { recursive: true, force: true }) } catch {}
      try { rmSync(dirname(packRecordPath(packId, 'published')), { recursive: true, force: true }) } catch {}
    }
    try { rmSync(ANL_PATH_0, { force: true }) } catch {}
    try { rmSync(ANL_PATH_1, { force: true }) } catch {}
    restoreRelationFixture()
  }

  try {
    // --- Write canonical fixture evidence ---
    writeFileSync(ANL_PATH_0, makeAnalysisContent(ANL_0, skl0.canonical_skill_id, 'pf'))
    writeFileSync(ANL_PATH_1, makeAnalysisContent(ANL_1, skl1.canonical_skill_id, 'pf1'))
    appendFileSync(REL_PATH, JSON.stringify(makeRelationRecord()) + '\n')

    // ============================================================
    // Test 1: Successful promotion with real evidence
    // ============================================================
    const packId1 = 'pack_test-promo-ok_50000001'
    registerCleanup(packId1)

    const pack1 = makePackRecord(packId1)
    const skills1 = new Map([
      [skl0.canonical_skill_id, skl0],
      [skl1.canonical_skill_id, skl1],
    ])
    const analyses1 = new Map()
    analyses1.set(ANL_0, {
      schema_version: 2, analysis_id: ANL_0, skill_id: skl0.canonical_skill_id,
      source_hash: 'sha256:test-promo-fixture', analysis_version: 1,
      claims: { requires: { required: [{ claim_id: 'clm_req_pf', content: 'Required claim pf' }], optional: [] }, produces: [{ claim_id: 'clm_prd_pf', content: 'Produces claim pf' }], preconditions: [], refusal: [], failure_warnings: [], tool_constraints: [], alternatives: [], judgement: [] },
      confidence: 'high', updated_at: '2026-07-27T12:00:00Z', created_by_run: 'run_test-promo',
    })
    analyses1.set(ANL_1, {
      schema_version: 2, analysis_id: ANL_1, skill_id: skl1.canonical_skill_id,
      source_hash: 'sha256:test-promo-fixture', analysis_version: 1,
      claims: { requires: { required: [{ claim_id: 'clm_req_pf1', content: 'Required claim pf1' }], optional: [] }, produces: [{ claim_id: 'clm_prd_pf1', content: 'Produces claim pf1' }], preconditions: [], refusal: [], failure_warnings: [], tool_constraints: [], alternatives: [], judgement: [] },
      confidence: 'high', updated_at: '2026-07-27T12:00:00Z', created_by_run: 'run_test-promo',
    })
    const relations1 = new Map([[REL_ID, makeRelationRecord()]])

    writeYaml(packRecordPath(packId1, 'candidate'), pack1)
    const proofRecord1 = buildProofRecord({ pack: pack1, analyses: analyses1, relations: relations1, skills: skills1 })
    writeTextAtomic(proofPathForPack(packId1), stableStringify(proofRecord1))

    const eval1 = makePassingEval(packId1, proofRecord1.content_digest)
    writeTextAtomic(evaluationPathForPack(packId1, 'candidate'), stableStringify(eval1))

    const changed = promotePassingCandidates(false, new Set([packId1]))
    assert.deepEqual(changed, [`catalog/packs/published/${packId1}/pack.yaml`],
      'successful promotion should return the published pack path')

    // Verify proof was copied to published
    const pubProofPath1 = join(dirname(packRecordPath(packId1, 'published')), 'preflight-proof.json')
    assert.equal(existsSync(pubProofPath1), true, 'proof should exist in published dir')
    const pubProof1 = JSON.parse(readFileSync(pubProofPath1, 'utf8'))
    assert.strictEqual(pubProof1.content_digest, proofRecord1.content_digest, 'promoted proof must match')
    assert.strictEqual(pubProof1.pack_id, packId1)

    console.log('  ✓ Test 1: Successful promotion passed')

    // ============================================================
    // Test 2: Same-count Analysis claim edit BLOCKS promotion
    // ============================================================
    const packId2 = 'pack_test-promo-stale-anl_50000002'
    registerCleanup(packId2)

    const pack2 = makePackRecord(packId2)
    const proofRecord2 = buildProofRecord({ pack: pack2, analyses: analyses1, relations: relations1, skills: skills1 })
    writeYaml(packRecordPath(packId2, 'candidate'), pack2)
    writeTextAtomic(proofPathForPack(packId2), stableStringify(proofRecord2))
    writeTextAtomic(evaluationPathForPack(packId2, 'candidate'), stableStringify(makePassingEval(packId2, proofRecord2.content_digest)))

    // Edit the analysis file content on disk (same count edit — changed claim content)
    writeFileSync(ANL_PATH_0, makeAnalysisContent(ANL_0, skl0.canonical_skill_id, 'pf_CHANGED'))

    const changed2 = promotePassingCandidates(false, new Set([packId2]))
    assert.equal(changed2.length, 0, 'stale analysis should block promotion')

    // Restore analysis
    writeFileSync(ANL_PATH_0, makeAnalysisContent(ANL_0, skl0.canonical_skill_id, 'pf'))
    console.log('  ✓ Test 2: Stale analysis claim edit blocked promotion')

    // ============================================================
    // Test 3: Same-count Relation edit BLOCKS promotion
    // ============================================================
    const packId3 = 'pack_test-promo-stale-rel_50000003'
    registerCleanup(packId3)

    const pack3 = makePackRecord(packId3)
    const proofRecord3 = buildProofRecord({ pack: pack3, analyses: analyses1, relations: relations1, skills: skills1 })
    writeYaml(packRecordPath(packId3, 'candidate'), pack3)
    writeTextAtomic(proofPathForPack(packId3), stableStringify(proofRecord3))
    writeTextAtomic(evaluationPathForPack(packId3, 'candidate'), stableStringify(makePassingEval(packId3, proofRecord3.content_digest)))

    // Modify the relation on disk
    const modifiedRel = makeRelationRecord()
    modifiedRel.chains_with.direction = 'fan_in' // changed direction
    // Remove existing test relations and re-append
    let relLines = readFileSync(REL_PATH, 'utf8').split('\n').filter(Boolean)
    relLines = relLines.filter(l => { try { return !JSON.parse(l).relation_id.startsWith(REL_ID) } catch { return true } })
    relLines.push(JSON.stringify(makeRelationRecord())) // original
    relLines.push(JSON.stringify(modifiedRel))
    writeFileSync(REL_PATH, relLines.join('\n') + '\n')

    const changed3 = promotePassingCandidates(false, new Set([packId3]))
    assert.equal(changed3.length, 0, 'stale relation should block promotion')

    // Restore
    const restoredLines = readFileSync(REL_PATH, 'utf8').split('\n').filter(Boolean)
      .filter(l => { try { const r = JSON.parse(l); return !r.relation_id.startsWith(REL_ID) || r.chains_with?.direction === 'sequential' } catch { return true } })
    writeFileSync(REL_PATH, restoredLines.join('\n') + '\n')
    console.log('  ✓ Test 3: Stale relation edit blocked promotion')

    // ============================================================
    // Test 4: Pack content edit BLOCKS promotion
    // ============================================================
    const packId4 = 'pack_test-promo-stale-pack_50000004'
    registerCleanup(packId4)

    const pack4 = makePackRecord(packId4)
    const proofRecord4 = buildProofRecord({ pack: pack4, analyses: analyses1, relations: relations1, skills: skills1 })
    writeYaml(packRecordPath(packId4, 'candidate'), pack4)
    writeTextAtomic(proofPathForPack(packId4), stableStringify(proofRecord4))
    writeTextAtomic(evaluationPathForPack(packId4, 'candidate'), stableStringify(makePassingEval(packId4, proofRecord4.content_digest)))

    // Edit the pack on disk (same-count edit — different edge label)
    const pack4modified = makePackRecord(packId4)
    pack4modified.workflow.edges[0].edge_id = 'e_CHANGED'
    writeYaml(packRecordPath(packId4, 'candidate'), pack4modified)

    const changed4 = promotePassingCandidates(false, new Set([packId4]))
    assert.equal(changed4.length, 0, 'stale pack content should block promotion')

    // Restore
    writeYaml(packRecordPath(packId4, 'candidate'), pack4)
    console.log('  ✓ Test 4: Stale pack content blocked promotion')

    // ============================================================
    // Test 5: Proof tamper BLOCKS promotion (evaluation still references old digest)
    // ============================================================
    const packId5 = 'pack_test-promo-tamper_50000005'
    registerCleanup(packId5)

    const pack5 = makePackRecord(packId5)
    const proofRecord5 = buildProofRecord({ pack: pack5, analyses: analyses1, relations: relations1, skills: skills1 })
    writeYaml(packRecordPath(packId5, 'candidate'), pack5)
    writeTextAtomic(proofPathForPack(packId5), stableStringify(proofRecord5))
    writeTextAtomic(evaluationPathForPack(packId5, 'candidate'), stableStringify(makePassingEval(packId5, proofRecord5.content_digest)))

    // Tamper with the stored proof
    const tamperedProof = { ...proofRecord5, content_digest: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' }
    writeTextAtomic(proofPathForPack(packId5), stableStringify(tamperedProof))

    const changed5 = promotePassingCandidates(false, new Set([packId5]))
    assert.equal(changed5.length, 0, 'tampered proof should block promotion because proof_digest !== eval.proof_digest')
    console.log('  ✓ Test 5: Proof tamper blocked promotion')

    // ============================================================
    // Test 6: Evaluation proof_digest mismatch BLOCKS promotion
    // ============================================================
    const packId6 = 'pack_test-promo-mismatch_50000006'
    registerCleanup(packId6)

    const pack6 = makePackRecord(packId6)
    const proofRecord6 = buildProofRecord({ pack: pack6, analyses: analyses1, relations: relations1, skills: skills1 })
    writeYaml(packRecordPath(packId6, 'candidate'), pack6)
    writeTextAtomic(proofPathForPack(packId6), stableStringify(proofRecord6))

    // Write evaluation with a different proof_digest than the stored proof
    const mismatchEval = makePassingEval(packId6, 'sha256:1111111111111111111111111111111111111111111111111111111111111111')
    writeTextAtomic(evaluationPathForPack(packId6, 'candidate'), stableStringify(mismatchEval))

    const changed6 = promotePassingCandidates(false, new Set([packId6]))
    assert.equal(changed6.length, 0, 'evaluation proof mismatch should block promotion')
    console.log('  ✓ Test 6: Evaluation proof mismatch blocked promotion')

    // ============================================================
    // Test 7: Member version stale BLOCKS promotion
    // ============================================================
    const packId7 = 'pack_test-promo-stale-version_50000007'
    registerCleanup(packId7)

    const pack7 = makePackRecord(packId7)
    // Pin a wrong version_id
    pack7.members[0].version_id = 'nonexistent_version_v999'
    const proofRecord7 = buildProofRecord({ pack: pack7, analyses: analyses1, relations: relations1, skills: skills1 })
    writeYaml(packRecordPath(packId7, 'candidate'), pack7)
    writeTextAtomic(proofPathForPack(packId7), stableStringify(proofRecord7))
    writeTextAtomic(evaluationPathForPack(packId7, 'candidate'), stableStringify(makePassingEval(packId7, proofRecord7.content_digest)))

    const changed7 = promotePassingCandidates(false, new Set([packId7]))
    assert.equal(changed7.length, 0, 'stale member version should block promotion')
    console.log('  ✓ Test 7: Stale member version blocked promotion')

    console.log('pack proof promotion tests passed')
  } finally {
    cleanupAll()
  }
}

runAllTests()
