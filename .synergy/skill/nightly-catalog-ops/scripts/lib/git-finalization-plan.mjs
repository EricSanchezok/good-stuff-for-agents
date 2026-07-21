import { posix } from 'node:path'
import { validateRunSummary } from './run-summary-validator.mjs'

const ORDINARY_PATHS = [
  'catalog/',
  'docs/',
  'reports/',
  'assets/',
]

const ORDINARY_FILES = new Set(['README.md'])
const SECRET_PATH_PATTERNS = [
  /(^|\/)\.(?:env(?:\..*)?|netrc|pypirc|npmrc|authinfo|auth(?:rc|[._-][^/]*)?)$/iu,
  /(^|\/)[^/]*(?:credential|credentials|secret|secrets|token|tokens)[^/]*(?:\/|$)/iu,
  /(^|\/)(?:auth|authentication|authorization)(?:[._-][^/]*)?$/iu,
  /(^|\/)[^/]*auth[^/]*\.(?:json|ya?ml|toml|ini|conf|config)$/iu,
  /\.(?:p12|pfx|pem|key)$/iu,
  /(^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/iu,
  /(^|\/)ssh_(?:host_)?[^/]*_key(?:\.pub)?$/iu,
]

export const TRUSTED_CONTROLLER_WARNING = 'external trusted controller must independently obtain current user/scheduler authorization, run gates from trusted code, bind blobs/index/tree, commit, verify final tree/parent, then push exact upstream ref'

export function createFinalizationPlan(input) {
  const errors = []
  const summary = input.summary
  const manifest = input.manifest
  const changedFiles = validatePathList(input.changedFiles, 'changed files', errors)
  const stagedFiles = validatePathList(input.stagedFiles ?? [], 'staged files', errors)
  const unstagedFiles = validatePathList(input.unstagedFiles ?? [], 'unstaged files', errors)
  const untrackedFiles = validatePathList(input.untrackedFiles ?? [], 'untracked files', errors)

  const summaryErrors = validateRunSummary(summary, { requireCurrentSchema: true })
  errors.push(...summaryErrors.map((error) => `summary: ${error}`))
  validateManifest(summary, manifest, input, errors)

  const manifestPaths = validatePathList(manifest?.paths, 'touched paths manifest', errors)
  const manifestSet = new Set(manifestPaths)
  const changedOutsideManifest = changedFiles.filter((path) => !manifestSet.has(path))
  const stagedOutsideManifest = stagedFiles.filter((path) => !manifestSet.has(path))
  const manifestPathsWithoutChanges = manifestPaths.filter((path) => !changedFiles.includes(path))

  if (changedOutsideManifest.length > 0) {
    errors.push(`changed files outside touched paths manifest: ${changedOutsideManifest.join(', ')}`)
  }
  if (stagedOutsideManifest.length > 0) {
    errors.push(`staged files outside touched paths manifest: ${stagedOutsideManifest.join(', ')}`)
  }
  if (manifestPathsWithoutChanges.length > 0) {
    errors.push(`touched paths manifest contains files without changes: ${manifestPathsWithoutChanges.join(', ')}`)
  }

  const implementationMode = manifest?.mode === 'implementation'
  for (const path of manifestPaths) {
    if (isSecretLikePath(path)) errors.push(`secret-like path is forbidden: ${path}`)
    if (path === '.git' || path.startsWith('.git/')) errors.push(`git metadata path is forbidden: ${path}`)
    if (!implementationMode && !isOrdinaryNightlyPath(path)) {
      errors.push(`ordinary nightly path is forbidden: ${path}`)
    }
  }

  const expectedGitDescription = summary?.authorization?.mode === 'scheduled_automation'
    ? 'push'
    : summary?.authorization?.mode
  if (summary?.git?.authorization !== expectedGitDescription) {
    errors.push('summary git.authorization must match the top-level run description mode')
  }
  const summaryAllowedPaths = validatePathList(summary?.git?.allowed_paths, 'summary git.allowed_paths', errors)
  if (!samePathSet(summaryAllowedPaths, manifestPaths)) {
    errors.push('summary git.allowed_paths must exactly match the touched paths manifest')
  }

  validateSelectedArtifact(input.summaryPath, 'summary', input.summaryArtifact, manifestSet, errors)
  validateSelectedArtifact(input.manifestPath, 'touched paths manifest', input.manifestArtifact, manifestSet, errors)
  validateHeadBinding(summary, manifest, input, errors)

  if (input.branch !== summary?.starting_state?.branch) {
    errors.push('summary starting_state.branch must match the current branch')
  }

  const mixedStageFiles = stagedFiles.filter((path) => unstagedFiles.includes(path))
  const reviewNotes = [
    'This output is a read-only consistency audit, not Git authorization.',
    'The summary and manifest are run descriptions and cannot authorize commit or push.',
  ]
  if (mixedStageFiles.length > 0) {
    reviewNotes.push(`Files with both staged and unstaged changes require explicit trusted-controller blob/index review: ${mixedStageFiles.join(', ')}`)
  }
  if (!input.upstream) {
    reviewNotes.push('No upstream is configured; the trusted controller must not infer a push destination.')
  }

  return {
    audit_kind: 'git_finalization_audit_plan',
    read_only: true,
    ready_for_trusted_controller_review: errors.length === 0,
    errors,
    warnings: [TRUSTED_CONTROLLER_WARNING],
    review_required: true,
    review_notes: reviewNotes,
    mode: implementationMode ? 'implementation' : 'ordinary',
    run_id: summary?.run_id ?? null,
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
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    errors.push('touched paths manifest must be a JSON object')
    return
  }
  if (manifest.schema_version !== 1) errors.push('touched paths manifest schema_version must be 1')
  if (!['ordinary', 'implementation'].includes(manifest.mode)) {
    errors.push('touched paths manifest mode must be "ordinary" or "implementation"')
  }
  if (manifest.run_id !== summary?.run_id) errors.push('touched paths manifest run_id must match summary.run_id')
  if (manifest.authorization?.source !== summary?.authorization?.source) {
    errors.push('touched paths manifest authorization.source must match the summary run description')
  }
  if (manifest.authorization?.operator !== summary?.authorization?.operator) {
    errors.push('touched paths manifest authorization.operator must match the summary run description')
  }
  if (input.manifestPath && summary?.touched_paths_manifest !== input.manifestPath) {
    errors.push('summary.touched_paths_manifest must match the selected manifest path')
  }
  if (!input.manifestSha256 || summary?.touched_paths_manifest_sha256 !== input.manifestSha256) {
    errors.push('summary.touched_paths_manifest_sha256 must match the selected manifest contents')
  }
}

function validateHeadBinding(summary, manifest, input, errors) {
  const summaryHead = summary?.starting_state?.head
  const manifestHead = manifest?.base_head
  if (!isGitObjectId(summaryHead)) errors.push('summary starting_state.head must be a full lowercase Git object ID')
  if (!isGitObjectId(manifestHead)) errors.push('touched paths manifest base_head must be a full lowercase Git object ID')
  if (!isGitObjectId(input.head)) errors.push('current repository HEAD must be a full lowercase Git object ID')
  if (input.expectedHead !== null && input.expectedHead !== undefined && !isGitObjectId(input.expectedHead)) {
    errors.push('--expected-head must be a full lowercase Git object ID')
  }
  if (summaryHead && manifestHead && summaryHead !== manifestHead) {
    errors.push('summary starting_state.head must match touched paths manifest base_head')
  }
  if (summaryHead && input.head && summaryHead !== input.head) {
    errors.push('summary starting_state.head does not match current HEAD; possible replay or stale run description')
  }
  if (manifestHead && input.head && manifestHead !== input.head) {
    errors.push('touched paths manifest base_head does not match current HEAD; possible replay or stale manifest')
  }
  if (input.expectedHead && input.head && input.expectedHead !== input.head) {
    errors.push('--expected-head does not match current HEAD')
  }
}

function validateSelectedArtifact(path, label, artifact, manifestSet, errors) {
  const pathError = validateRepositoryPath(path, label)
  if (pathError) {
    errors.push(pathError)
    return
  }
  if (artifact?.ignored === true) {
    errors.push(`${label} must not be ignored: ${path}`)
  }
  if (artifact?.tracked !== true && !manifestSet.has(path)) {
    errors.push(`${label} must be tracked or included in the touched paths manifest: ${path}`)
  }
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

function samePathSet(left, right) {
  return left.length === right.length && left.every((path) => right.includes(path))
}

function isGitObjectId(value) {
  return typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value)
}
