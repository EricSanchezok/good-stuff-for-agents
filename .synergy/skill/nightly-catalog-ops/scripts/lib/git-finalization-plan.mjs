import { posix } from 'node:path'
import { validateRunSummary } from './run-summary-validator.mjs'

const ORDINARY_PATHS = ['catalog/', 'docs/', 'reports/', 'assets/']
const ORDINARY_FILES = new Set(['README.md'])
const MANIFEST_FIELDS = new Set([
  'schema_version',
  'run_id',
  'mode',
  'base_head',
  'summary_digest',
  'ledger_digest',
  'paths',
])
const SECRET_PATH_PATTERNS = [
  /(^|\/)\.(?:env(?:\..*)?|netrc|pypirc|npmrc|authinfo|auth(?:rc|[._-][^/]*)?)$/iu,
  /(^|\/)(?:credential|credentials|secret|secrets|token|tokens)(?:\/|$)/iu,
  /(^|\/)(?:credential|credentials|secret|secrets|token|tokens)(?:[._-][^/]*)?\.(?:json|ya?ml|toml|ini|conf|config|txt)$/iu,
  /(^|\/)(?:auth|authentication|authorization)(?:[._-][^/]*)?\.(?:json|ya?ml|toml|ini|conf|config)$/iu,
  /\.(?:p12|pfx|pem|key)$/iu,
  /(^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/iu,
  /(^|\/)ssh_(?:host_)?[^/]*_key(?:\.pub)?$/iu,
]

export const TRUSTED_CONTROLLER_WARNING = 'read-only consistency evidence is not Git authorization; a trusted controller must independently inspect the final diff, run required gates, create the exact commit, verify its tree and parent, and push the intended upstream ref'

export function createFinalizationPlan(input = {}) {
  const errors = []
  const summary = input.summary
  const manifest = input.manifest
  const changedFiles = validatePathList(input.changedFiles, 'changed files', errors)
  const stagedFiles = validatePathList(input.stagedFiles ?? [], 'staged files', errors)
  const unstagedFiles = validatePathList(input.unstagedFiles ?? [], 'unstaged files', errors)
  const untrackedFiles = validatePathList(input.untrackedFiles ?? [], 'untracked files', errors)

  const summaryErrors = validateRunSummary(summary)
  errors.push(...summaryErrors.map((error) => `summary: ${error}`))
  validateManifest(summary, manifest, input, errors)

  const manifestPaths = validatePathList(manifest?.paths, 'touched paths manifest', errors)
  const manifestSet = new Set(manifestPaths)
  const changedOutsideManifest = changedFiles.filter((path) => !manifestSet.has(path))
  const stagedOutsideManifest = stagedFiles.filter((path) => !manifestSet.has(path))
  const manifestPathsWithoutChanges = manifestPaths.filter((path) => !changedFiles.includes(path))

  if (changedOutsideManifest.length > 0) errors.push(`changed files outside touched paths manifest: ${changedOutsideManifest.join(', ')}`)
  if (stagedOutsideManifest.length > 0) errors.push(`staged files outside touched paths manifest: ${stagedOutsideManifest.join(', ')}`)
  if (manifestPathsWithoutChanges.length > 0) errors.push(`touched paths manifest contains files without changes: ${manifestPathsWithoutChanges.join(', ')}`)

  const implementationMode = manifest?.mode === 'implementation'
  for (const path of manifestPaths) {
    if (isSecretLikePath(path)) errors.push(`secret-like path is forbidden: ${path}`)
    if (path === '.git' || path.startsWith('.git/')) errors.push(`git metadata path is forbidden: ${path}`)
    if (!implementationMode && !isOrdinaryNightlyPath(path)) errors.push(`ordinary nightly path is forbidden: ${path}`)
  }

  validateSelectedArtifact(input.summaryPath, 'summary', input.summaryArtifact, manifestSet, errors)
  validateSelectedArtifact(input.manifestPath, 'touched paths manifest', input.manifestArtifact, manifestSet, errors)
  validateHeadBinding(manifest, input, errors)

  const mixedStageFiles = stagedFiles.filter((path) => unstagedFiles.includes(path))
  const reviewNotes = [
    'This output is a read-only consistency audit, not Git authorization.',
    'The v3 summary and touched-path manifest are ledger-derived evidence and cannot authorize commit or push.',
  ]
  if (mixedStageFiles.length > 0) {
    reviewNotes.push(`Files with both staged and unstaged changes require explicit blob/index review: ${mixedStageFiles.join(', ')}`)
  }
  if (!input.upstream) reviewNotes.push('No upstream is configured; no push destination may be inferred.')

  return {
    audit_kind: 'git_finalization_audit_plan_v3',
    read_only: true,
    ready_for_trusted_controller_review: errors.length === 0,
    errors,
    warnings: [TRUSTED_CONTROLLER_WARNING],
    review_required: true,
    review_notes: reviewNotes,
    mode: implementationMode ? 'implementation' : 'ordinary',
    run_id: summary?.run_id ?? null,
    ledger_digest: summary?.ledger_digest ?? null,
    summary: {
      path: input.summaryPath ?? null,
      sha256: input.summarySha256 ?? null,
    },
    manifest: {
      path: input.manifestPath ?? null,
      sha256: input.manifestSha256 ?? null,
      paths: [...manifestPaths].sort(),
    },
    repository: {
      head: input.head ?? null,
      expected_head: input.expectedHead ?? null,
      branch: input.branch ?? null,
      upstream: input.upstream ?? null,
      changed_files: [...changedFiles].sort(),
      staged_files: [...stagedFiles].sort(),
      unstaged_files: [...unstagedFiles].sort(),
      untracked_files: [...untrackedFiles].sort(),
      mixed_stage_files: mixedStageFiles.sort(),
    },
  }
}

export function validateRepositoryPath(path, label = 'path') {
  if (typeof path !== 'string' || path.length === 0) return `${label} must be a non-empty string`
  if (path !== path.normalize('NFC')) return `${label} must use Unicode NFC normalization: ${JSON.stringify(path)}`
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(path) || /\p{Cf}/u.test(path)) {
    return `${label} contains forbidden control or format characters: ${JSON.stringify(path)}`
  }
  if (path.includes('\\')) return `${label} must use repository-relative forward slashes: ${path}`
  if (path.startsWith('/') || /^[A-Za-z]:\//u.test(path)) return `${label} must be repository-relative: ${path}`
  const normalized = posix.normalize(path)
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../') || normalized !== path) {
    return `${label} is not a canonical contained repository path: ${path}`
  }
  if (path.endsWith('/')) return `${label} must name an exact file, not a directory: ${path}`
  return null
}

export function isSecretLikePath(path) {
  return SECRET_PATH_PATTERNS.some((pattern) => pattern.test(path))
}

function validateManifest(summary, manifest, input, errors) {
  if (!isObject(manifest)) {
    errors.push('touched paths manifest must be a JSON object')
    return
  }
  for (const field of MANIFEST_FIELDS) {
    if (!(field in manifest)) errors.push(`touched paths manifest.${field}: missing required field`)
  }
  for (const field of Object.keys(manifest)) {
    if (!MANIFEST_FIELDS.has(field)) errors.push(`touched paths manifest.${field}: unknown field`)
  }
  if (manifest.schema_version !== 1) errors.push('touched paths manifest schema_version must be 1')
  if (!['ordinary', 'implementation'].includes(manifest.mode)) errors.push('touched paths manifest mode must be "ordinary" or "implementation"')
  if (manifest.run_id !== summary?.run_id) errors.push('touched paths manifest run_id must match summary.run_id')
  if (manifest.ledger_digest !== summary?.ledger_digest) errors.push('touched paths manifest ledger_digest must match summary.ledger_digest')
  if (!isDigest(manifest.summary_digest)) errors.push('touched paths manifest summary_digest must be a lowercase SHA-256 hex digest')
  if (!isDigest(input.summarySha256) || manifest.summary_digest !== input.summarySha256) {
    errors.push('touched paths manifest summary_digest must match the selected summary contents')
  }
  if (!isDigest(input.manifestSha256)) errors.push('selected touched paths manifest must have a SHA-256 digest')
}

function validateHeadBinding(manifest, input, errors) {
  const manifestHead = manifest?.base_head
  if (!isGitObjectId(manifestHead)) errors.push('touched paths manifest base_head must be a full lowercase Git object ID')
  if (!isGitObjectId(input.head)) errors.push('current repository HEAD must be a full lowercase Git object ID')
  if (input.expectedHead !== null && input.expectedHead !== undefined && !isGitObjectId(input.expectedHead)) {
    errors.push('--expected-head must be a full lowercase Git object ID')
  }
  if (manifestHead && input.head && manifestHead !== input.head) {
    errors.push('touched paths manifest base_head does not match current HEAD; possible replay or stale manifest')
  }
  if (input.expectedHead && input.head && input.expectedHead !== input.head) errors.push('--expected-head does not match current HEAD')
}

function validateSelectedArtifact(path, label, artifact, manifestSet, errors) {
  const pathError = validateRepositoryPath(path, label)
  if (pathError) {
    errors.push(pathError)
    return
  }
  if (artifact?.ignored === true) errors.push(`${label} must not be ignored: ${path}`)
  if (artifact?.tracked !== true && !manifestSet.has(path)) errors.push(`${label} must be tracked or included in the touched paths manifest: ${path}`)
}

function validatePathList(paths, label, errors) {
  if (!Array.isArray(paths)) {
    errors.push(`${label} must be an array`)
    return []
  }
  const output = []
  const seen = new Set()
  for (const path of paths) {
    const error = validateRepositoryPath(path, label)
    if (error) {
      errors.push(error)
      continue
    }
    if (seen.has(path)) {
      errors.push(`${label} contains duplicate path: ${path}`)
      continue
    }
    seen.add(path)
    output.push(path)
  }
  return output
}

function isOrdinaryNightlyPath(path) {
  return ORDINARY_FILES.has(path) || ORDINARY_PATHS.some((prefix) => path.startsWith(prefix))
}

function isGitObjectId(value) {
  return typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value)
}

function isDigest(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value)
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
