#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT, readText } from '../../catalog-data/scripts/lib/catalog-lib.mjs'

const dryRun = !process.argv.includes('--commit')
const push = process.argv.includes('--push')
const authorized = process.argv.includes('--authorized')
const messageIdx = process.argv.indexOf('--message')
const message = messageIdx >= 0 ? process.argv[messageIdx + 1] : 'nightly: automated catalog update'

if (!dryRun && !authorized) {
  console.error('Refusing to commit without --authorized. Use --dry-run to inspect plan.')
  process.exit(2)
}

const ALLOWED_GLOBS = [
  'catalog/',
  'docs/',
  'README.md',
  'reports/',
  'assets/',
]

const FORBIDDEN_PATTERNS = [
  /\.env$/,
  /\.tmp-/,
  /credentials/i,
  /secret/i,
  /\.pem$/,
  /\.key$/,
  /auth\.json$/,
  /.npmrc$/,
]

function git(args) {
  const proc = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  if (proc.status !== 0) throw new Error(`git ${args[0]} failed: ${proc.stderr || proc.stdout}`)
  return proc.stdout.trim()
}

try {
  const status = git(['status', '--porcelain=v1', '--branch'])
  const lines = status.split('\n')
  const branchLine = lines[0]
  const changedFiles = lines.slice(1).map((line) => line.slice(3)).filter(Boolean)

  if (changedFiles.length === 0) {
    console.log(JSON.stringify({ committed: false, pushed: false, changed_files: 0, branch_status: branchLine, message: 'no changed files to commit' }, null, 2))
    process.exit(0)
  }

  const forbidden = changedFiles.filter((file) => {
    return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(file)) ||
           !ALLOWED_GLOBS.some((prefix) => file.startsWith(prefix))
  })

  if (forbidden.length > 0) {
    for (const file of forbidden) console.error(`forbidden-file: ${file}`)
    process.exit(2)
  }

  const reportFiles = changedFiles.filter((file) => file.startsWith('reports/') && file.endsWith('.md'))
  for (const reportFile of reportFiles) {
    const fullPath = join(ROOT, reportFile)
    if (existsSync(fullPath)) {
      const content = readText(fullPath)
      const pendingMarkers = [/Push:\s*\*\*Pending\*\*/i, /- \*\*Push\*\*:\s*Pending/i, /- \*\*Push\*\*:\s*Pending/gi, /Push: Pending/gi, /Commits: Pending/gi]
      for (const marker of pendingMarkers) {
        if (marker.test(content)) {
          throw new Error(`${reportFile}: contains pending git marker — fix before committing`)
        }
      }
    }
  }

  const fullMessage = `${message}\n\nCo-authored-by: synergy-agent <299070056+synergy-agent@users.noreply.github.com>`

  if (dryRun) {
    console.log(JSON.stringify({
      committed: false,
      pushed: false,
      dry_run: true,
      message: fullMessage,
      changed_files: changedFiles.length,
      files: changedFiles.sort(),
      branch_status: branchLine,
    }, null, 2))
    process.exit(0)
  }

  git(['add', ...changedFiles])
  git(['commit', '-m', fullMessage])

  const commitSha = git(['rev-parse', 'HEAD']).slice(0, 7)
  let pushed = false

  if (push) {
    git(['push'])
    pushed = true
  }

  const finalStatus = git(['status', '--porcelain=v1', '--branch'])
  if (push && finalStatus.includes('ahead')) {
    console.error('Branch still ahead after push — check remote')
    process.exit(2)
  }

  console.log(JSON.stringify({
    committed: true,
    commit: commitSha,
    pushed,
    branch_status: finalStatus.split('\n')[0],
    files: changedFiles.sort(),
  }, null, 2))
} catch (error) {
  console.error(`nightly-git-error: ${error.message}`)
  process.exit(2)
}
