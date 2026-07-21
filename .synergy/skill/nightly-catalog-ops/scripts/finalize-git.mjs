#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const MUTATION_FLAGS = new Set(['--commit', '--push', '--authorized', '--implementation', '--dry-run', '--message'])
const SUPPORTED_OPTIONS = new Set(['--summary', '--touched-paths', '--expected-head'])

try {
  const options = parseArguments(process.argv.slice(2))
  const summaryDocument = readRepositoryJson(options.summary, 'summary')
  const manifestDocument = readRepositoryJson(options.touchedPaths, 'touched paths manifest')
  const repositoryState = readRepositoryState()
  const { createFinalizationPlan } = await import('./lib/git-finalization-plan.mjs')

  const plan = createFinalizationPlan({
    summary: summaryDocument.value,
    summaryPath: options.summary,
    summaryArtifact: artifactState(options.summary, repositoryState),
    manifest: manifestDocument.value,
    manifestPath: options.touchedPaths,
    manifestSha256: manifestDocument.sha256,
    manifestArtifact: artifactState(options.touchedPaths, repositoryState),
    expectedHead: options.expectedHead,
    head: repositoryState.head,
    branch: repositoryState.branch,
    upstream: repositoryState.upstream,
    changedFiles: repositoryState.changedFiles,
    stagedFiles: repositoryState.stagedFiles,
    unstagedFiles: repositoryState.unstagedFiles,
    untrackedFiles: repositoryState.untrackedFiles,
  })

  const output = {
    ...plan,
    summary: {
      path: options.summary,
      sha256: summaryDocument.sha256,
    },
  }
  const stream = plan.ready_for_trusted_controller_review ? process.stdout : process.stderr
  stream.write(`${JSON.stringify(output, null, 2)}\n`)
  process.exit(plan.ready_for_trusted_controller_review ? 0 : 2)
} catch (error) {
  process.stderr.write(`nightly-git-audit-error: ${error.message}\n`)
  process.exit(2)
}

function parseArguments(args) {
  for (const argument of args) {
    const mutationFlag = [...MUTATION_FLAGS].some((flag) => argument === flag || argument.startsWith(`${flag}=`))
    if (mutationFlag || argument.startsWith('--force')) {
      throw new Error(`mutation or execution flag is forbidden by the read-only audit boundary: ${argument}`)
    }
  }

  const values = new Map()
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!SUPPORTED_OPTIONS.has(argument)) throw new Error(`unknown argument: ${argument}`)
    if (values.has(argument)) throw new Error(`duplicate argument: ${argument}`)
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`)
    values.set(argument, value)
    index += 1
  }

  const summary = values.get('--summary')
  const touchedPaths = values.get('--touched-paths')
  if (!summary) throw new Error('--summary <repository-relative summary.json> is required')
  if (!touchedPaths) throw new Error('--touched-paths <repository-relative manifest.json> is required')
  return {
    summary,
    touchedPaths,
    expectedHead: values.get('--expected-head') ?? null,
  }
}

function readRepositoryJson(path, label) {
  assertSafeInputPath(path, label)
  const fullPath = resolve(ROOT, path)
  if (!existsSync(fullPath) || !statSync(fullPath).isFile()) throw new Error(`${label} does not exist: ${path}`)
  const realRoot = realpathSync(ROOT)
  const realPath = realpathSync(fullPath)
  const relativeRealPath = relative(realRoot, realPath)
  if (relativeRealPath === '..' || relativeRealPath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || resolve(realRoot, relativeRealPath) !== realPath) {
    throw new Error(`${label} resolves outside the repository: ${path}`)
  }
  const content = readFileSync(realPath)
  try {
    return {
      value: JSON.parse(content.toString('utf8')),
      sha256: createHash('sha256').update(content).digest('hex'),
    }
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`)
  }
}

function assertSafeInputPath(path, label) {
  if (typeof path !== 'string' || path.length === 0) throw new Error(`${label} must be a non-empty string`)
  if (path !== path.normalize('NFC')) throw new Error(`${label} must use Unicode NFC normalization`)
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(path) || /\p{Cf}/u.test(path)) {
    throw new Error(`${label} contains forbidden control or format characters`)
  }
  if (path.includes('\\') || path.startsWith('/') || /^[A-Za-z]:\//u.test(path) || path.split('/').includes('..')) {
    throw new Error(`${label} must be a contained repository-relative path: ${path}`)
  }
}

function readRepositoryState() {
  const status = gitRead(['status', '--porcelain=v2', '--branch', '-z', '--no-renames', '--ignored=matching', '--untracked-files=all'])
  const parsed = parseStatus(status)
  const head = gitRead(['rev-parse', '--verify', 'HEAD']).trim()
  return { ...parsed, head }
}

function parseStatus(output) {
  const changedFiles = []
  const stagedFiles = []
  const unstagedFiles = []
  const untrackedFiles = []
  const ignoredFiles = []
  let branch = null
  let upstream = null

  for (const record of output.split('\0').filter(Boolean)) {
    if (record.startsWith('# branch.head ')) {
      const value = record.slice('# branch.head '.length)
      branch = value === '(detached)' ? null : value
      continue
    }
    if (record.startsWith('# branch.upstream ')) {
      upstream = record.slice('# branch.upstream '.length) || null
      continue
    }
    if (record.startsWith('? ')) {
      const path = record.slice(2)
      changedFiles.push(path)
      untrackedFiles.push(path)
      continue
    }
    if (record.startsWith('! ')) {
      ignoredFiles.push(record.slice(2))
      continue
    }
    if (record.startsWith('1 ') || record.startsWith('u ')) {
      const match = record.startsWith('1 ')
        ? record.match(/^1 ([^ ]+) (?:[^ ]+ ){6}(.*)$/u)
        : record.match(/^u ([^ ]+) (?:[^ ]+ ){8}(.*)$/u)
      if (!match) throw new Error(`could not parse git status record: ${record}`)
      const [, xy, path] = match
      changedFiles.push(path)
      if (xy[0] !== '.') stagedFiles.push(path)
      if (xy[1] !== '.') unstagedFiles.push(path)
    }
  }

  return {
    branch,
    upstream,
    changedFiles: uniqueSorted(changedFiles),
    stagedFiles: uniqueSorted(stagedFiles),
    unstagedFiles: uniqueSorted(unstagedFiles),
    untrackedFiles: uniqueSorted(untrackedFiles),
    ignoredFiles: uniqueSorted(ignoredFiles),
  }
}

function artifactState(path, repositoryState) {
  const ignored = repositoryState.ignoredFiles.some((ignoredPath) => ignoredPath === path || (ignoredPath.endsWith('/') && path.startsWith(ignoredPath)))
  return {
    tracked: !repositoryState.untrackedFiles.includes(path) && !ignored,
    ignored,
  }
}

function gitRead(args) {
  const safeArgs = [
    '-c', 'core.fsmonitor=false',
    '-c', 'core.hooksPath=/dev/null',
    '-c', 'gc.auto=0',
    '-c', 'maintenance.auto=false',
    ...args,
  ]
  const proc = spawnSync('git', safeArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  })
  if (proc.status !== 0) throw new Error(`git ${args[0]} failed: ${(proc.stderr || proc.stdout).trim()}`)
  return proc.stdout
}

function uniqueSorted(paths) {
  return [...new Set(paths)].sort()
}
