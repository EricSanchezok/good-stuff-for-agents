#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createFinalizationPlan, isSecretLikePath, TRUSTED_CONTROLLER_WARNING, validateRepositoryPath } from './lib/git-finalization-plan.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const HEAD = '1'.repeat(40)
const summaryPath = 'reports/nightly-catalog-ops/run-summary.json'
const manifestPath = 'reports/nightly-catalog-ops/touched-paths.json'
const reportPath = 'reports/nightly-catalog-ops/run-report.md'
const ordinaryPaths = [manifestPath, reportPath, summaryPath].sort()

const tests = [
  ['valid v3 inputs produce read-only review readiness', () => {
    const plan = createFinalizationPlan(baseInput())
    assert.equal(plan.ready_for_trusted_controller_review, true, plan.errors.join('\n'))
    assert.equal(plan.read_only, true)
    assert.equal(plan.audit_kind, 'git_finalization_audit_plan_v3')
    assert.equal('authorization' in plan, false)
    assert.deepEqual(plan.warnings, [TRUSTED_CONTROLLER_WARNING])
  }],
  ['planner contains no process spawning or Git mutation', () => {
    const source = readFileSync(join(scriptsDir, 'lib', 'git-finalization-plan.mjs'), 'utf8')
    assert.doesNotMatch(source, /child_process|spawnSync|execFile|execSync/u)
    assert.doesNotMatch(source, /git\s+(?:add|commit|push)|npm\s+(?:run|exec)/u)
  }],
  ['legacy summary is rejected', () => assertPlanError(mutateInput(baseInput(), (input) => {
    input.summary.schema_version = 2
  }), 'schema_version must be 3')],
  ['summary digest mismatch is rejected', () => assertPlanError(mutateInput(baseInput(), (input) => {
    input.summarySha256 = '2'.repeat(64)
  }), 'summary_digest must match the selected summary contents')],
  ['ledger digest mismatch is rejected', () => assertPlanError(mutateInput(baseInput(), (input) => {
    input.manifest.ledger_digest = '3'.repeat(64)
  }), 'ledger_digest must match summary.ledger_digest')],
  ['manifest base HEAD mismatch is rejected', () => assertPlanError(mutateInput(baseInput(), (input) => {
    input.manifest.base_head = '4'.repeat(40)
  }), 'possible replay or stale manifest')],
  ['explicit expected HEAD mismatch is rejected', () => assertPlanError(mutateInput(baseInput(), (input) => {
    input.expectedHead = '5'.repeat(40)
  }), '--expected-head does not match current HEAD')],
  ['changed path outside manifest is rejected', () => assertPlanError(mutateInput(baseInput(), (input) => {
    input.changedFiles.push('reports/unrelated.md')
  }), 'changed files outside touched paths manifest')],
  ['manifest entry without a change is rejected', () => assertPlanError(mutateInput(baseInput(), (input) => {
    input.changedFiles = input.changedFiles.filter((path) => path !== reportPath)
  }), 'manifest contains files without changes')],
  ['ignored summary is rejected', () => assertPlanError(mutateInput(baseInput(), (input) => {
    input.summaryArtifact = { tracked: false, ignored: true }
  }), 'summary must not be ignored')],
  ['same-file staged and unstaged state remains reviewable but explicit', () => {
    const plan = createFinalizationPlan(mutateInput(baseInput(), (input) => {
      input.stagedFiles = [reportPath]
      input.unstagedFiles = [reportPath]
    }))
    assert.equal(plan.ready_for_trusted_controller_review, true, plan.errors.join('\n'))
    assert.deepEqual(plan.repository.mixed_stage_files, [reportPath])
    assert.ok(plan.review_notes.some((note) => note.includes('explicit blob/index review')))
  }],
]

for (const [path, expected] of [
  ['reports/bad\nname.md', 'control'],
  ['reports/bad\u200dname.md', 'format'],
  ['reports/cafe\u0301.md', 'NFC'],
  ['../outside.md', 'canonical contained'],
  ['/tmp/outside.md', 'repository-relative'],
]) {
  tests.push([`unsafe path rejected: ${JSON.stringify(path)}`, () => assert.match(validateRepositoryPath(path), new RegExp(expected, 'iu'))])
}

for (const path of ['.env', 'config/credentials.json', 'secrets/token.txt', '.ssh/id_ed25519', 'certs/client.pem']) {
  tests.push([`secret-like path rejected: ${path}`, () => assertPlanError(withPaths(baseInput(), [...ordinaryPaths, path]), 'secret-like path is forbidden')])
}

for (const path of [
  'catalog/skills/records/ex/skl_export-tokens-figma.yaml',
  'catalog/skills/records/az/skl_azure-keyvault-secrets-rust.yaml',
  'catalog/skills/records/oa/skl_oauth.yaml',
]) {
  tests.push([`catalog skill name is not a credential path: ${path}`, () => assert.equal(isSecretLikePath(path), false)])
}

let failures = 0
for (const [name, run] of tests) {
  try {
    run()
    process.stdout.write(`ok - ${name}\n`)
  } catch (error) {
    failures += 1
    process.stderr.write(`not ok - ${name}\n${error.stack}\n`)
  }
}

const forbiddenFlags = ['--commit', '--commit=true', '--push', '--push=true', '--authorized', '--implementation', '--force', '--force-with-lease']
for (const flag of forbiddenFlags) {
  try {
    const proc = spawnSync(process.execPath, [join(scriptsDir, 'finalize-git.mjs'), flag, '--summary', 'missing.json', '--touched-paths', 'missing.json'], {
      env: { ...process.env, PATH: '/definitely-not-a-real-path' },
      encoding: 'utf8',
    })
    assert.equal(proc.status, 2, proc.stdout)
    assert.match(proc.stderr, /mutation or execution flag is forbidden by the read-only audit boundary/u)
    process.stdout.write(`ok - ${flag} fails before file or Git reads\n`)
  } catch (error) {
    failures += 1
    process.stderr.write(`not ok - ${flag} fails before file or Git reads\n${error.stack}\n`)
  }
}

try {
  testReadOnlyCli()
  process.stdout.write('ok - representative CLI audit performs no Git or npm mutation\n')
} catch (error) {
  failures += 1
  process.stderr.write(`not ok - representative CLI audit performs no Git or npm mutation\n${error.stack}\n`)
}

if (failures > 0) {
  process.stderr.write(`${failures} git audit test(s) failed\n`)
  process.exit(1)
}
process.stdout.write(`${tests.length + forbiddenFlags.length + 1} git audit tests passed\n`)

function baseInput() {
  const summary = validSummary()
  const summaryBytes = `${JSON.stringify(summary, null, 2)}\n`
  const summarySha256 = digest(summaryBytes)
  return {
    summary,
    summaryPath,
    summarySha256,
    summaryArtifact: { tracked: false, ignored: false },
    manifest: {
      schema_version: 1,
      run_id: summary.run_id,
      mode: 'ordinary',
      base_head: HEAD,
      summary_digest: summarySha256,
      ledger_digest: summary.ledger_digest,
      paths: [...ordinaryPaths],
    },
    manifestPath,
    manifestSha256: 'f'.repeat(64),
    manifestArtifact: { tracked: false, ignored: false },
    changedFiles: [...ordinaryPaths],
    stagedFiles: [],
    unstagedFiles: [reportPath],
    untrackedFiles: [summaryPath, manifestPath],
    expectedHead: HEAD,
    head: HEAD,
    branch: 'main',
    upstream: 'origin/main',
  }
}

function validSummary() {
  return {
    schema_version: 3,
    run_id: 'run_git-audit-001',
    ledger_id: 'ldg_git-audit-001',
    context_digest: 'a'.repeat(64),
    ledger_digest: 'b'.repeat(64),
    timestamp: '2026-07-28T00:00:00Z',
    run_outcome: { status: 'no_pack_clean', summary: 'No eligible Pack target.', total_actions: 1, errors: 0, warnings: 0 },
    gate: { gate_id: 'gate_git-audit-001', decision: 'pass', passed: true, errors: [], warnings: [] },
    intents: [],
    outcome_counts: { sources: 0, skills: 0, relations: 0, packs: 1, issues: 0 },
  }
}

function mutateInput(input, mutation) {
  const copy = structuredClone(input)
  mutation(copy)
  return copy
}

function withPaths(input, paths) {
  return mutateInput(input, (copy) => {
    copy.changedFiles = [...paths]
    copy.stagedFiles = []
    copy.unstagedFiles = [...paths]
    copy.untrackedFiles = []
    copy.manifest.paths = [...paths]
  })
}

function assertPlanError(input, expected) {
  const plan = createFinalizationPlan(input)
  assert.equal(plan.ready_for_trusted_controller_review, false)
  assert.ok(plan.errors.some((error) => error.includes(expected)), `Expected error containing "${expected}", got:\n${plan.errors.join('\n')}`)
}

function testReadOnlyCli() {
  const repository = createAuditRepository()
  try {
    const proc = spawnSync(process.execPath, [
      join(repository.root, '.synergy', 'skill', 'nightly-catalog-ops', 'scripts', 'finalize-git.mjs'),
      '--summary', summaryPath,
      '--touched-paths', manifestPath,
      '--expected-head', repository.head,
    ], {
      env: { ...process.env, PATH: `${repository.bin}:${process.env.PATH}` },
      encoding: 'utf8',
    })
    assert.equal(proc.status, 0, proc.stderr || proc.stdout)
    assert.ok(proc.stdout.length > 65_536, `Expected a large audit payload, got ${proc.stdout.length} bytes`)
    const output = JSON.parse(proc.stdout)
    assert.equal(output.ready_for_trusted_controller_review, true, output.errors.join('\n'))
    assert.equal(output.read_only, true)
    const gitCalls = readFileSync(repository.gitLog, 'utf8').trim().split('\n').filter(Boolean)
    assert.ok(gitCalls.every((call) => / (?:status|rev-parse) /u.test(` ${call} `)), gitCalls.join('\n'))
    assert.equal(readFileSync(repository.npmLog, 'utf8'), '')
    assert.equal(git(repository.root, ['rev-parse', 'HEAD']).trim(), repository.head)
    assert.equal(git(repository.root, ['diff', '--cached', '--name-only']).trim(), '')
  } finally {
    rmSync(repository.root, { recursive: true, force: true })
  }
}

function createAuditRepository() {
  const root = mkdtempSync(join(tmpdir(), 'nightly-v3-git-audit-'))
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
  writeFileSync(join(root, '.gitignore'), '.synergy/\nbin/\n*.log\n')
  git(root, ['add', 'tracked.txt', '.gitignore'])
  git(root, ['commit', '-m', 'base'])
  const head = git(root, ['rev-parse', 'HEAD']).trim()

  const summary = validSummary()
  const summaryBytes = `${JSON.stringify(summary, null, 2)}\n`
  const largeAuditPaths = Array.from({ length: 700 }, (_, index) =>
    `reports/nightly-catalog-ops/audit-artifact-${String(index).padStart(4, '0')}-${'x'.repeat(64)}.json`)
  const manifest = {
    schema_version: 1,
    run_id: summary.run_id,
    mode: 'ordinary',
    base_head: head,
    summary_digest: digest(summaryBytes),
    ledger_digest: summary.ledger_digest,
    paths: [...ordinaryPaths, ...largeAuditPaths].sort(),
  }
  writeFileSync(join(root, summaryPath), summaryBytes)
  writeFileSync(join(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(join(root, reportPath), '# Audit run\n')
  for (const path of largeAuditPaths) writeFileSync(join(root, path), '{}\n')

  const realGit = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim()
  const gitLog = join(root, 'git-calls.log')
  const npmLog = join(root, 'npm-calls.log')
  writeFileSync(gitLog, '')
  writeFileSync(npmLog, '')
  writeFileSync(join(bin, 'git'), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${gitLog}"\nexec "${realGit}" "$@"\n`)
  writeFileSync(join(bin, 'npm'), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${npmLog}"\nexit 97\n`)
  chmodSync(join(bin, 'git'), 0o755)
  chmodSync(join(bin, 'npm'), 0o755)
  return { root, bin, head, gitLog, npmLog }
}

function git(cwd, args) {
  const proc = spawnSync('git', args, { cwd, encoding: 'utf8' })
  assert.equal(proc.status, 0, proc.stderr || proc.stdout)
  return proc.stdout
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}
