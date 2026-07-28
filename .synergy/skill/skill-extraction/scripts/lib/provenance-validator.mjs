// Provenance shape validation & construction for skill candidate extraction.
//
// The extraction layer MUST produce a bounded canonical provenance object from
// each synced artifact. This object carries the exact artifact_binding, upstream ref,
// URLs, blob OID, and size. Arbitrary input is never allowed to add paths/commands.

const ALLOWED_PROVENANCE_KEYS = new Set([
  'artifact_binding',
  'upstream_ref',
  'url',
  'raw_url',
  'git_blob_oid',
  'size',
])

const ALLOWED_BINDING_KEYS = new Set([
  'source_id',
  'remote_path',
  'pinned_commit',
  'git_blob_oid',
  'raw_url',
])

// Validates that no value in an object contains control characters or path-injection patterns.
function noControlChars(obj, label) {
  const reasons = []
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      if (value.includes('\0') || value.includes('\n') || value.includes('\r')) {
        reasons.push(`${label}.${key} contains control characters`)
      }
      if (value.includes('..') && (key === 'remote_path' || key === 'path')) continue // .. is validated separately
      if (value.startsWith('/') && (key === 'remote_path' || key === 'path')) {
        reasons.push(`${label}.${key} must not be absolute`)
      }
    }
  }
  return reasons
}

/**
 * Validate the artifact_binding sub-object.
 * Returns { valid: boolean, reasons: string[] }.
 */
export function validateArtifactBinding(binding) {
  const reasons = []
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    return { valid: false, reasons: ['artifact_binding must be a plain object'] }
  }

  // Forbidden keys: no arbitrary injection
  for (const key of Object.keys(binding)) {
    if (!ALLOWED_BINDING_KEYS.has(key)) {
      reasons.push(`artifact_binding contains forbidden key "${key}"`)
    }
  }

  if (binding.source_id !== undefined && (typeof binding.source_id !== 'string' || !binding.source_id)) {
    reasons.push('artifact_binding.source_id must be non-empty string')
  }
  if (binding.remote_path !== undefined && (typeof binding.remote_path !== 'string' || !binding.remote_path)) {
    reasons.push('artifact_binding.remote_path must be non-empty string')
  } else if (binding.remote_path) {
    if (!/^[^*?"<>|\0-\x1f]+$/.test(binding.remote_path)) {
      reasons.push('artifact_binding.remote_path contains forbidden characters')
    }
    if (binding.remote_path.includes('..')) {
      reasons.push('artifact_binding.remote_path must not contain ..')
    }
    if (binding.remote_path.startsWith('/') || binding.remote_path.startsWith('\\')) {
      reasons.push('artifact_binding.remote_path must be relative')
    }
  }
  if (binding.pinned_commit !== undefined && (typeof binding.pinned_commit !== 'string' || !binding.pinned_commit)) {
    reasons.push('artifact_binding.pinned_commit must be non-empty string')
  } else if (typeof binding.pinned_commit === 'string') {
    if (!/^[a-f0-9]{6,64}$/.test(binding.pinned_commit)) {
      reasons.push(`artifact_binding.pinned_commit is not a valid hex commit: ${binding.pinned_commit}`)
    }
  }
  if (binding.git_blob_oid !== undefined && (typeof binding.git_blob_oid !== 'string' || !binding.git_blob_oid)) {
    reasons.push('artifact_binding.git_blob_oid must be non-empty string')
  } else if (typeof binding.git_blob_oid === 'string') {
    if (!/^(git_sha1|sha256):[a-f0-9]+$/.test(binding.git_blob_oid)) {
      reasons.push(`artifact_binding.git_blob_oid has invalid algorithm label: ${binding.git_blob_oid}`)
    }
  }
  if (binding.raw_url !== undefined && binding.raw_url !== null) {
    if (typeof binding.raw_url !== 'string' || !binding.raw_url) {
      reasons.push('artifact_binding.raw_url must be null or non-empty string')
    } else if (!/^https?:\/\//.test(binding.raw_url)) {
      reasons.push('artifact_binding.raw_url must be an HTTP(S) URL')
    }
  }

  reasons.push(...noControlChars(binding, 'artifact_binding'))
  return { valid: reasons.length === 0, reasons }
}

/**
 * Build a bounded canonical provenance object from a snapshot artifact.
 * Returns null if the artifact has no artifact_binding.
 */
export function buildCandidateProvenance(artifact) {
  if (!artifact || typeof artifact !== 'object') return null

  const binding = artifact.artifact_binding
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) return null

  // Only allow known binding keys
  const cleanedBinding = {}
  for (const key of ALLOWED_BINDING_KEYS) {
    if (key in binding) {
      cleanedBinding[key] = binding[key]
    }
  }
  // Fill from artifact-level fields where binding is missing
  if (!('source_id' in cleanedBinding)) cleanedBinding.source_id = artifact.source_id
  if (!('remote_path' in cleanedBinding)) cleanedBinding.remote_path = artifact.path
  if (!('pinned_commit' in cleanedBinding)) cleanedBinding.pinned_commit = artifact.upstream_ref
  if (!('git_blob_oid' in cleanedBinding)) cleanedBinding.git_blob_oid = artifact.git_blob_oid ?? artifact.content_digest
  if (!('raw_url' in cleanedBinding)) cleanedBinding.raw_url = artifact.raw_url ?? null

  const provenance = {
    artifact_binding: cleanedBinding,
    upstream_ref: artifact.upstream_ref ?? cleanedBinding.pinned_commit ?? null,
    url: artifact.url ?? null,
    raw_url: artifact.raw_url ?? cleanedBinding.raw_url ?? null,
    git_blob_oid: artifact.git_blob_oid ?? cleanedBinding.git_blob_oid ?? artifact.content_digest ?? null,
    size: artifact.raw_metadata?.size ?? artifact.size ?? null,
  }

  return provenance
}

/**
 * Assert provenance is consistent with the source artifact.
 * Returns reasons array. Empty = valid.
 * Missing/broken binding yields reasons; no fallback digest or guessed ref.
 */
export function assertProvenanceConsistent(provenance, artifact) {
  const reasons = []

  if (!provenance || typeof provenance !== 'object') {
    reasons.push('provenance must be a plain object')
    return reasons
  }
  if (!provenance.artifact_binding || typeof provenance.artifact_binding !== 'object') {
    reasons.push('provenance missing artifact_binding')
    return reasons
  }

  // Forbidden keys at top level
  for (const key of Object.keys(provenance)) {
    if (!ALLOWED_PROVENANCE_KEYS.has(key)) {
      reasons.push(`provenance contains forbidden key "${key}"`)
    }
    // No paths/commands in values
    if (typeof provenance[key] === 'string') {
      if (provenance[key].includes('\0') || provenance[key].includes('\n') || provenance[key].includes('\r')) {
        reasons.push(`provenance.${key} contains control characters`)
      }
    }
  }

  // Validate binding shape
  const { valid: bindingValid, reasons: bindingReasons } = validateArtifactBinding(provenance.artifact_binding)
  reasons.push(...bindingReasons)
  if (!bindingValid) return reasons

  const b = provenance.artifact_binding

  // Cross-check with artifact
  if (artifact?.source_id && b.source_id !== artifact.source_id) {
    reasons.push(`provenance binding source_id "${b.source_id}" != artifact source_id "${artifact.source_id}"`)
  }
  if (artifact?.path && b.remote_path !== artifact.path) {
    reasons.push(`provenance binding remote_path "${b.remote_path}" != artifact path "${artifact.path}"`)
  }
  if (artifact?.upstream_ref && b.pinned_commit !== artifact.upstream_ref) {
    reasons.push(`provenance binding pinned_commit "${b.pinned_commit}" != artifact upstream_ref "${artifact.upstream_ref}"`)
  }

  // Compare git_blob_oid against artifact's git_blob_oid or content_digest
  const artifactOid = artifact?.git_blob_oid ?? artifact?.content_digest
  if (artifactOid && b.git_blob_oid !== artifactOid) {
    reasons.push(`provenance binding git_blob_oid "${b.git_blob_oid}" != artifact oid "${artifactOid}"`)
  }

  // raw_url cross-check
  if (b.raw_url && artifact?.raw_url && b.raw_url !== artifact.raw_url) {
    reasons.push(`provenance binding raw_url "${b.raw_url}" != artifact raw_url "${artifact.raw_url}"`)
  }

  // Validate provenance-level fields
  if (provenance.upstream_ref && artifact?.upstream_ref && provenance.upstream_ref !== artifact.upstream_ref) {
    reasons.push(`provenance upstream_ref "${provenance.upstream_ref}" != artifact upstream_ref "${artifact.upstream_ref}"`)
  }
  if (provenance.url && artifact?.url && provenance.url !== artifact.url) {
    reasons.push(`provenance url "${provenance.url}" != artifact url "${artifact.url}"`)
  }
  if (provenance.raw_url && artifact?.raw_url && provenance.raw_url !== artifact.raw_url) {
    reasons.push(`provenance raw_url "${provenance.raw_url}" != artifact raw_url "${artifact.raw_url}"`)
  }

  // git_blob_oid must be algorithm-labeled
  if (provenance.git_blob_oid && typeof provenance.git_blob_oid === 'string') {
    if (!/^(git_sha1|sha256):[a-f0-9]+$/.test(provenance.git_blob_oid)) {
      reasons.push(`provenance git_blob_oid has invalid algorithm label: ${provenance.git_blob_oid}`)
    }
  }

  // size must be number or null
  if (provenance.size !== null && provenance.size !== undefined) {
    if (typeof provenance.size !== 'number' || !Number.isFinite(provenance.size) || provenance.size < 0) {
      reasons.push(`provenance size must be a non-negative number, got ${JSON.stringify(provenance.size)}`)
    }
  }

  return reasons
}

/**
 * Validate the candidate provenance shape (standalone, no artifact cross-check).
 * Used at append time to reject malformed provenance.
 */
export function validateCandidateProvenanceShape(provenance) {
  if (provenance === undefined || provenance === null) return [] // absent is allowed (legacy)

  const reasons = []
  if (typeof provenance !== 'object' || Array.isArray(provenance)) {
    reasons.push('provenance must be null or a plain object')
    return reasons
  }

  for (const key of Object.keys(provenance)) {
    if (!ALLOWED_PROVENANCE_KEYS.has(key)) {
      reasons.push(`provenance contains forbidden key "${key}"`)
    }
  }

  if (provenance.artifact_binding) {
    const { valid, reasons: br } = validateArtifactBinding(provenance.artifact_binding)
    if (!valid) reasons.push(...br)
  }

  reasons.push(...noControlChars(provenance, 'provenance'))

  return reasons
}
