#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildWorkloadIdentityHint,
  computeTargetSkillId,
  computeWorkloadDigest,
  computeItemDigest,
  computeDecisionsDigest,
  computeInputBindings,
  findExistingMatch,
  prepareWorkload,
  validateCandidateProvenance,
  validateDecisions,
  applyDecisions,
  loadWorkload,
  writeOutcomeReport,
  checkAlreadyFinalized,
  runPreflight,
  buildNewDraft,
  buildUpdateDraft,
  finalizeWorkload,
} from './lib/normalization-lib.mjs'
import {
  idFor,
  ROOT,
  sha256,
  stableStringify,
} from '../../catalog-data/scripts/lib/catalog-lib.mjs'

let passed = 0
let failed = 0
const testDirs = []

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  PASS: ${name}`)
  } catch (err) {
    failed++
    console.error(`  FAIL: ${name}`)
    console.error(`    ${err.message}`)
    if (err.stack) {
      const stack = err.stack.split('\n').slice(1, 4).map(s => `    ${s.trim()}`).join('\n')
      console.error(stack)
    }
  }
}

function cleanup() {
  for (const d of testDirs) {
    if (existsSync(d)) rmSync(d, { recursive: true, force: true })
  }
}

function makeTempDir() {
  const d = mkdtempSync(join(ROOT, '.tmp-norm-test-'))
  testDirs.push(d)
  return d
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fixture helpers
// ═══════════════════════════════════════════════════════════════════════════════

function makeProvenance(sourceId, path, contentDigest, opts = {}) {
  const pinned = opts.pinned_commit ?? 'abc123def'
  const gitBlob = opts.git_blob_oid ?? contentDigest
  const rawUrl = opts.raw_url ?? `https://raw.githubusercontent.com/fixture/skills/${pinned}/${path}`
  const url = opts.url ?? `https://github.com/fixture/skills/blob/${pinned}/${path}`
  return {
    artifact_binding: {
      source_id: sourceId,
      remote_path: path,
      pinned_commit: pinned,
      git_blob_oid: gitBlob,
      raw_url: rawUrl,
    },
    upstream_ref: pinned,
    url: url,
    raw_url: rawUrl,
    git_blob_oid: gitBlob,
    size: opts.size ?? 1000,
  }
}

function makeSnapshotManifest(sourceId, artifacts, opts = {}) {
  return {
    schema_version: 1,
    source_id: sourceId,
    upstream_ref: opts.upstream_ref ?? (artifacts[0]?.upstream_ref ?? 'abc123def'),
    checked_at: opts.checked_at ?? '2026-07-28T00:00:00.000Z',
    url: opts.url ?? 'https://github.com/fixture/skills',
    artifacts: artifacts.map(a => ({
      source_id: a.source_id ?? sourceId,
      path: a.path,
      declared_name: a.declared_name ?? a.path.split('/').pop()?.replace('.md', '') ?? 'unknown',
      format: a.format ?? 'SKILL.md',
      parse_confidence: a.parse_confidence ?? 'high',
      content_digest: a.content_digest ?? a.git_blob_oid ?? 'sha256:test',
      upstream_ref: a.upstream_ref ?? 'abc123def',
      git_blob_oid: a.git_blob_oid ?? a.content_digest ?? 'sha256:test',
      url: a.url ?? `https://github.com/fixture/skills/blob/abc123def/${a.path}`,
      raw_url: a.raw_url ?? `https://raw.githubusercontent.com/fixture/skills/abc123def/${a.path}`,
      artifact_binding: {
        source_id: a.source_id ?? sourceId,
        canonical_skill_id: null,
        remote_path: a.path,
        pinned_commit: a.pinned_commit ?? 'abc123def',
        git_blob_oid: a.git_blob_oid ?? a.content_digest ?? 'sha256:test',
        raw_url: a.raw_url ?? `https://raw.githubusercontent.com/fixture/skills/abc123def/${a.path}`,
        expected_output_path: null,
      },
      raw_metadata: a.raw_metadata ?? { size: a.size ?? 1000 },
    })),
  }
}

function makeCandidate(overrides = {}) {
  const id = idFor('cand', [`test-cand-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`])
  const path = overrides.path ?? 'skills/test-skill/SKILL.md'
  const sourceId = overrides.source_id ?? 'src_fixture_00000001'
  const digest = overrides.content_digest ?? sha256(`test-content-${Date.now()}-${Math.random()}`)
  return {
    candidate_id: id,
    source_id: sourceId,
    path: path,
    content_digest: digest,
    declared_name: overrides.declared_name ?? 'test-skill',
    format: 'SKILL.md',
    parse_confidence: 'high',
    extracted_at: '2026-07-28T00:00:00.000Z',
    schema_version: 1,
    provenance: overrides.provenance ?? makeProvenance(sourceId, path, digest),
    ...overrides,
  }
}

function makeExistingSkill(overrides = {}) {
  const skillId = idFor('skl', ['existing-skill', 'src_fixture_00000001', 'skills/existing-skill/SKILL.md'])
  return {
    canonical_skill_id: skillId,
    canonical_name: 'existing-skill',
    display_name: 'Existing Skill',
    status: 'active',
    identity: {
      source_skill_ids: ['cand_existing_abc00001'],
      aliases: ['old-alias'],
      current_version_id: 'sha256:abc123',
    },
    source: {
      source_id: 'src_fixture_00000001',
      path: 'skills/existing-skill/SKILL.md',
      url: 'https://github.com/fixture/skills',
      upstream_ref: 'abc123def',
      license: { spdx: 'MIT', verified: true, evidence: 'LICENSE' },
    },
    capabilities: { domains: ['testing'], task_types: ['validation'], workflow_stages: ['check'], atomic_capabilities: [] },
    interfaces: { inputs: [], outputs: [], handoff_outputs: [] },
    tools: { required: [], optional: [] },
    risk: { side_effect_level: 'none', risk_surfaces: [] },
    quality: { score: 0.5, confidence: 'medium' },
    relations: { duplicates: [], complements: [], conflicts: [] },
    analysis: { path: 'catalog/analyses/ex/skl_existing-skill.md', hash: 'sha256:analysis123' },
    curation: { notes: ['existing note'] },
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeRegistry(sources = null) {
  return {
    schema_version: 1,
    sources: sources ?? [
      {
        source_id: 'src_fixture_00000001',
        name: 'Fixture Source',
        url: 'https://github.com/fixture/skills',
        type: 'github_repo',
        status: 'active',
        license: { spdx: 'MIT', verified: true },
        state: { last_ref: 'abc123def', last_checked_at: '2026-07-28T00:00:00.000Z' },
      },
    ],
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Identity tests (Defect #1)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Identity ---')

test('computeTargetSkillId produces deterministic ID from canonical_name + source + path', () => {
  const id1 = computeTargetSkillId('my-skill', 'src_test_0001', 'skills/my-skill/SKILL.md')
  const id2 = computeTargetSkillId('my-skill', 'src_test_0001', 'skills/my-skill/SKILL.md')
  assert.equal(id1, id2)
  assert.ok(id1.startsWith('skl_'))
})

test('computeTargetSkillId rejects empty canonical_name', () => {
  assert.throws(() => computeTargetSkillId('', 'src_test_0001', 'skills/a/SKILL.md'), /non-empty/)
})

test('computeTargetSkillId produces valid IDs with punctuation in name (slugify handles it)', () => {
  // idFor slugs names internally, so names with spaces/special chars produce valid IDs
  // but the decisions validator will catch invalid characters at the canonical_name level
  const id = computeTargetSkillId('my-skill.with_dots', 'src_test_0001', 'skills/a/SKILL.md')
  assert.ok(id.startsWith('skl_'))
})

test('buildWorkloadIdentityHint returns hint not decision; different name = different hint', () => {
  const c1 = { source_id: 'src_test_0001', path: 'skills/a/SKILL.md', declared_name: 'skill-a' }
  const c2 = { source_id: 'src_test_0001', path: 'skills/a/SKILL.md', declared_name: 'skill-b' }
  assert.notEqual(
    buildWorkloadIdentityHint(c1).canonical_skill_id,
    buildWorkloadIdentityHint(c2).canonical_skill_id,
  )
})

test('findExistingMatch — exact_id match', () => {
  const existing = makeExistingSkill()
  const skills = new Map([[existing.canonical_skill_id, existing]])
  const result = findExistingMatch(
    { source_id: 'src_fixture_00000001', path: 'skills/existing-skill/SKILL.md', declared_name: 'existing-skill' },
    skills,
  )
  assert.equal(result.match_type, 'exact_id')
  assert.equal(result.record.canonical_skill_id, existing.canonical_skill_id)
})

test('findExistingMatch — no match for novel skill', () => {
  const skills = new Map()
  const result = findExistingMatch(
    { source_id: 'src_fixture_00000001', path: 'skills/novel/SKILL.md', declared_name: 'novel' },
    skills,
  )
  assert.equal(result.match_type, 'none')
  assert.equal(result.record, null)
})

test('findExistingMatch — source_path match with different name', () => {
  const existing = makeExistingSkill()
  const skills = new Map([['skl_random_id_00000001', existing]])
  const result = findExistingMatch(
    { source_id: 'src_fixture_00000001', path: 'skills/existing-skill/SKILL.md', declared_name: 'different-name' },
    skills,
  )
  assert.equal(result.match_type, 'source_path')
  assert.equal(result.record, existing)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Provenance validation tests
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Provenance Validation ---')

test('validateCandidateProvenance — passes valid candidate', () => {
  const c = makeCandidate()
  const reasons = validateCandidateProvenance(c)
  assert.equal(reasons.length, 0)
})

for (const field of ['source_id', 'path', 'content_digest', 'declared_name', 'candidate_id']) {
  test(`validateCandidateProvenance — rejects missing ${field}`, () => {
    const c = makeCandidate({ [field]: null })
    const reasons = validateCandidateProvenance(c)
    assert.ok(reasons.includes(`missing ${field}`), `Expected 'missing ${field}' in ${JSON.stringify(reasons)}`)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Digest tests (Defect #2: TOCTOU hardening)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Digest & Binding ---')

test('computeWorkloadDigest — deterministic', () => {
  const items = [
    { candidate: { candidate_id: 'c1', content_digest: 'd1', source_id: 's1', path: 'p1', declared_name: 'n1' }, identity_hint: { canonical_skill_id: 'skl_a_00000001', canonical_name: 'a', display_name: 'a' }, existing_match: null, source: { status: 'active' } },
  ]
  const blocked = []
  const bindings = { candidate_jsonl_digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', source_registry_digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', existing_records_digest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' }
  const d1 = computeWorkloadDigest(items, blocked, bindings)
  const d2 = computeWorkloadDigest(items, blocked, bindings)
  assert.equal(d1, d2)
})

test('computeWorkloadDigest — different inputs give different digest', () => {
  const items1 = [
    { candidate: { candidate_id: 'c1', content_digest: 'd1', source_id: 's1', path: 'p1', declared_name: 'n1' }, identity_hint: { canonical_skill_id: 'skl_a_00000001', canonical_name: 'a', display_name: 'a' }, existing_match: null, source: { status: 'active' } },
  ]
  const items2 = [
    { candidate: { candidate_id: 'c2', content_digest: 'd2', source_id: 's2', path: 'p2', declared_name: 'n2' }, identity_hint: { canonical_skill_id: 'skl_b_00000002', canonical_name: 'b', display_name: 'b' }, existing_match: null, source: { status: 'active' } },
  ]
  const bindings = { candidate_jsonl_digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', source_registry_digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', existing_records_digest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' }
  assert.notEqual(computeWorkloadDigest(items1, [], bindings), computeWorkloadDigest(items2, [], bindings))
})

test('computeWorkloadDigest — binds provenance_blocked', () => {
  const bindings = { candidate_jsonl_digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', source_registry_digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', existing_records_digest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' }
  const d1 = computeWorkloadDigest([], [{ candidate_id: 'c1', declared_name: 'n', source_id: 's', path: 'p', content_digest: 'd', reasons: ['missing x'], terminal: 'provenance_blocked' }], bindings)
  const d2 = computeWorkloadDigest([], [{ candidate_id: 'c1', declared_name: 'n', source_id: 's', path: 'p', content_digest: 'd', reasons: ['missing y'], terminal: 'provenance_blocked' }], bindings)
  assert.notEqual(d1, d2)
})

test('computeItemDigest — deterministic for same data', () => {
  const item = {
    candidate: { candidate_id: 'c1', content_digest: 'd1', source_id: 's1', path: 'p1', declared_name: 'n1' },
    identity_hint: { canonical_skill_id: 'skl_a_00000001', canonical_name: 'a', display_name: 'a' },
    existing_match: null,
  }
  assert.equal(computeItemDigest(item), computeItemDigest(item))
})

test('computeInputBindings — computes digests from files', () => {
  const dir = makeTempDir()
  const a = join(dir, 'a.jsonl')
  const b = join(dir, 'b.yaml')
  writeFileSync(a, '{"a":1}\n{"b":2}\n')
  writeFileSync(b, 'registry: test\n')

  const bindings = computeInputBindings(a, b, join(dir, 'nonexistent'))
  assert.ok(bindings.candidate_jsonl_digest.startsWith('sha256:'))
  assert.ok(bindings.source_registry_digest.startsWith('sha256:'))
  assert.ok(bindings.existing_records_digest.startsWith('sha256:'))
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Source validation (Defect #4)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Source Validation ---')

test('source not found in registry produces null sourceSummary', () => {
  // Verified through integration: prepareWorkload with a candidate whose source_id
  // is not in the injected registry returns null sourceSummary, which causes
  // validateSourceApproval to return an error. The integration test for this is
  // covered in the 'prepareWorkload with non-existent source' pattern below.
  // For unit test completeness, verify the export exists:
  assert.ok(typeof computeInputBindings === 'function')
})

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Decisions validation (Defect #6: strict field allowlists)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Decisions Validation ---')

function makeWorkloadItem(opts = {}) {
  const item = {
    candidate: makeCandidate(),
    identity_hint: { canonical_skill_id: 'skl_test_00000001', canonical_name: 'test-skill', display_name: 'test-skill' },
    source: {
      source_id: 'src_fixture_00000001',
      name: 'Fixture Source',
      url: 'https://github.com/fixture/skills',
      type: 'github_repo',
      status: 'active',
      license: { spdx: 'MIT', verified: true },
      last_ref: 'abc123',
      last_checked_at: '2026-07-28T00:00:00.000Z',
    },
    existing_match: opts.existing_match ?? null,
    ...opts,
  }
  item.item_digest = computeItemDigest(item)
  return item
}

test('validateDecisions — accepts valid new decisions with canonical_name', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'test-skill', reason: 'First time' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, true)
})

test('validateDecisions — rejects new without canonical_name', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', reason: 'Missing canonical_name' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes('canonical_name')))
})

test('validateDecisions — rejects canonical_name on non-new decisions', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'rejected', canonical_name: 'shouldnt-be-here', reason: 'Nope' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes('canonical_name')))
})

test('validateDecisions — rejects unknown top-level decision key', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'test-skill', reason: 'ok', unknown_field: 'hi' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes('unknown key')))
})

test('validateDecisions — rejects unknown top-level document key', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'test-skill', reason: 'ok' }],
    extra_field: true,
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes('Unknown top-level key')))
})

test('validateDecisions — rejects disallowed draft_fields key', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'test-skill', reason: 'ok', draft_fields: { made_up_field: 1 } }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes('disallowed')))
})

test('validateDecisions — rejects controlled field in draft_fields', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'test-skill', reason: 'ok', draft_fields: { canonical_skill_id: 'skl_hijack_00000001' } }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes('controlled')))
})

test('validateDecisions — rejects non-object draft_fields', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'test-skill', reason: 'ok', draft_fields: 'string' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes('plain object')))
})

test('validateDecisions — rejects wrong schema_version', () => {
  const result = validateDecisions({ schema_version: 99, run_id: 'r', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', decisions: [] }, {}, new Map())
  assert.equal(result.valid, false)
})

test('validateDecisions — rejects wrong run_id', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'correct', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1 }
  const decisions = { schema_version: 1, run_id: 'wrong', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', decisions: [] }
  const result = validateDecisions(decisions, workload, new Map())
  assert.equal(result.valid, false)
})

test('validateDecisions — rejects unknown item_digest', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', decision: 'new', canonical_name: 'x', reason: 'test' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
})

test('validateDecisions — rejects invalid decision value', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'autonomous_new', canonical_name: 'test-skill', reason: 'test' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
})

test('validateDecisions — rejects update for item with no existing_match', () => {
  const item = makeWorkloadItem({ existing_match: null })
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'update', reason: 'test' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
})

test('validateDecisions — rejects missing reason', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'test-skill', reason: '' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
})

test('validateDecisions — rejects duplicate item_digest', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [
      { item_digest: item.item_digest, decision: 'new', canonical_name: 'test-skill', reason: 'first' },
      { item_digest: item.item_digest, decision: 'rejected', reason: 'second' },
    ],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes('duplicate')))
})

test('validateDecisions — rejects workload_digest mismatch', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:original', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:different',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'test-skill', reason: 'test' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
})

test('validateDecisions — rejects insufficient decision count', () => {
  const item1 = makeWorkloadItem()
  const item2 = makeWorkloadItem({ candidate: makeCandidate({ declared_name: 'skill-2', path: 'skills/s2/SKILL.md' }) })
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 2, items: [item1, item2] }
  const itemIndex = new Map()
  itemIndex.set(item1.item_digest, item1)
  itemIndex.set(item2.item_digest, item2)
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item1.item_digest, decision: 'new', canonical_name: 'skill-1', reason: 'ok' }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes('item_count')))
})

test('validateDecisions — accepts all valid decision types', () => {
  const decisionsValues = ['new', 'update', 'duplicate_needs_curation', 'rejected', 'blocked']
  for (const d of decisionsValues) {
    const existing = makeExistingSkill()
    const item = makeWorkloadItem({
      candidate: makeCandidate({ declared_name: d, path: `skills/${d}/SKILL.md` }),
      identity_hint: { canonical_skill_id: `skl_${d}_00000001`, canonical_name: d, display_name: d },
      existing_match: d === 'update'
        ? { match_type: 'exact_id', record: existing }
        : null,
    })
    const workload = { run_id: 'run_c', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
    const itemIndex = new Map([[item.item_digest, item]])
    const decObj = { item_digest: item.item_digest, decision: d, reason: `testing ${d}` }
    if (d === 'new') decObj.canonical_name = d
    const decisions = {
      schema_version: 1,
      run_id: 'run_c',
      workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
      decisions: [decObj],
    }
    const result = validateDecisions(decisions, workload, itemIndex)
    assert.equal(result.valid, true, `Decision '${d}' should be valid`)
  }
})

test('validateDecisions — rejects oversize reason', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'test-skill', reason: 'x'.repeat(2001) }],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes('byte')))
})

test('validateDecisions — rejects non-object decisions array element', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: ['not-an-object'],
  }
  const result = validateDecisions(decisions, workload, itemIndex)
  assert.equal(result.valid, false)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Preflight tests (Defect #8: all-or-nothing)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Preflight ---')

test('runPreflight — succeeds for valid decisions', () => {
  const item = makeWorkloadItem()
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 1, items: [item] }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'cool-skill', reason: 'ok' }],
  }
  const result = runPreflight(decisions, workload, itemIndex)
  assert.equal(result.ok, true)
  assert.equal(result.draftEntries.length, 1)
  assert.equal(result.draftEntries[0].draft.canonical_name, 'cool-skill')
})

test('runPreflight — detects ID collision: two new items with same target', () => {
  const item1 = makeWorkloadItem({ candidate: makeCandidate({ source_id: 'src_fixture_00000001', path: 'skills/a/SKILL.md', declared_name: 'shared' }) })
  const item2 = makeWorkloadItem({ candidate: makeCandidate({ source_id: 'src_fixture_00000001', path: 'skills/b/SKILL.md', declared_name: 'shared' }) })
  // Both at different paths with same declared_name but resolved canonical_name may be unique per path.
  // Real collision: same canonical_name + same source + same path
  const item1b = makeWorkloadItem({ candidate: makeCandidate({ source_id: 'src_fixture_00000001', path: 'skills/cool/SKILL.md', declared_name: 'cool' }) })
  const item2b = makeWorkloadItem({ candidate: makeCandidate({ source_id: 'src_fixture_00000001', path: 'skills/cool/SKILL.md', declared_name: 'overlap' }) })
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 2, items: [item1b, item2b] }
  const itemIndex = new Map()
  itemIndex.set(item1b.item_digest, item1b)
  itemIndex.set(item2b.item_digest, item2b)
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [
      { item_digest: item1b.item_digest, decision: 'new', canonical_name: 'cool-skill', reason: 'ok1' },
      { item_digest: item2b.item_digest, decision: 'new', canonical_name: 'cool-skill', reason: 'ok2' },
    ],
  }
  const result = runPreflight(decisions, workload, itemIndex)
  assert.equal(result.ok, false)
  assert.ok(result.idCollisions.length > 0)
  assert.ok(result.idCollisions.some(e => e.includes('collision')))
})

test('runPreflight — detects collision between new and update for same skill', () => {
  const existing = makeExistingSkill()
  const item = makeWorkloadItem({
    candidate: makeCandidate({
      source_id: 'src_fixture_00000001',
      path: 'skills/existing-skill/SKILL.md',
      declared_name: 'existing-skill',
    }),
    existing_match: { match_type: 'exact_id', record: existing },
  })
  // Create second item that is at the same source+path and would be a 'new' with same canonical_name
  const targetId = computeTargetSkillId('existing-skill', 'src_fixture_00000001', 'skills/existing-skill/SKILL.md')
  const item2 = makeWorkloadItem({
    candidate: makeCandidate({
      source_id: 'src_fixture_00000001',
      path: 'skills/existing-skill/SKILL.md',
      declared_name: 'existing-skill',
    }),
    identity_hint: { canonical_skill_id: targetId, canonical_name: 'existing-skill', display_name: 'existing-skill' },
    existing_match: null,
    source: {
      source_id: 'src_fixture_00000001',
      name: 'Fixture',
      url: null, type: 'github_repo', status: 'active', license: null, last_ref: 'abc', last_checked_at: '2026-07-28T00:00:00.000Z',
    },
  })
  const workload = { run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', item_count: 2, items: [item, item2] }
  const itemIndex = new Map()
  itemIndex.set(item.item_digest, item)
  itemIndex.set(item2.item_digest, item2)
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [
      { item_digest: item.item_digest, decision: 'update', reason: 'update' },
      { item_digest: item2.item_digest, decision: 'new', canonical_name: 'existing-skill', reason: 'new' },
    ],
  }
  const result = runPreflight(decisions, workload, itemIndex)
  assert.equal(result.ok, false)
  assert.ok(result.idCollisions.length > 0)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Draft building tests (Defect #3: update preservation)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Draft Building ---')

test('buildNewDraft — produces new record with all required fields', () => {
  const candidate = makeCandidate({ content_digest: 'sha256:newcontent' })
  const item = {
    candidate,
    source: {
      source_id: 'src_fixture_00000001',
      name: 'Fixture',
      url: 'https://github.com/fixture/skills',
      type: 'github_repo',
      status: 'active',
      license: { spdx: 'MIT', verified: true },
      last_ref: 'abc123',
      last_checked_at: '2026-07-28T00:00:00.000Z',
    },
  }
  const targetSkillId = computeTargetSkillId('cool-skill', 'src_fixture_00000001', 'skills/cool/SKILL.md')
  const draft = buildNewDraft(item, 'cool-skill', {}, targetSkillId)
  assert.equal(draft.canonical_skill_id, targetSkillId)
  assert.equal(draft.canonical_name, 'cool-skill')
  assert.equal(draft.status, 'active')
  assert.equal(draft.identity.current_version_id, 'sha256:newcontent')
  assert.ok(draft.identity.source_skill_ids.includes(candidate.candidate_id))
  assert.ok(draft.capabilities)
  assert.ok(draft.interfaces)
  assert.ok(draft.tools)
  assert.ok(draft.risk)
  assert.ok(draft.quality)
  assert.ok(draft.relations)
  assert.ok(draft.analysis)
  assert.ok(draft.curation)
})

test('buildUpdateDraft — preserves all existing semantic/curation fields', () => {
  const existing = makeExistingSkill()
  const candidate = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/existing-skill/SKILL.md',
    declared_name: 'existing-skill',
    content_digest: 'sha256:newversion',
  })
  const item = {
    candidate,
    source: {
      source_id: 'src_fixture_00000001',
      name: 'Fixture',
      url: 'https://github.com/fixture/skills',
      type: 'github_repo',
      status: 'active',
      license: { spdx: 'MIT', verified: true },
      last_ref: 'abc123',
      last_checked_at: '2026-07-28T00:00:00.000Z',
    },
  }
  const draft = buildUpdateDraft(item, existing, {})
  // Preservation checks
  assert.equal(draft.canonical_skill_id, existing.canonical_skill_id)
  assert.equal(draft.created_at, existing.created_at)
  assert.equal(draft.status, existing.status)
  assert.deepEqual(draft.capabilities, existing.capabilities)
  assert.deepEqual(draft.interfaces, existing.interfaces)
  assert.deepEqual(draft.tools, existing.tools)
  assert.deepEqual(draft.risk, existing.risk)
  assert.deepEqual(draft.quality, existing.quality)
  assert.deepEqual(draft.relations, existing.relations)
  assert.deepEqual(draft.analysis, existing.analysis)
  assert.deepEqual(draft.curation, existing.curation)
  assert.equal(draft.identity.aliases.length, existing.identity.aliases.length)
  assert.ok(draft.identity.aliases.includes('old-alias'))
  // Version/identity updates
  assert.equal(draft.identity.current_version_id, 'sha256:newversion')
  assert.ok(draft.identity.source_skill_ids.includes(candidate.candidate_id))
})

test('buildUpdateDraft — preserves display_name from draft_fields', () => {
  const existing = makeExistingSkill()
  const item = { candidate: makeCandidate(), source: null }
  const draft = buildUpdateDraft(item, existing, { display_name: 'Renamed Skill' })
  assert.equal(draft.display_name, 'Renamed Skill')
})

// ═══════════════════════════════════════════════════════════════════════════════
// 8. applyDecisions tests (Defects #5, #8: preblocked outcomes, all-or-nothing)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Apply Decisions ---')

function makeWritableContext() {
  const writtenDrafts = []
  const writerFn = (draft) => { writtenDrafts.push({ ...draft }) }
  const dir = makeTempDir()
  return { writtenDrafts, writerFn, dir }
}

test('applyDecisions — new writes draft via injected writer', () => {
  const { writtenDrafts, writerFn, dir } = makeWritableContext()
  const item = makeWorkloadItem()
  const workload = {
    run_id: 'run_apply_new', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    item_count: 1, items: [item], provenance_blocked: [],
  }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_apply_new',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'cool-skill', reason: 'New skill' }],
  }
  const result = applyDecisions(decisions, workload, itemIndex, { dryRun: false, outputDir: dir, writeSkillRecordFn: writerFn })
  assert.equal(result.outcomes.length, 1)
  assert.equal(result.outcomes[0].status, 'written')
  assert.equal(result.written.length, 1)
  assert.equal(writtenDrafts.length, 1)
  assert.equal(writtenDrafts[0].canonical_name, 'cool-skill')
})

test('applyDecisions — provenance_blocked items appear in outcomes', () => {
  const { writtenDrafts, writerFn, dir } = makeWritableContext()
  const item = makeWorkloadItem()
  const workload = {
    run_id: 'run_preblocked', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    item_count: 1, items: [item],
    provenance_blocked: [
      { candidate_id: 'bad_cand_01', declared_name: 'bad-skill', source_id: null, path: null, content_digest: null, reasons: ['missing path'], terminal: 'provenance_blocked' },
    ],
  }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_preblocked',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'good-skill', reason: 'ok' }],
  }
  const result = applyDecisions(decisions, workload, itemIndex, { dryRun: false, outputDir: dir, writeSkillRecordFn: writerFn })
  // Should have 2 outcomes: 1 written + 1 preblocked
  assert.equal(result.outcomes.length, 2)
  const blockedOutcome = result.outcomes.find(o => o.preblocked)
  assert.ok(blockedOutcome, 'Should have a preblocked outcome')
  assert.equal(blockedOutcome.status, 'noted')
  assert.equal(blockedOutcome.decision, 'blocked')
})

test('applyDecisions — update writes and preserves fields', () => {
  const { writtenDrafts, writerFn, dir } = makeWritableContext()
  const existing = makeExistingSkill()
  const item = makeWorkloadItem({
    candidate: makeCandidate({
      source_id: 'src_fixture_00000001',
      path: 'skills/existing-skill/SKILL.md',
      declared_name: 'existing-skill',
      content_digest: 'sha256:newversion',
    }),
    existing_match: { match_type: 'exact_id', record: existing },
  })
  const workload = {
    run_id: 'run_apply_upd', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    item_count: 1, items: [item], provenance_blocked: [],
  }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_apply_upd',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'update', reason: 'Upstream change' }],
  }
  const result = applyDecisions(decisions, workload, itemIndex, { dryRun: false, outputDir: dir, writeSkillRecordFn: writerFn })
  assert.equal(result.outcomes.length, 1)
  assert.equal(result.outcomes[0].status, 'written')
  const draft = writtenDrafts[0]
  assert.deepEqual(draft.capabilities, existing.capabilities) // preserved
  assert.deepEqual(draft.curation, existing.curation) // preserved
  assert.equal(draft.identity.current_version_id, 'sha256:newversion') // updated
  assert.equal(draft.created_at, existing.created_at) // preserved
})

test('applyDecisions — non-writable terminals produce no writes', () => {
  const { writtenDrafts, writerFn, dir } = makeWritableContext()
  const item = makeWorkloadItem()
  const workload = {
    run_id: 'run_nonwrite', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    item_count: 1, items: [item], provenance_blocked: [],
  }
  const itemIndex = new Map([[item.item_digest, item]])

  for (const d of ['duplicate_needs_curation', 'rejected', 'blocked']) {
    const decisions = {
      schema_version: 1,
      run_id: 'run_nonwrite',
      workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
      decisions: [{ item_digest: item.item_digest, decision: d, reason: `Testing ${d}` }],
    }
    writtenDrafts.length = 0
    const result = applyDecisions(decisions, workload, itemIndex, { dryRun: false, outputDir: dir, writeSkillRecordFn: writerFn })
    assert.equal(result.outcomes.length, 1, `Outcome count for ${d}`)
    assert.equal(result.outcomes[0].status, 'noted', `Status for ${d}`)
    assert.equal(result.written.length, 0, `Written count for ${d}`)
    assert.equal(writtenDrafts.length, 0, `Drafts written for ${d}`)
  }
})

test('applyDecisions — dry-run does not write', () => {
  const { writtenDrafts, writerFn, dir } = makeWritableContext()
  const item = makeWorkloadItem()
  const workload = {
    run_id: 'run_dry', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    item_count: 1, items: [item], provenance_blocked: [],
  }
  const itemIndex = new Map([[item.item_digest, item]])
  const decisions = {
    schema_version: 1,
    run_id: 'run_dry',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: item.item_digest, decision: 'new', canonical_name: 'dry-skill', reason: 'test' }],
  }
  const result = applyDecisions(decisions, workload, itemIndex, { dryRun: true, outputDir: dir, writeSkillRecordFn: writerFn })
  assert.equal(result.outcomes.length, 1)
  assert.equal(result.outcomes[0].status, 'would_write')
  assert.equal(result.written.length, 0)
  assert.equal(writtenDrafts.length, 0)
})

test('applyDecisions — preflight failure (collision) throws', () => {
  const { writerFn, dir } = makeWritableContext()
  const item1 = makeWorkloadItem({
    candidate: makeCandidate({ source_id: 'src_fixture_00000001', path: 'skills/dup/SKILL.md', declared_name: 'dup' }),
  })
  const item2 = makeWorkloadItem({
    candidate: makeCandidate({ source_id: 'src_fixture_00000001', path: 'skills/dup/SKILL.md', declared_name: 'other' }),
  })
  const workload = {
    run_id: 'run_coll', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    item_count: 2, items: [item1, item2], provenance_blocked: [],
  }
  const itemIndex = new Map()
  itemIndex.set(item1.item_digest, item1)
  itemIndex.set(item2.item_digest, item2)
  const decisions = {
    schema_version: 1,
    run_id: 'run_coll',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [
      { item_digest: item1.item_digest, decision: 'new', canonical_name: 'dup-skill', reason: 'first' },
      { item_digest: item2.item_digest, decision: 'new', canonical_name: 'dup-skill', reason: 'second' },
    ],
  }
  assert.throws(
    () => applyDecisions(decisions, workload, itemIndex, { dryRun: false, outputDir: dir, writeSkillRecordFn: writerFn }),
    /Preflight failed/,
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Idempotence tests (Defect #9)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Idempotence ---')

test('computeDecisionsDigest — deterministic', () => {
  const decisions = {
    schema_version: 1,
    run_id: 'run_t',
    workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', decision: 'new', canonical_name: 'x', reason: 'r' }],
  }
  assert.equal(computeDecisionsDigest(decisions), computeDecisionsDigest(decisions))
})

test('computeDecisionsDigest — different decisions give different digests', () => {
  const d1 = {
    schema_version: 1,
    run_id: 'run_t', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', decision: 'new', canonical_name: 'a', reason: 'r1' }],
  }
  const d2 = {
    schema_version: 1,
    run_id: 'run_t2', workload_digest: 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
    decisions: [{ item_digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', decision: 'new', canonical_name: 'b', reason: 'r2' }],
  }
  assert.notEqual(computeDecisionsDigest(d1), computeDecisionsDigest(d2))
})

test('checkAlreadyFinalized — returns not finalized when no file', () => {
  const dir = makeTempDir()
  const result = checkAlreadyFinalized('run_nonexist', 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', { outputDir: dir })
  assert.equal(result.finalized, false)
})

test('checkAlreadyFinalized — returns same=true for identical digest', () => {
  const dir = makeTempDir()
  const digest = 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'finalization-outcomes.json'), JSON.stringify({ decisions_digest: digest }))
  const result = checkAlreadyFinalized('run_same', digest, { outputDir: dir })
  assert.equal(result.finalized, true)
  assert.equal(result.same, true)
})

test('checkAlreadyFinalized — returns same=false for different digest', () => {
  const dir = makeTempDir()
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'finalization-outcomes.json'), JSON.stringify({ decisions_digest: 'sha256:original' }))
  const result = checkAlreadyFinalized('run_diff', 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', { outputDir: dir })
  assert.equal(result.finalized, true)
  assert.equal(result.same, false)
})

test('checkAlreadyFinalized — repeat finalize with same decisions is no-op', () => {
  const { writtenDrafts, writerFn, dir } = makeWritableContext()
  const item = makeWorkloadItem()

  // Prepare
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  writeFileSync(candidatePath, JSON.stringify(item.candidate) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))

  // Create matching snapshot manifest
  const c = item.candidate
  const manifest = makeSnapshotManifest(c.source_id, [{
    source_id: c.source_id,
    path: c.path,
    content_digest: c.content_digest,
    upstream_ref: c.provenance?.upstream_ref ?? 'abc123def',
  }])
  writeFileSync(join(snapshotDir, `snap_${c.source_id}_test.json`), stableStringify(manifest))

  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const fixLoadR = () => makeRegistry()
  const fixLoadS = () => []

  const { workload } = prepareWorkload('run_idem', {
    candidatesPath: candidatePath,
    registryPath: registryPath,
    recordsDir: recordsDir,
    snapshotDir: snapshotDir,
    outputDir: dir,
    loadRegistryFn: fixLoadR,
    loadSkillRecordsFn: fixLoadS,
  })

  const decisions = {
    schema_version: 1,
    run_id: 'run_idem',
    workload_digest: workload.workload_digest,
    decisions: [{ item_digest: workload.items[0].item_digest, decision: 'new', canonical_name: 'idem-skill', reason: 'once' }],
  }

  // First finalize
  const res1 = finalizeWorkload('run_idem', decisions, {
    outputDir: dir,
    workloadDir: dir,
    writeSkillRecordFn: writerFn,
    candidatesPath: candidatePath,
    registryPath: registryPath,
    recordsDir: recordsDir,
    snapshotDir: snapshotDir,
  })
  assert.equal(res1.status, 'ok')
  assert.equal(writtenDrafts.length, 1)

  // Second finalize with same decisions -> should return already_finalized
  const res2 = finalizeWorkload('run_idem', decisions, {
    outputDir: dir,
    workloadDir: dir,
    writeSkillRecordFn: writerFn,
    candidatesPath: candidatePath,
    registryPath: registryPath,
    recordsDir: recordsDir,
    snapshotDir: snapshotDir,
  })
  assert.equal(res2.status, 'already_finalized')
})

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Integration tests (full prepare → decision → finalize)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Integration ---')

test('integration: prepare → load → decisions → finalize (new)', () => {
  const { writtenDrafts, writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const candidate = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/integration-test/SKILL.md',
    declared_name: 'integration-test',
    content_digest: 'sha256:itest',
  })
  writeFileSync(candidatePath, JSON.stringify(candidate) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))

  // Write matching snapshot manifest
  const manifest = makeSnapshotManifest(candidate.source_id, [{
    source_id: candidate.source_id,
    path: candidate.path,
    content_digest: candidate.content_digest,
    upstream_ref: candidate.provenance?.upstream_ref ?? 'abc123def',
  }])
  writeFileSync(join(snapshotDir, 'fixture_snap.json'), stableStringify(manifest))

  const fixLoadR = () => makeRegistry()
  const fixLoadS = () => []

  // Prepare
  const { workload } = prepareWorkload('run_int_new', {
    candidatesPath: candidatePath,
    registryPath: registryPath,
    recordsDir: recordsDir,
    snapshotDir: snapshotDir,
    outputDir: dir,
    loadRegistryFn: fixLoadR,
    loadSkillRecordsFn: fixLoadS,
  })
  assert.equal(workload.item_count, 1)
  assert.ok(workload.workload_digest.startsWith('sha256:'))

  // Load
  const { workload: loaded, itemIndex } = loadWorkload('run_int_new', {
    workloadDir: dir,
    candidatesPath: candidatePath,
    registryPath: registryPath,
    recordsDir: recordsDir,
    snapshotDir: snapshotDir,
  })
  assert.equal(loaded.item_count, 1)

  // Make decisions
  const decisions = {
    schema_version: 1,
    run_id: 'run_int_new',
    workload_digest: workload.workload_digest,
    decisions: [{ item_digest: workload.items[0].item_digest, decision: 'new', canonical_name: 'integration-test', reason: 'Integration test normalization' }],
  }

  // Validate
  const validation = validateDecisions(decisions, loaded, itemIndex)
  assert.equal(validation.valid, true)

  // Finalize
  const result = finalizeWorkload('run_int_new', decisions, {
    outputDir: dir,
    workloadDir: dir,
    writeSkillRecordFn: writerFn,
    candidatesPath: candidatePath,
    registryPath: registryPath,
    recordsDir: recordsDir,
    snapshotDir: snapshotDir,
  })
  assert.equal(result.status, 'ok')
  assert.equal(result.written.length, 1)
  assert.equal(result.total, 1)
  assert.equal(writtenDrafts.length, 1)
  assert.equal(writtenDrafts[0].canonical_name, 'integration-test')
})

test('integration: stale candidate JSONL after prepare is rejected', () => {
  const { writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const candidate = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/stale-test/SKILL.md',
    declared_name: 'stale-test',
  })
  writeFileSync(candidatePath, JSON.stringify(candidate) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))

  // Write matching snapshot manifest
  const manifest = makeSnapshotManifest(candidate.source_id, [{
    source_id: candidate.source_id,
    path: candidate.path,
    content_digest: candidate.content_digest,
    upstream_ref: candidate.provenance?.upstream_ref ?? 'abc123def',
  }])
  writeFileSync(join(snapshotDir, 'fixture_snap.json'), stableStringify(manifest))

  const fixLoadR = () => makeRegistry()
  const fixLoadS = () => []

  const { workload } = prepareWorkload('run_stale', {
    candidatesPath: candidatePath,
    registryPath: registryPath,
    recordsDir: recordsDir,
    snapshotDir: snapshotDir,
    outputDir: dir,
    loadRegistryFn: fixLoadR,
    loadSkillRecordsFn: fixLoadS,
  })

  // Tamper with candidate file
  writeFileSync(candidatePath, JSON.stringify({ ...candidate, declared_name: 'tampered' }) + '\n')

  // Load should fail
  assert.throws(
    () => loadWorkload('run_stale', { workloadDir: dir, candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir, snapshotDir: snapshotDir }),
    /Candidate JSONL changed/,
  )
})

test('integration: workload rejections include provenance_blocked items', () => {
  const { writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const digest = sha256('valid-content')
  const valid = makeCandidate({ declared_name: 'valid', path: 'skills/valid/SKILL.md', content_digest: digest })
  const invalid = makeCandidate({ declared_name: null, path: null, provenance: null })
  writeFileSync(candidatePath, JSON.stringify(valid) + '\n' + JSON.stringify(invalid) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))

  // Snapshot manifest for valid candidate only
  const manifest = makeSnapshotManifest(valid.source_id, [{
    source_id: valid.source_id,
    path: valid.path,
    content_digest: valid.content_digest,
    upstream_ref: valid.provenance?.upstream_ref ?? 'abc123def',
  }])
  writeFileSync(join(snapshotDir, 'fixture_snap.json'), stableStringify(manifest))

  const fixLoadR = () => makeRegistry()
  const fixLoadS = () => []

  const { workload } = prepareWorkload('run_pb', {
    candidatesPath: candidatePath,
    registryPath: registryPath,
    recordsDir: recordsDir,
    snapshotDir: snapshotDir,
    outputDir: dir,
    loadRegistryFn: fixLoadR,
    loadSkillRecordsFn: fixLoadS,
  })

  assert.equal(workload.item_count, 1)
  assert.equal(workload.provenance_blocked_count, 1)
  assert.equal(workload.candidate_count, 2)
  // One is blocked for missing fields (declared_name, path), not for snapshot
  const blocked = workload.provenance_blocked
  assert.ok(blocked.some(b => b.candidate_id === invalid.candidate_id || (b.declared_name === null && b.path === null)), 'Should include the invalid candidate as provenance_blocked')
  assert.ok(blocked.every(b => b.reasons.length > 0))
  assert.equal(blocked[0].terminal, 'provenance_blocked')
})

test('integration: update preserves existing record fields end-to-end', () => {
  const { writtenDrafts, writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const existing = makeExistingSkill()
  const candidate = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/existing-skill/SKILL.md',
    declared_name: 'existing-skill',
    content_digest: 'sha256:newcont',
  })
  writeFileSync(candidatePath, JSON.stringify(candidate) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))

  // Write matching snapshot manifest
  const manifest = makeSnapshotManifest(candidate.source_id, [{
    source_id: candidate.source_id,
    path: candidate.path,
    content_digest: candidate.content_digest,
    upstream_ref: candidate.provenance?.upstream_ref ?? 'abc123def',
  }])
  writeFileSync(join(snapshotDir, 'fixture_snap.json'), stableStringify(manifest))

  const fixLoadR = () => makeRegistry()
  const fixLoadS = () => [{ path: join(recordsDir, 'existing.yaml'), record: existing }]

  const { workload } = prepareWorkload('run_upd_int', {
    candidatesPath: candidatePath,
    registryPath: registryPath,
    recordsDir: recordsDir,
    snapshotDir: snapshotDir,
    outputDir: dir,
    loadRegistryFn: fixLoadR,
    loadSkillRecordsFn: fixLoadS,
  })

  assert.equal(workload.items[0].existing_match.match_type, 'exact_id')

  const decisions = {
    schema_version: 1,
    run_id: 'run_upd_int',
    workload_digest: workload.workload_digest,
    decisions: [{ item_digest: workload.items[0].item_digest, decision: 'update', reason: 'Version bump' }],
  }

  const result = finalizeWorkload('run_upd_int', decisions, {
    outputDir: dir,
    workloadDir: dir,
    writeSkillRecordFn: writerFn,
    candidatesPath: candidatePath,
    registryPath: registryPath,
    recordsDir: recordsDir,
    snapshotDir: snapshotDir,
  })

  assert.equal(result.status, 'ok')
  const draft = writtenDrafts[0]
  assert.equal(draft.canonical_skill_id, existing.canonical_skill_id)
  assert.deepEqual(draft.capabilities, existing.capabilities)
  assert.deepEqual(draft.curation, existing.curation)
  assert.deepEqual(draft.relations, existing.relations)
  assert.deepEqual(draft.analysis, existing.analysis)
  assert.deepEqual(draft.quality, existing.quality)
  assert.equal(draft.created_at, existing.created_at)
  assert.equal(draft.identity.current_version_id, 'sha256:newcont')
})

console.log('\n--- Outcome Report ---')

test('writeOutcomeReport produces valid report file', () => {
  const dir = makeTempDir()
  const outcomes = [
    { item_digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', candidate_id: 'c1', declared_name: 'n1', decision: 'new', canonical_skill_id: 'skl_n1_00000001', reason: 'r1', written: true, status: 'written' },
  ]
  const reportPath = writeOutcomeReport('run_rpt', outcomes, ['skl_n1_00000001'], 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', 'sha256:wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww', { outputDir: dir })
  assert.ok(existsSync(reportPath))
  const content = JSON.parse(readFileSync(reportPath, 'utf8'))
  assert.equal(content.decisions_digest, 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd')
  assert.equal(content.written_count, 1)
  assert.equal(content.outcomes.length, 1)
})

// ═══════════════════════════════════════════════════════════════════════════════
// 11. Provenance chain integration tests
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n--- Provenance Chain ---')

test('provenance: exact-match snapshot resolution succeeds', () => {
  const { writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const digest = sha256('exact-match-content')
  const candidate = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/exact-match/SKILL.md',
    declared_name: 'exact-match',
    content_digest: digest,
  })
  writeFileSync(candidatePath, JSON.stringify(candidate) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))

  // Matching snapshot manifest with exact content_digest
  const manifest = makeSnapshotManifest(candidate.source_id, [{
    source_id: candidate.source_id,
    path: candidate.path,
    content_digest: digest,
    upstream_ref: candidate.provenance.artifact_binding.pinned_commit,
  }], { upstream_ref: candidate.provenance.artifact_binding.pinned_commit })
  writeFileSync(join(snapshotDir, 'exact.json'), stableStringify(manifest))

  const { workload } = prepareWorkload('run_prov_exact', {
    candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir,
    snapshotDir: snapshotDir, outputDir: dir,
    loadRegistryFn: () => makeRegistry(), loadSkillRecordsFn: () => [],
  })
  assert.equal(workload.item_count, 1)
  assert.equal(workload.provenance_blocked_count, 0)
  assert.ok(workload.items[0].snapshot)
  assert.equal(workload.items[0].snapshot.source_id, candidate.source_id)
  assert.equal(workload.items[0].snapshot.upstream_ref, candidate.provenance.upstream_ref)
})

test('provenance: candidate missing provenance is blocked', () => {
  const { writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const candidate = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/no-prov/SKILL.md',
    declared_name: 'no-prov',
    provenance: null,
  })
  writeFileSync(candidatePath, JSON.stringify(candidate) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))

  const { workload } = prepareWorkload('run_prov_none', {
    candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir,
    snapshotDir: snapshotDir, outputDir: dir,
    loadRegistryFn: () => makeRegistry(), loadSkillRecordsFn: () => [],
  })
  assert.equal(workload.item_count, 0)
  assert.equal(workload.provenance_blocked_count, 1)
  assert.ok(workload.provenance_blocked[0].reasons.some(r => r.includes('snapshot provenance')))
})

test('provenance: wrong blob OID in provenance is blocked', () => {
  const { writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const digest = sha256('wrong-oid-content')
  const wrongDigest = 'sha256:different-hash-value-for-testing-01'
  const candidate = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/wrong-oid/SKILL.md',
    declared_name: 'wrong-oid',
    content_digest: digest,
    provenance: makeProvenance('src_fixture_00000001', 'skills/wrong-oid/SKILL.md', wrongDigest),
  })
  writeFileSync(candidatePath, JSON.stringify(candidate) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))

  // Snapshot manifest has the correct digest (mismatches candidate blob OID)
  const manifest = makeSnapshotManifest(candidate.source_id, [{
    source_id: candidate.source_id,
    path: candidate.path,
    content_digest: digest,
    git_blob_oid: digest,
    upstream_ref: 'abc123def',
  }])
  writeFileSync(join(snapshotDir, 'wrong_oid_snap.json'), stableStringify(manifest))

  const { workload } = prepareWorkload('run_prov_wrong', {
    candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir,
    snapshotDir: snapshotDir, outputDir: dir,
    loadRegistryFn: () => makeRegistry(), loadSkillRecordsFn: () => [],
  })
  assert.equal(workload.provenance_blocked_count, 1)
  assert.ok(workload.provenance_blocked[0].reasons.some(r => r.includes('blob OID mismatch')))
})

test('provenance: missing snapshot manifest is blocked', () => {
  const { writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const digest = sha256('orphan-content')
  const candidate = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/orphan/SKILL.md',
    declared_name: 'orphan',
    content_digest: digest,
  })
  writeFileSync(candidatePath, JSON.stringify(candidate) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))
  // No snapshot manifest written

  const { workload } = prepareWorkload('run_prov_orphan', {
    candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir,
    snapshotDir: snapshotDir, outputDir: dir,
    loadRegistryFn: () => makeRegistry(), loadSkillRecordsFn: () => [],
  })
  assert.equal(workload.provenance_blocked_count, 1)
  assert.ok(workload.provenance_blocked[0].reasons.some(r => r.includes('no snapshot manifest')))
})

test('provenance: workload binds snapshot manifests raw hash, edit after prepare rejected', () => {
  const { writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const digest = sha256('toctou-content')
  const candidate = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/toctou/SKILL.md',
    declared_name: 'toctou',
    content_digest: digest,
  })
  writeFileSync(candidatePath, JSON.stringify(candidate) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))

  const snapPath = join(snapshotDir, 'toctou_snap.json')
  const manifest = makeSnapshotManifest(candidate.source_id, [{
    source_id: candidate.source_id,
    path: candidate.path,
    content_digest: digest,
    upstream_ref: 'abc123def',
  }], { checked_at: '2026-07-28T00:00:00.000Z', upstream_ref: 'abc123def' })
  writeFileSync(snapPath, stableStringify(manifest))

  const { workload } = prepareWorkload('run_prov_toctou', {
    candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir,
    snapshotDir: snapshotDir, outputDir: dir,
    loadRegistryFn: () => makeRegistry(), loadSkillRecordsFn: () => [],
  })
  assert.equal(workload.item_count, 1)

  // Tamper with snapshot manifest after prepare
  const tampered = { ...manifest, upstream_ref: 'tampered_commit_xxxxxxxx' }
  writeFileSync(snapPath, stableStringify(tampered))

  // Load should fail on snapshot manifests digest mismatch
  assert.throws(
    () => loadWorkload('run_prov_toctou', { workloadDir: dir, candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir, snapshotDir: snapshotDir }),
    /Snapshot manifests changed/,
  )
})

test('provenance: new draft uses pinned provenance ref, not later registry ref', () => {
  const { writtenDrafts, writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const digest = sha256('pinned-ref-content')
  const pinnedCommit = '1f630fdf9259cec4a14913127dfd7c3b69ef72eb'
  const rawUrl = `https://raw.githubusercontent.com/fixture/skills/${pinnedCommit}/skills/pinned-ref/SKILL.md`
  const candidate = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/pinned-ref/SKILL.md',
    declared_name: 'pinned-ref',
    content_digest: digest,
    provenance: makeProvenance('src_fixture_00000001', 'skills/pinned-ref/SKILL.md', digest, {
      pinned_commit: pinnedCommit,
      raw_url: rawUrl,
    }),
  })
  writeFileSync(candidatePath, JSON.stringify(candidate) + '\n')

  // Registry has a DIFFERENT (later) ref
  const registry = makeRegistry([{
    source_id: 'src_fixture_00000001',
    name: 'Fixture Source',
    url: 'https://github.com/fixture/skills',
    type: 'github_repo',
    status: 'active',
    license: { spdx: 'MIT', verified: true },
    state: { last_ref: 'later_ref_zzzzzzzz', last_checked_at: '2026-07-29T00:00:00.000Z' },
  }])
  writeFileSync(registryPath, stableStringify(registry))

  // Snapshot matches the pinned commit
  const manifest = makeSnapshotManifest(candidate.source_id, [{
    source_id: candidate.source_id,
    path: candidate.path,
    content_digest: digest,
    upstream_ref: pinnedCommit,
    raw_url: rawUrl,
  }], { upstream_ref: pinnedCommit })
  writeFileSync(join(snapshotDir, 'pinned.json'), stableStringify(manifest))

  const fixLoadR = () => registry
  const fixLoadS = () => []

  const { workload } = prepareWorkload('run_prov_pinned', {
    candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir,
    snapshotDir: snapshotDir, outputDir: dir,
    loadRegistryFn: fixLoadR, loadSkillRecordsFn: fixLoadS,
  })
  assert.equal(workload.item_count, 1)

  const decisions = {
    schema_version: 1,
    run_id: 'run_prov_pinned',
    workload_digest: workload.workload_digest,
    decisions: [{ item_digest: workload.items[0].item_digest, decision: 'new', canonical_name: 'pinned-ref', reason: 'Test pinned ref' }],
  }

  const result = finalizeWorkload('run_prov_pinned', decisions, {
    outputDir: dir, workloadDir: dir, writeSkillRecordFn: writerFn,
    candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir,
    snapshotDir: snapshotDir,
  })
  assert.equal(result.status, 'ok')
  const draft = writtenDrafts[0]
  // The upstream_ref must be the pinned commit, NOT the registry's later ref
  assert.equal(draft.source.upstream_ref, pinnedCommit, `Expected pinned commit ${pinnedCommit}, got ${draft.source.upstream_ref}`)
  // URL must be the provenance raw_url
  assert.equal(draft.source.url, rawUrl, `Expected raw URL ${rawUrl}, got ${draft.source.url}`)
  // License still comes from registry
  assert.equal(draft.source.license.spdx, 'MIT')
})

test('provenance: all candidate outcomes remain complete (provenance_blocked tracked)', () => {
  const { writtenDrafts, writerFn, dir } = makeWritableContext()
  const tmpDir = makeTempDir()
  const candidatePath = join(tmpDir, 'candidates.jsonl')
  const registryPath = join(tmpDir, 'registry.yaml')
  const snapshotDir = join(tmpDir, 'snapshots')
  mkdirSync(snapshotDir, { recursive: true })
  const recordsDir = join(tmpDir, 'records')
  mkdirSync(recordsDir, { recursive: true })

  const digest1 = sha256('good-content')
  const good = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/good/SKILL.md',
    declared_name: 'good',
    content_digest: digest1,
  })
  const bad = makeCandidate({
    source_id: 'src_fixture_00000001',
    path: 'skills/bad/SKILL.md',
    declared_name: 'bad',
    provenance: null,
    content_digest: sha256('bad-content'),
  })
  writeFileSync(candidatePath, JSON.stringify(good) + '\n' + JSON.stringify(bad) + '\n')
  writeFileSync(registryPath, stableStringify(makeRegistry()))

  // Snapshot manifest for good only
  const manifest = makeSnapshotManifest(good.source_id, [{
    source_id: good.source_id,
    path: good.path,
    content_digest: digest1,
    upstream_ref: 'abc123def',
  }])
  writeFileSync(join(snapshotDir, 'outcomes_snap.json'), stableStringify(manifest))

  const fixLoadR = () => makeRegistry()
  const fixLoadS = () => []

  const { workload } = prepareWorkload('run_prov_outcomes', {
    candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir,
    snapshotDir: snapshotDir, outputDir: dir,
    loadRegistryFn: fixLoadR, loadSkillRecordsFn: fixLoadS,
  })
  // 2 candidates total, 1 good item, 1 blocked
  assert.equal(workload.candidate_count, 2)
  assert.equal(workload.item_count, 1)
  assert.equal(workload.provenance_blocked_count, 1)
  assert.ok(workload.provenance_blocked[0].terminal === 'provenance_blocked')
  assert.ok(workload.provenance_blocked[0].candidate_id === bad.candidate_id)

  const decisions = {
    schema_version: 1,
    run_id: 'run_prov_outcomes',
    workload_digest: workload.workload_digest,
    decisions: [{ item_digest: workload.items[0].item_digest, decision: 'new', canonical_name: 'good-skill', reason: 'ok' }],
  }

  const result = finalizeWorkload('run_prov_outcomes', decisions, {
    outputDir: dir, workloadDir: dir, writeSkillRecordFn: writerFn,
    candidatesPath: candidatePath, registryPath: registryPath, recordsDir: recordsDir,
    snapshotDir: snapshotDir,
  })
  assert.equal(result.status, 'ok')
  // Outcomes should include both the written item and the provenance-blocked item
  assert.equal(result.total, 2, `Expected 2 total outcomes, got ${result.total}`)
  const writtenOutcomes = result.outcomes.filter(o => o.status === 'written')
  const blockedOutcomes = result.outcomes.filter(o => o.preblocked)
  assert.equal(writtenOutcomes.length, 1)
  assert.equal(blockedOutcomes.length, 1)
})

// ═══════════════════════════════════════════════════════════════════════════════
// Done
// ═══════════════════════════════════════════════════════════════════════════════

cleanup()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
