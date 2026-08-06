import { assertCatalogId, CATALOG, resolveWithin, sha256, writeTextAtomic } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { assertGitCommit, assertRemoteTreePath, buildGithubBlobUrl, buildRawGithubUrl, gitBlobOid, parseGithubRepo } from './lib/remote-artifact.mjs'
import { classifySourceSyncError, SourceSyncError, buildFetchError } from './lib/http-error-classifier.mjs'

/**
 * Programmatic source sync entry point. Collects classifications,
 * aggregates provider incidents into run-level summaries, and only emits
 * per-source writes for source-specific outcomes.
 *
 * Pure module — zero I/O/network/write on import.
 */
export async function syncApprovedSources({
  sources,
  fetchFn = null,
  writeSourceRecord = null,
  writeSnapshot = null,
  retry = { count: 2, delayMs: 500 },
  delayFn = null,
} = {}) {
  if (!Array.isArray(sources)) throw new Error('sources must be an array')

  const activeSources = sources.filter((s) => s.status === 'active' || s.status === 'preview')
  const inactiveSources = sources.filter((s) => !(s.status === 'active' || s.status === 'preview'))

  const summary = {
    attempted: activeSources.length,
    refreshed: 0,
    unchanged: 0,
    source_failed: 0,
    provider_blocked: 0,
    inactive: inactiveSources.length,
    provider_incidents: [],
    source_errors: [],
    manifests: [],
  }

  for (const source of inactiveSources) {
    summary.source_errors.push({
      source_id: source.source_id,
      category: 'inactive',
      reason: `source status is ${source.status}`,
    })
  }

  const retryCount = Math.max(0, Number(retry?.count ?? 0))
  const delayMs = Math.max(0, Number(retry?.delayMs ?? 0))
  const doDelay = delayFn || sleep

  for (const source of activeSources) {
    // Attempt-classify-retry loop: provider incidents are retried (whole
    // source sync, exponential backoff); source failures are not retried.
    let attempts = 0
    let lastClassification = null
    while (true) {
      attempts += 1
      try {
        const manifest = await syncGithubSource(source, { fetchFn, writeSnapshot })
        summary.manifests.push(manifest.path)
        const changed = source.state?.last_ref !== manifest.upstream_ref
        if (changed) summary.refreshed += 1
        else summary.unchanged += 1

        if (writeSourceRecord) {
          writeSourceRecord({
            ...source,
            state: {
              last_checked_at: manifest.checked_at,
              last_success_at: manifest.checked_at,
              last_ref: manifest.upstream_ref,
              consecutive_failures: 0,
            },
          })
        }
        summary.source_errors.push({
          source_id: source.source_id,
          category: 'success',
          changed,
          upstream_ref: manifest.upstream_ref,
          skills_found: manifest.artifacts.length,
        })
        // Success clears any earlier attempt classification (retry path)
        lastClassification = null
        break
      } catch (error) {
        const classification = classifySourceSyncError({ error, sourceId: source.source_id })
        lastClassification = classification

        // Provider incidents may be retried; source failures are terminal.
        if (classification.category === 'provider_incident' && attempts <= retryCount) {
          await doDelay(delayMs * attempts)
          continue
        }
        break
      }
    }

    const classification = lastClassification
    if (classification?.category === 'provider_incident') {
      summary.provider_blocked += 1
      // Aggregate by provider + status + reason
      const key = `${classification.status ?? 'transport'}:${classification.reason}`
      const existing = summary.provider_incidents.find((pi) => pi.key === key)
      if (existing) {
        existing.affected_source_ids.push(source.source_id)
        existing.affected_count += 1
      } else {
        summary.provider_incidents.push({
          key,
          provider: 'github',
          status: classification.status,
          reason: classification.reason,
          affected_source_ids: [source.source_id],
          affected_count: 1,
        })
      }
      // NO per-source write for provider incidents
    } else if (classification) {
      summary.source_failed += 1
      summary.source_errors.push({
        source_id: source.source_id,
        category: 'source_failure',
        status: classification.status,
        reason: classification.reason,
      })
      const failures = (source.state?.consecutive_failures ?? 0) + 1
      if (writeSourceRecord) {
        writeSourceRecord({
          ...source,
          state: {
            last_checked_at: new Date().toISOString(),
            last_success_at: source.state?.last_success_at ?? null,
            last_ref: source.state?.last_ref ?? null,
            consecutive_failures: failures,
          },
        })
      }
    }
  }

  // Sort each incident's affected_source_ids
  for (const pi of summary.provider_incidents) {
    pi.affected_source_ids.sort()
  }

  return summary
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function syncGithubSource(source, { fetchFn, writeSnapshot } = {}) {
  const sourceId = assertCatalogId('source', source.source_id)
  const repo = parseGithubRepo(source.url)
  if (!repo) throw new Error(`unsupported source URL for minimal sync: ${source.url}`)

  const doFetch = fetchFn || githubJson
  const repoInfo = await doFetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`)
  const branchName = source.sync?.default_ref ?? repoInfo.default_branch ?? 'main'
  const branch = await doFetch(`https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/branches/${encodeURIComponent(branchName)}`)
  const sha = assertGitCommit(branch.commit?.sha)
  const tree = await doFetch(`https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/git/trees/${sha}?recursive=1`)
  const include = source.sync?.include ?? ['**/SKILL.md']
  const exclude = source.sync?.exclude ?? ['node_modules/**']
  const artifacts = (tree.tree ?? [])
    .filter((item) => item.type === 'blob')
    .map((item) => ({ ...item, path: assertRemoteTreePath(item.path) }))
    .filter((item) => matchesAny(item.path, include) && !matchesAny(item.path, exclude))
    .map((item) => ({
      source_id: sourceId,
      path: item.path,
      declared_name: item.path.split('/').slice(-2, -1)[0] ?? item.path,
      format: item.path.endsWith('SKILL.md') ? 'SKILL.md' : 'markdown',
      parse_confidence: item.path.endsWith('SKILL.md') ? 'high' : 'medium',
      content_digest: gitBlobOid(item.sha),
      upstream_ref: sha,
      git_blob_oid: gitBlobOid(item.sha),
      url: buildGithubBlobUrl(repo, sha, item.path),
      raw_url: buildRawGithubUrl(repo, sha, item.path),
      artifact_binding: {
        source_id: sourceId,
        canonical_skill_id: null,
        remote_path: item.path,
        pinned_commit: sha,
        git_blob_oid: gitBlobOid(item.sha),
        raw_url: buildRawGithubUrl(repo, sha, item.path),
        expected_output_path: null,
      },
      raw_metadata: { github_blob_oid: gitBlobOid(item.sha), size: item.size ?? null },
    }))
  const manifest = {
    schema_version: 1,
    source_id: sourceId,
    upstream_ref: sha,
    checked_at: new Date().toISOString(),
    url: source.url,
    artifacts,
    digest: sha256(JSON.stringify(artifacts)),
  }
  const snapshotRef = String(sha).slice(0, 12)
  if (!/^[a-f0-9]{12}$/.test(snapshotRef)) throw new Error(`invalid GitHub snapshot ref: ${sha}`)
  const path = resolveWithin(CATALOG, 'sources', 'snapshots', `${sourceId}-${snapshotRef}.json`)
  if (writeSnapshot) writeSnapshot(path, JSON.stringify(manifest, null, 2) + '\n')
  else writeTextAtomic(path, JSON.stringify(manifest, null, 2) + '\n')
  return { ...manifest, path }
}

async function githubJson(url) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || null
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'skill-intelligence-catalog',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  let response
  try {
    response = await fetch(url, { headers })
  } catch (err) {
    throw new SourceSyncError(null, `fetch transport error: ${err.message}`, null)
  }
  if (!response.ok) {
    throw await buildFetchError(response, url)
  }
  return response.json()
}

function matchesAny(path, globs) {
  return globs.some((glob) => globMatch(path, glob))
}

function globMatch(path, glob) {
  if (glob === '**/SKILL.md') return path === 'SKILL.md' || path.endsWith('/SKILL.md')
  if (glob === '**/*.md') return path.endsWith('.md')
  if (glob === 'node_modules/**') return path === 'node_modules' || path.startsWith('node_modules/') || path.includes('/node_modules/')
  if (glob.startsWith('*.')) return path.endsWith(glob.slice(1))
  const normalized = glob.includes('**') ? glob : (glob.endsWith('/') ? glob + '**' : glob + '/**')
  const parts = normalized.split('**').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = '^' + parts.join('.*') + '$'
  const dirSuffix = '/**'
  const altPattern = normalized.endsWith(dirSuffix)
    ? '^' + parts.slice(0, -1).join('.*').replace(/\/$/, '') + '(?:/.*)?$'
    : null
  return new RegExp(pattern).test(path) || (altPattern ? new RegExp(altPattern).test(path) : false)
}
