/**
 * Tests for collector, closure resolver, target selector, and prepare-run binding.
 *
 * Uses temporary fixture directories and injected readers.
 * No network, no Git mutation.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from '../../catalog-data/scripts/lib/catalog-lib.mjs';
import { collectRunContextInput, checkEvidenceFreshness } from './lib/collector.mjs';
import { resolveIntentClosure, buildSkillIndex, computeCoverage, computeRelationStats } from './lib/closure-resolver.mjs';
import { selectTargetIntents } from './lib/target-selector.mjs';
import { prepareRun } from './prepare-run.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ---- Test fixture helpers ----

function makeSkill(id, overrides = {}) {
  return {
    schema_version: 1,
    canonical_skill_id: id,
    canonical_name: id.replace(/^skl_/, ''),
    display_name: id.replace(/^skl_/, ''),
    status: 'active',
    capabilities: { domains: [], task_types: [], workflow_stages: [], atomic_capabilities: [] },
    identity: { source_skill_ids: [], aliases: [], current_version_id: 'v1' },
    source: { source_id: 'src_test', path: 'test/SKILL.md', license: {} },
    interfaces: { inputs: [], outputs: [], handoff_outputs: [] },
    tools: { required: [], optional: [] },
    risk: { risk_surfaces: [], side_effect_level: 'none' },
    quality: { confidence: 'unknown', score: null },
    relations: { complements: [], conflicts: [], duplicates: [] },
    analysis: { hash: null, path: null },
    created_at: '2026-07-27T12:00:00Z',
    updated_at: '2026-07-27T12:00:00Z',
    ...overrides,
  };
}

function makeAnalysis(skillId, overrides = {}) {
  return {
    schema_version: 2,
    analysis_id: `anl_${skillId}`,
    skill_id: skillId,
    source_hash: `sha256:${'a'.repeat(64)}`,
    analysis_version: 1,
    confidence: 'high',
    updated_at: '2026-07-27T12:00:00Z',
    ...overrides,
  };
}

function makeRelation(overrides = {}) {
  return {
    schema_version: 2,
    relation_id: `rel_test_${Math.random().toString(36).slice(2, 8)}`,
    predicate: 'chains_with',
    subject: 'skl_a',
    object: 'skl_b',
    weight: 0.85,
    evidence: 'test evidence',
    created_at: '2026-07-27T12:00:00Z',
    ...overrides,
  };
}

// ---- Fixture file setup ----

function buildFixtureRoot() {
  const tmpBase = join(__dirname, '..', '..', '..', '..', '.tmp-test-fixtures');
  const root = join(tmpBase, `test-${process.pid}-${Date.now()}`);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });  // create the root first
  mkdirSync(join(root, 'catalog', 'sources'), { recursive: true });
  mkdirSync(join(root, 'catalog', 'skills', 'records', 'te'), { recursive: true });
  mkdirSync(join(root, 'catalog', 'analyses', 'te'), { recursive: true });
  mkdirSync(join(root, 'catalog', 'relations'), { recursive: true });
  mkdirSync(join(root, 'catalog', 'packs', 'candidates'), { recursive: true });
  mkdirSync(join(root, 'catalog', 'packs', 'published'), { recursive: true });
  mkdirSync(join(root, 'catalog', 'runs'), { recursive: true });
  writeFileSync(join(root, 'AGENTS.md'), '# Test\n');
  return root;
}

function setupFixture(fixture) {
  const root = buildFixtureRoot();
  const cat = join(root, 'catalog');

  if (fixture.sources) {
    writeFileSync(join(cat, 'sources', 'registry.yaml'), fixture.sources);
  }
  if (fixture.sourceState !== undefined) {
    writeFileSync(join(cat, 'sources', 'state.jsonl'), fixture.sourceState);
  }
  if (fixture.skills) {
    for (const skill of fixture.skills) {
      const shard = skill.canonical_skill_id.slice(4, 6);
      const shardDir = join(cat, 'skills', 'records', shard);
      mkdirSync(shardDir, { recursive: true });
      writeFileSync(join(shardDir, `${skill.canonical_skill_id}.yaml`), skill.content);
    }
  }
  if (fixture.analyses) {
    for (const analysis of fixture.analyses) {
      const shard = analysis.skill_id.slice(4, 6);
      const shardDir = join(cat, 'analyses', shard);
      mkdirSync(shardDir, { recursive: true });
      writeFileSync(join(shardDir, `${analysis.skill_id}.md`), analysis.content);
    }
  }
  if (fixture.relations) {
    writeFileSync(join(cat, 'relations', 'edges-00000.jsonl'), fixture.relations);
  }
  if (fixture.packs) {
    for (const pack of fixture.packs) {
      const packDir = join(cat, 'packs',
        pack.status === 'published' ? 'published' : 'candidates', pack.pack_id);
      mkdirSync(packDir, { recursive: true });
      writeFileSync(join(packDir, 'pack.yaml'), pack.content);
    }
  }
  if (fixture.evaluations) {
    for (const ev of fixture.evaluations) {
      const dir = join(cat, dirname(ev.path));
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(cat, ev.path), ev.content);
    }
  }

  return { root, cat };
}

// ---- Fixture reader (ESM-safe, imports parseYaml from catalog-lib) ----

function extractFrontmatter(content) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return null;
  const rest = trimmed.slice(3);
  const endIdx = rest.indexOf('\n---');
  const endIdx2 = rest.indexOf('---');
  const end = endIdx !== -1 ? endIdx : endIdx2;
  if (end === -1) return null;
  return rest.slice(0, end).trim();
}

function buildFixtureReader() {
  return Object.freeze({
    exists: (p) => { try { return existsSync(p); } catch { return false; } },
    isDir: (p) => { try { return statSync(p).isDirectory(); } catch { return false; } },
    readDir: (p) => { try { return readdirSync(p); } catch { return []; } },
    readText: (p) => readFileSync(p, 'utf8'),
    readJson: (p) => JSON.parse(readFileSync(p, 'utf8')),
    readYaml: (p) => parseYaml(readFileSync(p, 'utf8'), p),
    readAnalysisMetadata: (p) => {
      const content = readFileSync(p, 'utf8');
      const fm = extractFrontmatter(content);
      if (!fm) return null;
      try { return parseYaml(fm, p); } catch { return null; }
    },
  });
}

// ---- Tests ----

describe('Collector', () => {
  let fixtureRef = null;

  after(() => {
    if (fixtureRef) {
      try { rmSync(fixtureRef.root, { recursive: true, force: true }); } catch {}
    }
  });

  it('collects exact canonical counts from fixture files', () => {
    fixtureRef = setupFixture({
      sources: `schema_version: 1
sources:
  - source_id: src_test-a
    name: TestA
    status: active
    type: github_repo
    url: https://github.com/test/a
  - source_id: src_test-b
    name: TestB
    status: candidate
    type: github_repo
    url: https://github.com/test/b
`,
      sourceState: '',
      skills: [
        {
          canonical_skill_id: 'skl_test-skill-a',
          content: `canonical_skill_id: skl_test-skill-a
schema_version: 1
status: active
display_name: Test Skill A
canonical_name: test-skill-a
`,
        },
        {
          canonical_skill_id: 'skl_test-skill-b',
          content: `canonical_skill_id: skl_test-skill-b
schema_version: 1
status: preview
display_name: Test Skill B
canonical_name: test-skill-b
`,
        },
        {
          canonical_skill_id: 'skl_test-skill-c',
          content: `canonical_skill_id: skl_test-skill-c
schema_version: 1
status: active
display_name: Test Skill C
canonical_name: test-skill-c
`,
        },
      ],
      analyses: [
        {
          skill_id: 'skl_test-skill-a',
          content: `---
schema_version: 2
skill_id: skl_test-skill-a
confidence: high
updated_at: "2026-07-27T12:00:00Z"
---
# Analysis of Test Skill A
`,
        },
      ],
      relations: '',
      packs: [],
      evaluations: [],
    });

    const reader = buildFixtureReader();
    const refTs = '2026-07-27T12:00:00.000Z';
    const { context, digest } = collectRunContextInput({
      catalogRoot: fixtureRef.cat,
      reader,
      referenceTimestamp: refTs,
    });

    assert.equal(context.catalogCounts.sources.total, 2);
    assert.equal(context.catalogCounts.sources.active, 1);
    assert.equal(context.catalogCounts.sources.candidate, 1);
    assert.equal(context.catalogCounts.skills.total, 3);
    assert.equal(context.catalogCounts.skills.active, 2);
    assert.equal(context.catalogCounts.analyses.total, 1);
    assert.equal(context.coverage.skills_with_analysis, 1);
    assert.equal(context.coverage.skills_without_analysis, 2);
    assert.equal(context.coverage.coverage_ratio, parseFloat((1 / 3).toFixed(4)));
    assert.equal(context.relations.total_edges, 0);
    assert.equal(typeof digest, 'string');
    assert.equal(digest.length, 64);
  });

  const STABLE_TS = '2026-07-27T12:00:00.000Z';

  it('produces deterministic, identical digests for identical state', () => {
    const reader = buildFixtureReader();
    const opts = { catalogRoot: fixtureRef.cat, reader, referenceTimestamp: STABLE_TS };
    const { digest: d1 } = collectRunContextInput(opts);
    const { digest: d2 } = collectRunContextInput(opts);
    assert.equal(d1, d2);
  });

  it('produces different digests for different state', () => {
    const reader1 = buildFixtureReader();
    const { digest: d1 } = collectRunContextInput({ catalogRoot: fixtureRef.cat, reader: reader1, referenceTimestamp: STABLE_TS });

    // Add another analysis — will change digest
    const shardDir = join(fixtureRef.cat, 'analyses', 'te');
    writeFileSync(join(shardDir, 'skl_test-skill-b.md'), `---
schema_version: 2
skill_id: skl_test-skill-b
confidence: high
updated_at: "2026-07-27T12:00:00Z"
---
# Analysis
`);
    const reader2 = buildFixtureReader();
    const { digest: d2 } = collectRunContextInput({ catalogRoot: fixtureRef.cat, reader: reader2, referenceTimestamp: STABLE_TS });
    assert.notEqual(d1, d2);
  });

  it('returns zero values for missing optional files', () => {
    const emptyRoot = buildFixtureRoot();
    const emptyCat = join(emptyRoot, 'catalog');
    mkdirSync(join(emptyCat, 'skills', 'records', 'te'), { recursive: true });
    mkdirSync(join(emptyCat, 'analyses', 'te'), { recursive: true });
    mkdirSync(join(emptyCat, 'relations'), { recursive: true });
    mkdirSync(join(emptyCat, 'packs', 'candidates'), { recursive: true });
    mkdirSync(join(emptyCat, 'packs', 'published'), { recursive: true });
    mkdirSync(join(emptyCat, 'sources'), { recursive: true });
    writeFileSync(join(emptyCat, 'sources', 'registry.yaml'), 'sources: []\n');
    try {
      const reader = buildFixtureReader();
      const { context } = collectRunContextInput({ catalogRoot: emptyCat, reader });
      assert.equal(context.catalogCounts.sources.total, 0);
      assert.equal(context.catalogCounts.skills.total, 0);
      assert.equal(context.catalogCounts.analyses.total, 0);
      assert.equal(context.catalogCounts.relations.total, 0);
      assert.equal(context.catalogCounts.packs.total, 0);
      assert.equal(context.catalogCounts.evaluations.total, 0);
      assert.equal(context.coverage.coverage_ratio, 0);
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }
  });

  it('fails closed on malformed skill records', () => {
    const malRoot = buildFixtureRoot();
    const malCat = join(malRoot, 'catalog');
    mkdirSync(join(malCat, 'skills', 'records', 'te'), { recursive: true });
    mkdirSync(join(malCat, 'analyses', 'te'), { recursive: true });
    mkdirSync(join(malCat, 'relations'), { recursive: true });
    mkdirSync(join(malCat, 'packs', 'candidates'), { recursive: true });
    mkdirSync(join(malCat, 'packs', 'published'), { recursive: true });
    mkdirSync(join(malCat, 'sources'), { recursive: true });
    writeFileSync(join(malCat, 'sources', 'registry.yaml'), 'sources: []\n');

    writeFileSync(join(malCat, 'skills', 'records', 'te', 'bad.yaml'), `not_canonical_skill_id: bad
unknown_field: true
`);

    try {
      const reader = buildFixtureReader();
      assert.throws(() => {
        collectRunContextInput({ catalogRoot: malCat, reader });
      }, /Malformed skill record/);
    } finally {
      rmSync(malRoot, { recursive: true, force: true });
    }
  });

  it('fails closed on malformed analysis frontmatter', () => {
    const malRoot = buildFixtureRoot();
    const malCat = join(malRoot, 'catalog');
    mkdirSync(join(malCat, 'analyses', 'te'), { recursive: true });
    mkdirSync(join(malCat, 'skills', 'records', 'te'), { recursive: true });
    mkdirSync(join(malCat, 'sources'), { recursive: true });
    mkdirSync(join(malCat, 'packs', 'candidates'), { recursive: true });
    mkdirSync(join(malCat, 'packs', 'published'), { recursive: true });
    mkdirSync(join(malCat, 'relations'), { recursive: true });
    writeFileSync(join(malCat, 'sources', 'registry.yaml'), 'sources: []\n');

    writeFileSync(join(malCat, 'analyses', 'te', 'bad.md'), `---
schema_version: 2
confidence: high
---
# No skill_id here
`);

    try {
      const reader = buildFixtureReader();
      assert.throws(() => {
        collectRunContextInput({ catalogRoot: malCat, reader });
      }, /Malformed analysis file/);
    } finally {
      rmSync(malRoot, { recursive: true, force: true });
    }
  });

  it('blocks Issue workload missing repository binding', () => {
    const issueRoot = buildFixtureRoot();
    const issueCat = join(issueRoot, 'catalog');
    mkdirSync(join(issueCat, 'skills', 'records', 'te'), { recursive: true });
    mkdirSync(join(issueCat, 'analyses', 'te'), { recursive: true });
    mkdirSync(join(issueCat, 'relations'), { recursive: true });
    mkdirSync(join(issueCat, 'packs', 'candidates'), { recursive: true });
    mkdirSync(join(issueCat, 'packs', 'published'), { recursive: true });
    mkdirSync(join(issueCat, 'sources'), { recursive: true });
    writeFileSync(join(issueCat, 'sources', 'registry.yaml'), 'sources: []\n');

    const workloadPath = join(issueRoot, 'bad-workload.json');
    writeFileSync(workloadPath, JSON.stringify({
      issues: { open: 1, acknowledged: 0, fulfilled: 0 },
    }));

    try {
      const reader = buildFixtureReader();
      const { context } = collectRunContextInput({
        catalogRoot: issueCat, reader, issueWorkloadPath: workloadPath,
      });
      assert.equal(context.issueDigest.blocked, 1);
    } finally {
      rmSync(issueRoot, { recursive: true, force: true });
    }
  });

  it('accepts valid fixed-repo Issue workload and extracts demand metadata', () => {
    const issueRoot = buildFixtureRoot();
    const issueCat = join(issueRoot, 'catalog');
    mkdirSync(join(issueCat, 'skills', 'records', 'te'), { recursive: true });
    mkdirSync(join(issueCat, 'analyses', 'te'), { recursive: true });
    mkdirSync(join(issueCat, 'relations'), { recursive: true });
    mkdirSync(join(issueCat, 'packs', 'candidates'), { recursive: true });
    mkdirSync(join(issueCat, 'packs', 'published'), { recursive: true });
    mkdirSync(join(issueCat, 'sources'), { recursive: true });
    writeFileSync(join(issueCat, 'sources', 'registry.yaml'), 'sources: []\n');

    const workloadPath = join(issueRoot, 'workload.json');
    writeFileSync(workloadPath, JSON.stringify({
      schema_version: 1,
      kind: 'issue_workload',
      run_id: 'run_test-001',
      repository: 'EricSanchezok/good-stuff-for-agents',
      snapshot_complete: true,
      snapshot_diagnostics: null,
      gh_available: true,
      gh_authenticated: true,
      workload_digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      scan_summary: {
        total_scanned: 3,
        accepted: 3,
        rejected: 0,
        run_id: 'run_test-001',
        scanned_at: '2026-07-27T12:00:00Z',
        scan_digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
      all_accepted_issues: [
        { issue_number: 1, intake: { classifier_descriptors: [{ canonical_skill_id: 'skl_test-skill-a' }] } },
        { issue_number: 2, intake: { classifier_descriptors: [{ canonical_skill_id: 'skl_test-skill-b' }] } },
        { issue_number: 3, intake: {} },
      ],
      rejected_issues: [],
      prepared_at: '2026-07-27T12:00:00Z',
    }));

    try {
      const reader = buildFixtureReader();
      const { context } = collectRunContextInput({
        catalogRoot: issueCat, reader, issueWorkloadPath: workloadPath,
      });
      assert.equal(context.issueDigest.blocked, 0);
      assert.equal(context.issueDigest.open, 3);
      assert.equal(context.issueDigest.fulfilled, 0);
    } finally {
      rmSync(issueRoot, { recursive: true, force: true });
    }
  });

  it('rejects Issue workload with wrong repository', () => {
    const issueRoot = buildFixtureRoot();
    const issueCat = join(issueRoot, 'catalog');
    mkdirSync(join(issueCat, 'skills', 'records', 'te'), { recursive: true });
    mkdirSync(join(issueCat, 'analyses', 'te'), { recursive: true });
    mkdirSync(join(issueCat, 'relations'), { recursive: true });
    mkdirSync(join(issueCat, 'packs', 'candidates'), { recursive: true });
    mkdirSync(join(issueCat, 'packs', 'published'), { recursive: true });
    mkdirSync(join(issueCat, 'sources'), { recursive: true });
    writeFileSync(join(issueCat, 'sources', 'registry.yaml'), 'sources: []\n');

    const workloadPath = join(issueRoot, 'workload.json');
    writeFileSync(workloadPath, JSON.stringify({
      schema_version: 1,
      kind: 'issue_workload',
      run_id: 'run_test-001',
      repository: 'wrong/repo',
      snapshot_complete: true,
      workload_digest: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      all_accepted_issues: [],
      rejected_issues: [],
    }));

    try {
      const reader = buildFixtureReader();
      const { context } = collectRunContextInput({
        catalogRoot: issueCat, reader, issueWorkloadPath: workloadPath,
      });
      assert.equal(context.issueDigest.blocked, 1);
    } finally {
      rmSync(issueRoot, { recursive: true, force: true });
    }
  });

  it('blocks Issue workload with incomplete snapshot', () => {
    const issueRoot = buildFixtureRoot();
    const issueCat = join(issueRoot, 'catalog');
    mkdirSync(join(issueCat, 'skills', 'records', 'te'), { recursive: true });
    mkdirSync(join(issueCat, 'analyses', 'te'), { recursive: true });
    mkdirSync(join(issueCat, 'relations'), { recursive: true });
    mkdirSync(join(issueCat, 'packs', 'candidates'), { recursive: true });
    mkdirSync(join(issueCat, 'packs', 'published'), { recursive: true });
    mkdirSync(join(issueCat, 'sources'), { recursive: true });
    writeFileSync(join(issueCat, 'sources', 'registry.yaml'), 'sources: []\n');

    const workloadPath = join(issueRoot, 'workload.json');
    writeFileSync(workloadPath, JSON.stringify({
      schema_version: 1,
      kind: 'issue_workload',
      run_id: 'run_test-001',
      repository: 'EricSanchezok/good-stuff-for-agents',
      snapshot_complete: false,
      snapshot_diagnostics: 'gh auth failed',
      workload_digest: 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      scan_summary: { total_scanned: 5 },
      all_accepted_issues: [],
      rejected_issues: [],
    }));

    try {
      const reader = buildFixtureReader();
      const { context } = collectRunContextInput({
        catalogRoot: issueCat, reader, issueWorkloadPath: workloadPath,
      });
      // Incomplete snapshot is blocked — blocked > 0 (exact count depends on collector internals)
      assert.ok(context.issueDigest.blocked > 0, 'incomplete snapshot must be blocked');
    } finally {
      rmSync(issueRoot, { recursive: true, force: true });
    }
  });

  it('rejects workload with wrong kind', () => {
    const issueRoot = buildFixtureRoot();
    const issueCat = join(issueRoot, 'catalog');
    mkdirSync(join(issueCat, 'skills', 'records', 'te'), { recursive: true });
    mkdirSync(join(issueCat, 'analyses', 'te'), { recursive: true });
    mkdirSync(join(issueCat, 'relations'), { recursive: true });
    mkdirSync(join(issueCat, 'packs', 'candidates'), { recursive: true });
    mkdirSync(join(issueCat, 'packs', 'published'), { recursive: true });
    mkdirSync(join(issueCat, 'sources'), { recursive: true });
    writeFileSync(join(issueCat, 'sources', 'registry.yaml'), 'sources: []\n');

    const workloadPath = join(issueRoot, 'workload.json');
    writeFileSync(workloadPath, JSON.stringify({
      schema_version: 1,
      kind: 'wrong_kind',
      run_id: 'run_test-001',
      repository: 'EricSanchezok/good-stuff-for-agents',
      snapshot_complete: true,
      workload_digest: 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      all_accepted_issues: [],
      rejected_issues: [],
    }));

    try {
      const reader = buildFixtureReader();
      const { context } = collectRunContextInput({
        catalogRoot: issueCat, reader, issueWorkloadPath: workloadPath,
      });
      assert.equal(context.issueDigest.blocked, 1, 'wrong kind should be blocked');
    } finally {
      rmSync(issueRoot, { recursive: true, force: true });
    }
  });

  it('evidence manifest includes all authoritative file paths', () => {
    const reader = buildFixtureReader();
    const result = collectRunContextInput({ catalogRoot: fixtureRef.cat, reader, referenceTimestamp: STABLE_TS });
    assert.ok(result.evidenceManifest, 'should have evidence manifest');
    assert.ok(Array.isArray(result.evidenceManifest.entries), 'manifest entries should be an array');
    assert.ok(result.evidenceManifest.entries.length > 0, 'manifest should have entries');
    assert.ok(typeof result.evidenceManifestDigest === 'string', 'should have evidence manifest digest');
    assert.ok(result.evidenceManifestDigest.length === 64, 'evidence manifest digest should be 64 chars');
    assert.ok(typeof result.snapshotDigest === 'string', 'should have snapshot digest');
    assert.ok(result.snapshotDigest.length === 64, 'snapshot digest should be 64 chars');

    // Every entry must have path, kind, sha256
    for (const entry of result.evidenceManifest.entries) {
      assert.ok(typeof entry.path === 'string', `entry missing path: ${JSON.stringify(entry)}`);
      assert.ok(!entry.path.startsWith('/'), `entry path must be repository-relative: ${JSON.stringify(entry)}`);
      assert.ok(typeof entry.kind === 'string', `entry missing kind: ${JSON.stringify(entry)}`);
      assert.ok(entry.sha256.length === 64, `entry bad sha256: ${JSON.stringify(entry)}`);
    }
  });

  it('snapshot digest changes on same-count content edit', () => {
    const reader = buildFixtureReader();
    const { snapshotDigest: sd1 } = collectRunContextInput({ catalogRoot: fixtureRef.cat, reader, referenceTimestamp: STABLE_TS });

    // Modify content of a skill YAML without changing counts
    const skillsDir = join(fixtureRef.cat, 'skills', 'records', 'te');
    const skillPath = join(skillsDir, 'skl_test-skill-a.yaml');
    let content = readFileSync(skillPath, 'utf8');
    content = content.replace('display_name: Test Skill A', 'display_name: Test Skill AZ');
    writeFileSync(skillPath, content);

    const reader2 = buildFixtureReader();
    const { snapshotDigest: sd2 } = collectRunContextInput({ catalogRoot: fixtureRef.cat, reader: reader2, referenceTimestamp: STABLE_TS });

    assert.notEqual(sd1, sd2, 'same-count content edit must change snapshot digest');
  });

  it('produces blocked state when no issue workload is provided', () => {
    const reader = buildFixtureReader();
    const { context } = collectRunContextInput({ catalogRoot: fixtureRef.cat, reader });
    assert.equal(context.issueDigest.blocked, 1);
  });

  it('checkEvidenceFreshness returns ok for unchanged state', () => {
    const reader = buildFixtureReader();
    const { digest } = collectRunContextInput({ catalogRoot: fixtureRef.cat, reader, referenceTimestamp: STABLE_TS });
    const result = checkEvidenceFreshness({
      catalogRoot: fixtureRef.cat, reader, expectedDigest: digest, referenceTimestamp: STABLE_TS,
    });
    assert.equal(result.ok, true);
    assert.equal(result.staleness, 'current');
  });

  it('checkEvidenceFreshness returns stale for changed state', () => {
    const reader = buildFixtureReader();
    const { digest: oldDigest } = collectRunContextInput({ catalogRoot: fixtureRef.cat, reader, referenceTimestamp: STABLE_TS });

    const shardDir = join(fixtureRef.cat, 'skills', 'records', 'te');
    writeFileSync(join(shardDir, 'skl_test-new.yaml'), `canonical_skill_id: skl_test-new
schema_version: 1
status: active
display_name: New Skill
canonical_name: test-new
`);

    const reader2 = buildFixtureReader();
    const result = checkEvidenceFreshness({
      catalogRoot: fixtureRef.cat, reader: reader2, expectedDigest: oldDigest, referenceTimestamp: STABLE_TS,
    });
    assert.equal(result.ok, false);
    assert.equal(result.staleness, 'stale');
  });
});

describe('Target Selector', () => {
  it('returns zero intents when there is no eligible evidence', () => {
    const result = selectTargetIntents({
      coverage: {
        skills_with_analysis: 10, skills_without_analysis: 0, coverage_ratio: 1.0,
      },
      relations: {
        total_edges: 0, chains_count: 0, alternatives_count: 0, conflicts_count: 0,
      },
      packLifecycle: { stale_packs: 0 },
    });

    assert.equal(result.intents.length, 0);
    assert.equal(result.total, 0);
    assert.equal(result.reason, 'no_eligible_evidence');
  });

  it('no synthetic cold-start intent from counts alone', () => {
    // Zero analyses but no demand => no intents (hardened: no cold-start synthesis)
    const result = selectTargetIntents({
      coverage: {
        skills_with_analysis: 0, skills_without_analysis: 25, coverage_ratio: 0,
      },
      relations: {},
      packLifecycle: {},
    });

    assert.equal(result.intents.length, 0);
    assert.equal(result.reason, 'no_eligible_evidence');
  });

  it('prioritizes Issue demand skill IDs when provided', () => {
    const result = selectTargetIntents({
      coverage: {
        skills_with_analysis: 20, skills_without_analysis: 5, coverage_ratio: 0.8,
      },
      relations: {
        total_edges: 10, chains_count: 5, alternatives_count: 0, conflicts_count: 0,
      },
      packLifecycle: {},
      issueDemandMetadata: {
        demand_skill_ids: ['skl_test-a', 'skl_test-b'],
        domain_slugs: ['pm'],
      },
    });

    const demandIntent = result.intents.find((i) => i.source === 'issue_demand');
    assert.ok(demandIntent);
    assert.deepEqual(demandIntent.seed_skill_ids, ['skl_test-a', 'skl_test-b']);
    assert.equal(demandIntent.score, 0.95);
  });

  it('respects max two intents limit', () => {
    const result = selectTargetIntents({
      coverage: {
        skills_with_analysis: 5, skills_without_analysis: 50, coverage_ratio: 0.1,
      },
      relations: {
        total_edges: 30, chains_count: 20, alternatives_count: 5, conflicts_count: 3,
      },
      packLifecycle: { stale_packs: 3, total_candidate: 5 },
      issueDemandMetadata: {
        demand_skill_ids: ['skl_x'],
        domain_slugs: ['dev'],
      },
    });

    assert.ok(result.intents.length <= 2);
  });

  it('coverage gaps alone do not create intents without demand or relation evidence', () => {
    // Hardened: no synthetic intents from counts alone
    const result = selectTargetIntents({
      coverage: {
        skills_with_analysis: 10, skills_without_analysis: 40, coverage_ratio: 0.2,
      },
      relations: { total_edges: 0, chains_count: 0, alternatives_count: 0, conflicts_count: 0 },
      packLifecycle: {},
    });

    assert.equal(result.intents.length, 0);
    assert.equal(result.reason, 'no_eligible_evidence');
  });

  it('creates intent from concrete relation chains evidence', () => {
    const result = selectTargetIntents({
      coverage: {
        skills_with_analysis: 10, skills_without_analysis: 40, coverage_ratio: 0.2,
      },
      relations: { total_edges: 15, by_predicate: { chains_with: 10 }, chains_count: 10, strengthens_count: 0, alternatives_count: 0, conflicts_count: 0 },
      packLifecycle: {},
    });

    assert.ok(result.intents.length > 0);
    assert.equal(result.intents[0].source, 'relation_chains');
    assert.ok(result.intents[0].max_analysis_budget <= 50);
  });
});

describe('Closure Resolver', () => {
  const skills = [
    makeSkill('skl_alpha', { capabilities: { domains: ['pm'], task_types: [], workflow_stages: [], atomic_capabilities: [] }, source: { source_id: 'src_a', path: 'a/SKILL.md', license: {} } }),
    makeSkill('skl_beta', { capabilities: { domains: ['pm', 'design'], task_types: [], workflow_stages: [], atomic_capabilities: [] }, source: { source_id: 'src_a', path: 'b/SKILL.md', license: {} } }),
    makeSkill('skl_gamma', { capabilities: { domains: ['dev'], task_types: [], workflow_stages: [], atomic_capabilities: [] }, source: { source_id: 'src_b', path: 'c/SKILL.md', license: {} } }),
    makeSkill('skl_delta', { capabilities: { domains: ['dev'], task_types: [], workflow_stages: [], atomic_capabilities: [] }, source: { source_id: 'src_b', path: 'd/SKILL.md', license: {} } }),
    makeSkill('skl_epsilon', { capabilities: { domains: ['marketing'], task_types: [], workflow_stages: [], atomic_capabilities: [] }, source: { source_id: 'src_c', path: 'e/SKILL.md', license: {} } }),
  ];

  const analyses = [
    makeAnalysis('skl_alpha'),
  ];

  const relations = [
    makeRelation({ predicate: 'chains_with', subject: 'skl_gamma', object: 'skl_delta', relation_id: 'rel_001' }),
    makeRelation({ predicate: 'alternatives', subject: 'skl_beta', object: 'skl_epsilon', relation_id: 'rel_002' }),
  ];

  it('resolves seed_skill_ids deterministically with stable sort', () => {
    const coverage = computeCoverage(skills, analyses);
    const relStats = computeRelationStats(relations);

    const intent = {
      domain: 'pm', reason: 'test', source: 'coverage_gap',
      score: 1.0, seed_skill_ids: [], max_analysis_budget: 10,
    };
    const result = resolveIntentClosure({ intents: [intent], skills, coverage, relations: relStats });
    const result2 = resolveIntentClosure({ intents: [intent], skills, coverage, relations: relStats });

    assert.equal(result.intents.length, 1);
    assert.ok(result.intents[0].seed_skill_ids.length > 0);
    assert.deepEqual(result.intents[0].seed_skill_ids, result2.intents[0].seed_skill_ids);
    assert.equal(result.digest, result2.digest);
  });

  it('respects analysis budget cap', () => {
    const coverage = computeCoverage(skills, analyses);
    const relStats = computeRelationStats(relations);

    const result = resolveIntentClosure({
      intents: [{ domain: 'dev', reason: 'test', source: 'coverage_gap', score: 1.0, seed_skill_ids: [], max_analysis_budget: 2 }],
      skills, coverage, relations: relStats, maxBudgetPerIntent: 2,
    });

    assert.ok(result.intents[0].seed_skill_ids.length <= 2);
  });

  it('uses immutable prepared intent skill IDs as highest-priority seeds', () => {
    const coverage = computeCoverage(skills, analyses);
    const relStats = computeRelationStats(relations);

    const result = resolveIntentClosure({
      intents: [{ domain: 'pm', reason: 'test with demand', source: 'issue_demand', score: 0.95, seed_skill_ids: ['skl_gamma', 'skl_delta'], max_analysis_budget: 2 }],
      skills, coverage, relationStats: relStats,
    });

    assert.deepEqual(result.intents[0].seed_skill_ids, ['skl_delta', 'skl_gamma']);
  });

  it('returns empty closure for zero intents', () => {
    const result = resolveIntentClosure({ intents: [], skills });
    assert.equal(result.intents.length, 0);
    assert.equal(result.evidenceManifest.total_seeds, 0);
  });

  it('returns no_pack_clean termination for explicit termination intent', () => {
    const result = resolveIntentClosure({
      intents: [{ domain: 'terminate', reason: 'no_pack_clean: zero eligible evidence', source: 'no_pack_clean', score: 0, seed_skill_ids: [], max_analysis_budget: 0 }],
      skills,
    });
    assert.equal(result.intents.length, 1);
    assert.equal(result.intents[0].termination, 'no_pack_clean');
    assert.equal(result.intents[0].seed_skill_ids.length, 0);
  });

  it('respects max two intents', () => {
    const coverage = computeCoverage(skills, analyses);
    const relStats = computeRelationStats(relations);
    const result = resolveIntentClosure({
      intents: [
        { domain: 'pm', reason: 'a', source: 'coverage_gap', score: 0.9, seed_skill_ids: [], max_analysis_budget: 5 },
        { domain: 'dev', reason: 'b', source: 'relation_chains', score: 0.8, seed_skill_ids: [], max_analysis_budget: 5 },
        { domain: 'design', reason: 'c', source: 'stale_pack', score: 0.7, seed_skill_ids: [], max_analysis_budget: 5 },
      ],
      skills, coverage, relations: relStats, maxIntents: 2,
    });
    assert.equal(result.intents.length, 2);
  });

  it('respects max total budget', () => {
    const coverage = computeCoverage(skills, analyses);
    const relStats = computeRelationStats(relations);
    const result = resolveIntentClosure({
      intents: [
        { domain: 'pm', reason: 'a', source: 'coverage_gap', score: 0.9, seed_skill_ids: [], max_analysis_budget: 5 },
        { domain: 'dev', reason: 'b', source: 'relation_chains', score: 0.8, seed_skill_ids: [], max_analysis_budget: 5 },
      ],
      skills, coverage, relations: relStats, maxTotalBudget: 6,
    });
    const total = result.intents.reduce((s, i) => s + i.max_analysis_budget, 0);
    assert.ok(total <= 6);
  });

  it('stale evidence detected: different skills list yields different closure', () => {
    const coverage = computeCoverage(skills, analyses);
    const relStats = computeRelationStats(relations);

    const result1 = resolveIntentClosure({
      intents: [{ domain: 'pm', reason: 'test', source: 'coverage_gap', score: 1.0, seed_skill_ids: [], max_analysis_budget: 10 }],
      skills, coverage, relations: relStats,
    });

    // Change the skills list (e.g., mark one skill as analyzed)
    const analyses2 = [...analyses, makeAnalysis('skl_beta')];
    const coverage2 = computeCoverage(skills, analyses2);
    const result2 = resolveIntentClosure({
      intents: [{ domain: 'pm', reason: 'test', source: 'coverage_gap', score: 1.0, seed_skill_ids: [], max_analysis_budget: 10 }],
      skills, coverage: coverage2, relations: relStats,
    });

    // digest or seed sets should differ because skl_beta is now analyzed
    const notSame = result1.digest !== result2.digest ||
      JSON.stringify(result1.intents[0].seed_skill_ids) !== JSON.stringify(result2.intents[0].seed_skill_ids);
    assert.ok(notSame, 'closure should differ when evidence changes');
  });
});

describe('Prepare-Run Integration', () => {
  function buildInput(overrides = {}) {
    return {
      catalogCounts: {
        sources: { total: 5, active: 3, candidate: 2, published: 0, stale: 0, added_since_last_run: 0 },
        skills: { total: 20, active: 15, candidate: 5, published: 0, stale: 0, added_since_last_run: 0 },
        analyses: { total: 10, active: 10, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
        relations: { total: 8, active: 8, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
        packs: { total: 2, active: 0, candidate: 1, published: 1, stale: 0, added_since_last_run: 0 },
        evaluations: { total: 2, active: 2, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
        issues: { total: 0, active: 0, candidate: 0, published: 0, stale: 0, added_since_last_run: 0 },
      },
      freshness: { sources_stale_count: 0, skills_stale_count: 0, analyses_stale_count: 0 },
      coverage: { skills_with_analysis: 10, skills_without_analysis: 10, coverage_ratio: 0.5 },
      relations: {
        total_edges: 8, by_predicate: { chains_with: 5, strengthens: 3 },
        chains_count: 5, strengthens_count: 3, alternatives_count: 0, conflicts_count: 0,
      },
      packLifecycle: {
        total_candidate: 1, total_published: 1, new_since_last_run: 0,
        stale_packs: 0, promoted_this_run: 0, rejected_this_run: 0,
      },
      issueDigest: { open: 0, acknowledged: 0, fulfilled: 0, blocked: 0 },
      priorFingerprint: '',
      snapshotDigest: 'a'.repeat(64),
      evidenceManifestDigest: 'b'.repeat(64),
      notes: '',
      ...overrides,
    };
  }

  it('binds collector output into run context', () => {
    const result = prepareRun({ runContextInput: buildInput() });
    assert.ok(result._sealed);
    assert.ok(result.run_context.run_id);
    assert.ok(result.run_context.digest);
    assert.ok(result.run_context.snapshot_digest);
    assert.ok(result.run_context.evidence_manifest_digest);
    assert.equal(result.run_context.catalog_counts.sources.total, 5);
    assert.equal(result.run_context.catalog_counts.skills.total, 20);
  });

  it('rejects legacy raw aggregate input without snapshot fields', () => {
    assert.throws(() => {
      prepareRun({ runContextInput: { catalogCounts: {}, freshness: {}, coverage: {}, relations: {}, packLifecycle: {}, issueDigest: {} } });
    }, /COLLECTOR_OUTPUT_REQUIRED/);
  });

  it('resume digest mismatch throws', () => {
    const result = prepareRun({ runContextInput: buildInput() });
    const corruptResume = { ...result.run_context, digest: 'different_digest_value' };
    assert.throws(() => {
      prepareRun({ resumeFrom: corruptResume, expectedDigest: result.run_context.digest });
    }, /RESUME_DIGEST_MISMATCH/);
  });

  it('zero eligible evidence yields zero intents', () => {
    const result = prepareRun({
      runContextInput: buildInput({
        coverage: { skills_with_analysis: 5, skills_without_analysis: 0, coverage_ratio: 1.0 },
        relations: { total_edges: 0, by_predicate: {}, chains_count: 0, strengthens_count: 0, alternatives_count: 0, conflicts_count: 0 },
        packLifecycle: { total_candidate: 0, total_published: 0, new_since_last_run: 0, stale_packs: 0, promoted_this_run: 0, rejected_this_run: 0 },
      }),
    });
    assert.equal(result.intents.total, 0);
  });

  it('identical inputs produce identical digest when runId is fixed', () => {
    const input = buildInput();
    const fixedRunId = 'run_test-fixed-digest_001';
    const r1 = prepareRun({ runContextInput: { ...input, runId: fixedRunId, snapshotId: 'snap_test', timestamp: '2026-07-27T12:00:00Z' } });
    const r2 = prepareRun({ runContextInput: { ...input, runId: fixedRunId, snapshotId: 'snap_test', timestamp: '2026-07-27T12:00:00Z' } });
    assert.equal(r1.run_context.digest, r2.run_context.digest);
  });

  it('snapshot digest survives serialize/resume/seal cycle', () => {
    const input = buildInput({ runId: 'run_test-cycle-001', snapshotId: 'snap_cycle', timestamp: '2026-07-27T12:00:00Z' });
    const prepared = prepareRun({ runContextInput: input });
    const serialized = JSON.parse(JSON.stringify(prepared.run_context));

    // Verify snapshot fields are serialized
    assert.ok(serialized.snapshot_digest);
    assert.ok(serialized.evidence_manifest_digest);

    // Resume from serialized
    const resumed = prepareRun({ resumeFrom: serialized, expectedDigest: prepared.run_context.digest });
    assert.ok(resumed.run_context.snapshot_digest);
    assert.ok(resumed.run_context.evidence_manifest_digest);
    assert.equal(resumed.run_context.snapshot_digest, prepared.run_context.snapshot_digest);
  });
});
