#!/usr/bin/env node
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const resetScript = join(here, 'reset-catalog.py')
const sandbox = mkdtempSync(join(tmpdir(), 'catalog-reset-test-'))

try {
  seedRepository(sandbox)

  // --- dry-run is read-only ---
  const beforeDryRun = snapshotPaths(sandbox, [
    'README.md',
    'docs/old.md',
    'reports/old.txt',
    'catalog/sources/registry.yaml',
    'catalog/sources/state.jsonl',
    'catalog/sources/candidates.jsonl',
    'catalog/sources/snapshots/tracked.json',
    'catalog/sources/blobs/ignored.bin',
    'catalog/skills/candidates/run.jsonl',
    'catalog/skills/records/aa/skill.yaml',
    'catalog/analyses/aa/skill.md',
    'catalog/relations/edges-00000.jsonl',
    'catalog/packs/candidates/pack.yaml',
    'catalog/evaluations/evaluation.json',
    'catalog/domains/domain.json',
    'catalog/indexes/manifest.json',
    'catalog/runs/run_1/context.json',
    'catalog/coverage.json',
    'AGENTS.md',
    '.synergy/keep.txt',
    'assets/keep.txt',
    'catalog/sources/manual.txt',
  ])

  const dryRun = runReset(sandbox, '--dry-run', '--source-ref', 'HEAD')
  assert.match(dryRun, /reset-catalog mode: dry-run/)
  assert.match(dryRun, /stable sources: 1/)
  assert.match(dryRun, /catalog\/sources\/blobs\/ignored\.bin/)
  assert.match(dryRun, /dry-run only/)
  assert.deepEqual(
    snapshotPaths(sandbox, Object.keys(beforeDryRun)),
    beforeDryRun,
    'dry-run must not mutate files',
  )

  // --- apply fails closed without preflight ---
  assert.throws(
    () => runReset(sandbox, '--apply', '--source-ref', 'HEAD'),
    /preflight-sync-ok/,
    '--apply must fail without --preflight-sync-ok',
  )

  // --- apply fails with only one preflight flag ---
  assert.throws(
    () => runReset(sandbox, '--apply', '--source-ref', 'HEAD', '--preflight-sync-ok'),
    /preflight-rate-limit-ok/,
    '--apply must fail without --preflight-rate-limit-ok',
  )

  // --- verify no mutation after failed applies ---
  assert.deepEqual(
    snapshotPaths(sandbox, Object.keys(beforeDryRun)),
    beforeDryRun,
    'failed applies must not mutate files',
  )

  // --- apply with both preflight flags succeeds ---
  const apply = runReset(sandbox, '--apply', '--source-ref', 'HEAD',
    '--preflight-sync-ok', '--preflight-rate-limit-ok')
  assert.match(apply, /reset complete:/)
  assert.match(apply, /restored 1 source definitions/)

  // --- derived data is deleted ---
  for (const path of [
    'README.md',
    'docs/old.md',
    'reports/old.txt',
    'catalog/sources/state.jsonl',
    'catalog/sources/candidates.jsonl',
    'catalog/sources/snapshots/tracked.json',
    'catalog/sources/blobs/ignored.bin',
    'catalog/skills/candidates/run.jsonl',
    'catalog/skills/records/aa/skill.yaml',
    'catalog/analyses/aa/skill.md',
    'catalog/relations/edges-00000.jsonl',
    'catalog/packs/candidates/pack.yaml',
    'catalog/evaluations/evaluation.json',
    'catalog/domains/domain.json',
    'catalog/indexes/manifest.json',
    'catalog/runs/run_1/context.json',
    'catalog/coverage.json',
  ]) {
    assert.equal(existsSync(join(sandbox, path)), false, `${path} must be removed`)
  }

  // --- non-derived data is preserved ---
  for (const [path, content] of Object.entries({
    'AGENTS.md': 'dirty agent instructions\n',
    '.synergy/keep.txt': 'implementation\n',
    'assets/keep.txt': 'asset\n',
    'catalog/sources/manual.txt': 'not derived\n',
  })) {
    assert.equal(readFileSync(join(sandbox, path), 'utf8'), content, `${path} must be preserved`)
  }

  // --- source seed preservation: only stable fields survive ---
  const registry = readFileSync(join(sandbox, 'catalog/sources/registry.yaml'), 'utf8')
  assert.match(registry, /source_id: src_example/)
  assert.match(registry, /default_ref: main/)
  assert.match(registry, /include:/)
  assert.match(registry, /exclude:/)
  assert.match(registry, /spdx: MIT/)
  assert.doesNotMatch(registry, /rogue_source/)
  assert.doesNotMatch(registry, /^\s*state:/m)
  assert.doesNotMatch(registry, /^\s*updated_at:/m)
  assert.doesNotMatch(registry, /^\s*frequency:/m)
  assert.doesNotMatch(registry, /^\s*strategy:/m)

  // --- no git commit was created by reset ---
  const log = git(sandbox, 'log', '--oneline', '-n', '1')
  assert.match(log.toString(), /seed fixture/, 'reset must not create git commits')

  // --- no staged changes after reset (aside from working-tree dirt) ---
  const staged = git(sandbox, 'diff', '--cached', '--name-only')
  assert.equal(staged.toString().trim(), '', 'reset must not stage files')

  // --- idempotent apply: no derived files remain ---
  const secondApply = runReset(sandbox, '--apply', '--source-ref', 'HEAD',
    '--preflight-sync-ok', '--preflight-rate-limit-ok')
  assert.match(secondApply, /removed 0 derived files/)
  assert.match(secondApply, /reset complete: removed 0 derived files/)

  // --- idempotent dry-run: zero derived files listed ---
  const secondDryRun = runReset(sandbox, '--dry-run', '--source-ref', 'HEAD')
  assert.match(secondDryRun, /derived files: 0 \(would be deleted\)/)

  // --- unknown flags fail ---
  assert.throws(
    () => execFileSync('python3', ['scripts/reset-catalog.py', '--unknown'], {
      cwd: sandbox,
      encoding: 'utf8',
      stdio: 'pipe',
    }),
    /Command failed/,
  )

  console.log('reset-catalog tests passed')
} finally {
  rmSync(sandbox, { recursive: true, force: true })
}

function seedRepository(root) {
  mkdirSync(join(root, 'scripts'), { recursive: true })
  copyFileSync(resetScript, join(root, 'scripts/reset-catalog.py'))
  write(root, '.gitignore', 'catalog/sources/blobs/\n')
  write(root, 'catalog/sources/registry.yaml', `schema_version: 1
sources:
- schema_version: 1
  source_id: src_example
  name: Example Skills
  url: https://github.com/example/skills
  type: github_repo
  status: active
  license:
    spdx: MIT
    verified: true
    evidence: LICENSE
  sync:
    strategy: git
    default_ref: main
    frequency: daily
    include:
    - '**/SKILL.md'
    exclude:
    - node_modules/**
  state:
    last_checked_at: '2026-07-27T00:00:00.000Z'
    last_success_at: '2026-07-27T00:00:00.000Z'
    last_ref: abcdef
    consecutive_failures: 0
  updated_at: '2026-07-27T00:00:00.000Z'
`)
  write(root, 'README.md', 'generated readme\n')
  write(root, 'docs/old.md', 'generated docs\n')
  write(root, 'reports/old.txt', 'internal report\n')
  write(root, 'catalog/sources/state.jsonl', '{}\n')
  write(root, 'catalog/sources/candidates.jsonl', '{}\n')
  write(root, 'catalog/sources/snapshots/tracked.json', '{}\n')
  write(root, 'catalog/skills/candidates/run.jsonl', '{}\n')
  write(root, 'catalog/skills/records/aa/skill.yaml', 'schema_version: 1\n')
  write(root, 'catalog/analyses/aa/skill.md', '# analysis\n')
  write(root, 'catalog/relations/edges-00000.jsonl', '{}\n')
  write(root, 'catalog/packs/candidates/pack.yaml', 'schema_version: 2\n')
  write(root, 'catalog/evaluations/evaluation.json', '{}\n')
  write(root, 'catalog/domains/domain.json', '{}\n')
  write(root, 'catalog/indexes/manifest.json', '{}\n')
  write(root, 'catalog/runs/run_1/context.json', '{}\n')
  write(root, 'catalog/coverage.json', '{}\n')
  write(root, 'AGENTS.md', 'clean agent instructions\n')
  write(root, '.synergy/keep.txt', 'implementation\n')
  write(root, 'assets/keep.txt', 'asset\n')
  write(root, 'catalog/sources/manual.txt', 'not derived\n')

  git(root, 'init')
  git(root, 'add', '.')
  execFileSync('git', [
    '-c', 'user.name=Reset Test',
    '-c', 'user.email=reset-test@example.invalid',
    'commit', '-m', 'seed fixture',
  ], { cwd: root, stdio: 'pipe' })

  // Dirty the working tree to simulate ongoing runtime state.
  write(root, 'catalog/sources/blobs/ignored.bin', 'ignored runtime blob\n')
  write(root, 'AGENTS.md', 'dirty agent instructions\n')
  write(root, 'catalog/sources/registry.yaml', `${readFileSync(join(root, 'catalog/sources/registry.yaml'), 'utf8')}
- schema_version: 1
  source_id: rogue_source
  name: Dirty Runtime Source
  url: https://example.invalid/rogue
  type: github_repo
  status: active
  sync:
    default_ref: main
    include: ['**/SKILL.md']
    exclude: []
`)
}

function runReset(root, ...args) {
  return execFileSync('python3', ['scripts/reset-catalog.py', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, stdio: 'pipe' })
}

function write(root, path, content) {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

function snapshotPaths(root, paths) {
  return Object.fromEntries(paths.map((path) => {
    const target = join(root, path)
    return [path, existsSync(target) ? readFileSync(target, 'utf8') : null]
  }))
}
