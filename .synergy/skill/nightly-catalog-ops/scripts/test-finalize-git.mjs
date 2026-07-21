#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createFinalizationPlan, TRUSTED_CONTROLLER_WARNING, validateRepositoryPath } from './lib/git-finalization-plan.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(readFileSync(join(scriptsDir, 'fixtures', 'valid-bounded-no-publication.json'), 'utf8'))
const HEAD = '1111111111111111111111111111111111111111'
const summaryPath = 'reports/nightly-catalog-ops/summary.json'
const manifestPath = 'reports/nightly-catalog-ops/touched-paths.json'
const ordinaryPath = 'reports/nightly-catalog-ops/run.md'

const tests = [
  {
    name: 'valid inputs produce review readiness without authorization conclusions',
    run() {
      const plan = createFinalizationPlan(baseInput())
      assert.equal(plan.ready_for_trusted_controller_review, true, plan.errors.join('\n'))
      assert.equal(plan.read_only, true)
      assert.equal('ok_to_commit' in plan, false)
      assert.equal('authorization' in plan, false)
      assert.deepEqual(plan.warnings, [TRUSTED_CONTROLLER_WARNING])
    },
  },
  {
    name: 'planner contains no process spawning or git mutation implementation',
    run() {
      const source = readFileSync(join(scriptsDir, 'lib', 'git-finalization-plan.mjs'), 'utf8')
      assert.doesNotMatch(source, /child_process|spawnSync|execFile|execSync/u)
      assert.doesNotMatch(source, /git\s+(?:add|commit|push)|npm\s+(?:run|exec)/u)
    },
  },
  {
    name: 'changed path outside manifest is rejected',
    run() {
      const plan = createFinalizationPlan(mutateInput(baseInput(), (input) => {
        input.changedFiles.push('reports/unrelated.md')
      }))
      assertPlanError(plan, 'changed files outside touched paths manifest')
    },
  },
  {
    name: 'untracked summary outside manifest is rejected',
    run() {
      const plan = createFinalizationPlan(mutateInput(baseInput(), (input) => {
        input.summaryArtifact = { tracked: false, ignored: false }
        input.manifest.paths = input.manifest.paths.filter((path) => path !== summaryPath)
        input.summary.git.allowed_paths = [...input.manifest.paths]
        input.changedFiles = input.changedFiles.filter((path) => path !== summaryPath)
      }))
      assertPlanError(plan, 'summary must be tracked or included in the touched paths manifest')
    },
  },
  {
    name: 'ignored summary is rejected even when manifested',
    run() {
      const plan = createFinalizationPlan(mutateInput(baseInput(), (input) => {
        input.summaryArtifact = { tracked: false, ignored: true }
      }))
      assertPlanError(plan, 'summary must not be ignored')
    },
  },
  {
    name: 'manifest digest mismatch is rejected',
    run() {
      const plan = createFinalizationPlan(mutateInput(baseInput(), (input) => {
        input.manifestSha256 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      }))
      assertPlanError(plan, 'touched_paths_manifest_sha256 must match')
    },
  },
  {
    name: 'current HEAD mismatch rejects stale or replayed summary',
    run() {
      const plan = createFinalizationPlan(mutateInput(baseInput(), (input) => {
        input.head = '2222222222222222222222222222222222222222'
      }))
      assertPlanError(plan, 'possible replay or stale run description')
    },
  },
  {
    name: 'explicit expected HEAD mismatch is rejected',
    run() {
      const plan = createFinalizationPlan(mutateInput(baseInput(), (input) => {
        input.expectedHead = '2222222222222222222222222222222222222222'
      }))
      assertPlanError(plan, '--expected-head does not match current HEAD')
    },
  },
  {
    name: 'manifest base HEAD mismatch is rejected',
    run() {
      const plan = createFinalizationPlan(mutateInput(baseInput(), (input) => {
        input.manifest.base_head = '2222222222222222222222222222222222222222'
      }))
      assertPlanError(plan, 'manifest base_head does not match current HEAD')
    },
  },
  {
    name: 'same-file staged and unstaged state remains reviewable',
    run() {
      const plan = createFinalizationPlan(mutateInput(baseInput(), (input) => {
        input.stagedFiles = [ordinaryPath]
        input.unstagedFiles = [ordinaryPath]
      }))
      assert.equal(plan.ready_for_trusted_controller_review, true, plan.errors.join('\n'))
      assert.deepEqual(plan.repository.mixed_stage_files, [ordinaryPath])
      assert.ok(plan.review_notes.some((note) => note.includes('explicit trusted-controller blob/index review')))
    },
  },
  {
    name: 'nested upstream is metadata only and never produces a push target',
    run() {
      const plan = createFinalizationPlan(mutateInput(baseInput(), (input) => {
        input.upstream = 'company/team/main'
      }))
      assert.equal(plan.repository.upstream, 'company/team/main')
      assert.equal('push_target' in plan, false)
      assert.equal('remote' in plan, false)
    },
  },
]

const unsafePaths = [
  ['reports/bad\nname.md', 'control'],
  ['reports/bad\u0085name.md', 'control'],
  ['reports/bad\u200dname.md', 'format'],
  ['reports/bad\u2028name.md', 'control'],
  ['reports/cafe\u0301.md', 'NFC'],
]
for (const [path, expected] of unsafePaths) {
  tests.push({
    name: `unsafe path is rejected: ${JSON.stringify(path)}`,
    run() {
      assert.match(validateRepositoryPath(path), new RegExp(expected, 'iu'))
    },
  })
}

const secretPaths = [
  '.netrc',
  '.pypirc',
  '.npmrc',
  'config/credentials.json',
  'config/client-secret.yaml',
  'config/api-token.txt',
  'secrets/config.json',
  'tokens/cache.json',
  'certs/client.p12',
  'certs/client.pfx',
  'certs/client.pem',
  'certs/client.key',
  '.ssh/id_ed25519',
  '.ssh/id_rsa.pub',
  'config/auth.json',
  '.authrc',
  'config/authentication.toml',
]
for (const path of secretPaths) {
  tests.push({
    name: `secret-like path is rejected: ${path}`,
    run() {
      const plan = createFinalizationPlan(withPaths(baseInput(), [summaryPath, manifestPath, path]))
      assertPlanError(plan, 'secret-like path is forbidden')
    },
  })
}

let failures = 0
for (const test of tests) {
  try {
    test.run()
    process.stdout.write(`ok - ${test.name}\n`)
  } catch (error) {
    failures += 1
    process.stderr.write(`not ok - ${test.name}\n${error.stack}\n`)
  }
}

const forbiddenFlags = ['--commit', '--commit=true', '--push', '--push=true', '--authorized', '--implementation', '--force', '--force-with-lease', '--force-if-includes']
for (const flag of forbiddenFlags) {
  try {
    const proc = spawnSync(process.execPath, [join(scriptsDir, 'finalize-git.mjs'), flag, '--summary', 'missing.json', '--touched-paths', 'missing.json'], {
      env: { ...process.env, PATH: '/definitely-not-a-real-path' },
      encoding: 'utf8',
    })
    assert.equal(proc.status, 2, proc.stdout)
    assert.match(proc.stderr, /mutation or execution flag is forbidden by the read-only audit boundary/u)
    assert.doesNotMatch(proc.stderr, /does not exist|git .* failed/u)
    process.stdout.write(`ok - ${flag} fails closed before file reads or executable lookup\n`)
  } catch (error) {
    failures += 1
    process.stderr.write(`not ok - ${flag} fails closed before file reads or executable lookup\n${error.stack}\n`)
  }
}

try {
  testReadOnlyCliSuccess()
  process.stdout.write('ok - successful CLI audit performs zero mutation and no npm execution\n')
} catch (error) {
  failures += 1
  process.stderr.write(`not ok - successful CLI audit performs zero mutation and no npm execution\n${error.stack}\n`)
}

try {
  testIgnoredSummaryCliFailure()
  process.stdout.write('ok - CLI rejects an ignored summary artifact\n')
} catch (error) {
  failures += 1
  process.stderr.write(`not ok - CLI rejects an ignored summary artifact\n${error.stack}\n`)
}

if (failures > 0) {
  process.stderr.write(`${failures} git audit test(s) failed\n`)
  process.exit(1)
}

process.stdout.write(`${tests.length + forbiddenFlags.length + 2} git audit tests passed\n`)

function baseInput() {
  const summary = structuredClone(fixture)
  summary.starting_state.head = HEAD
  summary.touched_paths_manifest = manifestPath
  const paths = [ordinaryPath, summaryPath, manifestPath]
  summary.git.allowed_paths = [...paths]
  return {
    summary,
    summaryPath,
    summaryArtifact: { tracked: false, ignored: false },
    manifest: {
      schema_version: 1,
      run_id: summary.run_id,
      mode: 'ordinary',
      base_head: HEAD,
      authorization: {
        source: summary.authorization.source,
        operator: summary.authorization.operator,
      },
      paths: [...paths],
    },
    manifestPath,
    manifestSha256: summary.touched_paths_manifest_sha256,
    manifestArtifact: { tracked: false, ignored: false },
    changedFiles: [...paths],
    stagedFiles: [],
    unstagedFiles: [ordinaryPath],
    untrackedFiles: [summaryPath, manifestPath],
    expectedHead: null,
    head: HEAD,
    branch: 'main',
    upstream: 'origin/main',
  }
}

function withPaths(input, paths) {
  return mutateInput(input, (copy) => {
    copy.changedFiles = [...paths]
    copy.stagedFiles = []
    copy.unstagedFiles = [...paths]
    copy.untrackedFiles = []
    copy.manifest.paths = [...paths]
    copy.summary.git.allowed_paths = [...paths]
  })
}

function mutateInput(input, mutation) {
  const copy = structuredClone(input)
  mutation(copy)
  return copy
}

function assertPlanError(plan, expected) {
  assert.equal(plan.ready_for_trusted_controller_review, false)
  assert.ok(plan.errors.some((error) => error.includes(expected)), `Expected error containing "${expected}", got:\n${plan.errors.join('\n')}`)
}

function testReadOnlyCliSuccess() {
  const repository = createAuditRepository()
  try {
    const proc = runCopiedAudit(repository)
    assert.equal(proc.status, 0, proc.stderr || proc.stdout)
    const output = JSON.parse(proc.stdout)
    assert.equal(output.ready_for_trusted_controller_review, true, output.errors.join('\n'))
    assert.equal(output.read_only, true)
    assert.deepEqual(output.warnings, [TRUSTED_CONTROLLER_WARNING])
    const gitCalls = readFileSync(repository.gitLog, 'utf8').trim().split('\n').filter(Boolean)
    assert.ok(gitCalls.length >= 2)
    assert.ok(gitCalls.every((call) => / (?:status|rev-parse) /u.test(` ${call} `)), gitCalls.join('\n'))
    assert.ok(gitCalls.every((call) => call.includes('core.fsmonitor=false') && call.includes('core.hooksPath=/dev/null')), gitCalls.join('\n'))
    assert.equal(readFileSync(repository.npmLog, 'utf8'), '')
    const finalHead = git(repository.root, ['rev-parse', 'HEAD']).trim()
    assert.equal(finalHead, repository.head)
    assert.equal(git(repository.root, ['diff', '--cached', '--name-only']).trim(), '')
    assert.equal(createHash('sha256').update(readFileSync(join(repository.root, '.git', 'index'))).digest('hex'), repository.indexSha256)
  } finally {
    rmSync(repository.root, { recursive: true, force: true })
  }
}

function testIgnoredSummaryCliFailure() {
  const repository = createAuditRepository({ ignoreSummary: true })
  try {
    const proc = runCopiedAudit(repository)
    assert.equal(proc.status, 2, proc.stdout)
    const output = JSON.parse(proc.stderr)
    assert.ok(output.errors.some((error) => error.includes('summary must not be ignored')), output.errors.join('\n'))
  } finally {
    rmSync(repository.root, { recursive: true, force: true })
  }
}

function createAuditRepository({ ignoreSummary = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'nightly-git-audit-'))
  const copiedScripts = join(root, '.synergy', 'skill', 'nightly-catalog-ops', 'scripts')
  const copiedLib = join(copiedScripts, 'lib')
  const reports = join(root, 'reports', 'nightly-catalog-ops')
  const bin = join(root, 'bin')
  mkdirSync(copiedLib, { recursive: true })
  mkdirSync(reports, { recursive: true })
  mkdirSync(bin, { recursive: true })
  copyFileSync(join(scriptsDir, 'finalize-git.mjs'), join(copiedScripts, 'finalize-git.mjs'))
  copyFileSync(join(scriptsDir, 'lib', 'git-finalization-plan.mjs'), join(copiedLib, 'git-finalization-plan.mjs'))
  copyFileSync(join(scriptsDir, 'lib', 'run-summary-validator.mjs'), join(copiedLib, 'run-summary-validator.mjs'))

  git(root, ['init', '-b', 'main'])
  git(root, ['config', 'user.name', 'Audit Test'])
  git(root, ['config', 'user.email', 'audit@example.invalid'])
  writeFileSync(join(root, 'tracked.txt'), 'base\n')
  const ignoredHarnessPaths = ['.synergy/', 'bin/', '*.log']
  if (ignoreSummary) ignoredHarnessPaths.push(summaryPath)
  writeFileSync(join(root, '.gitignore'), `${ignoredHarnessPaths.join('\n')}\n`)
  git(root, ['add', 'tracked.txt', '.gitignore'])
  git(root, ['commit', '-m', 'base'])
  const head = git(root, ['rev-parse', 'HEAD']).trim()
  const indexSha256 = createHash('sha256').update(readFileSync(join(root, '.git', 'index'))).digest('hex')

  const paths = [ordinaryPath, summaryPath, manifestPath]
  const manifest = {
    schema_version: 1,
    run_id: fixture.run_id,
    mode: 'ordinary',
    base_head: head,
    authorization: {
      source: fixture.authorization.source,
      operator: fixture.authorization.operator,
    },
    paths,
  }
  const manifestBytes = `${JSON.stringify(manifest, null, 2)}\n`
  writeFileSync(join(root, manifestPath), manifestBytes)
  writeFileSync(join(root, ordinaryPath), '# Audit run\n')
  const summary = structuredClone(fixture)
  summary.starting_state.branch = 'main'
  summary.starting_state.head = head
  summary.touched_paths_manifest = manifestPath
  summary.touched_paths_manifest_sha256 = createHash('sha256').update(manifestBytes).digest('hex')
  summary.git.authorization = 'commit'
  summary.git.execution_model = 'none'
  summary.git.allowed_paths = paths
  summary.git.message = 'No Git mutation was performed; this document describes the run only.'
  writeFileSync(join(root, summaryPath), `${JSON.stringify(summary, null, 2)}\n`)

  const realGit = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim()
  const gitLog = join(root, 'git-calls.log')
  const npmLog = join(root, 'npm-calls.log')
  writeFileSync(gitLog, '')
  writeFileSync(npmLog, '')
  writeFileSync(join(bin, 'git'), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${gitLog}"\nexec "${realGit}" "$@"\n`)
  writeFileSync(join(bin, 'npm'), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${npmLog}"\nexit 97\n`)
  chmodSync(join(bin, 'git'), 0o755)
  chmodSync(join(bin, 'npm'), 0o755)

  return { root, bin, head, indexSha256, gitLog, npmLog }
}

function runCopiedAudit(repository) {
  return spawnSync(process.execPath, [
    join(repository.root, '.synergy', 'skill', 'nightly-catalog-ops', 'scripts', 'finalize-git.mjs'),
    '--summary', summaryPath,
    '--touched-paths', manifestPath,
    '--expected-head', repository.head,
  ], {
    env: { ...process.env, PATH: `${repository.bin}:${process.env.PATH}` },
    encoding: 'utf8',
  })
}

function git(cwd, args) {
  const proc = spawnSync('git', args, { cwd, encoding: 'utf8' })
  assert.equal(proc.status, 0, proc.stderr || proc.stdout)
  return proc.stdout
}
