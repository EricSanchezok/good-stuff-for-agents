#!/usr/bin/env node
import { assertCatalogId, CATALOG, loadRegistry, resolveWithin, ROOT, sha256, writeTextAtomic } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { assertGitCommit, assertRemoteTreePath, buildGithubBlobUrl, buildRawGithubUrl, gitBlobOid, parseGithubRepo } from './lib/remote-artifact.mjs'

const registry = loadRegistry()
const states = []
const manifests = []

for (const source of registry.sources) {
  const active = source.status === 'active' || source.status === 'preview'
  if (!active) {
    states.push(catalogData('append-source-state.mjs', {
      source_id: source.source_id,
      changed: false,
      upstream_ref: source.state?.last_ref ?? null,
      status: source.status,
      skills_found: 0,
      errors: [`source status is ${source.status}`],
    }))
    continue
  }

  try {
    const manifest = await syncGithubSource(source)
    manifests.push(manifest.path)
    catalogData('write-source-record.mjs', {
      ...source,
      state: {
        last_checked_at: manifest.checked_at,
        last_success_at: manifest.checked_at,
        last_ref: manifest.upstream_ref,
        consecutive_failures: 0,
      },
    })
    states.push(catalogData('append-source-state.mjs', {
      source_id: source.source_id,
      changed: source.state?.last_ref !== manifest.upstream_ref,
      upstream_ref: manifest.upstream_ref,
      status: 'ok',
      skills_found: manifest.artifacts.length,
      errors: [],
    }))
  } catch (error) {
    const failures = (source.state?.consecutive_failures ?? 0) + 1
    catalogData('write-source-record.mjs', {
      ...source,
      state: {
        last_checked_at: new Date().toISOString(),
        last_success_at: source.state?.last_success_at ?? null,
        last_ref: source.state?.last_ref ?? null,
        consecutive_failures: failures,
      },
    })
    states.push(catalogData('append-source-state.mjs', {
      source_id: source.source_id,
      changed: false,
      upstream_ref: source.state?.last_ref ?? null,
      status: 'error',
      skills_found: 0,
      errors: [error.message],
    }))
  }
}

printResult({ synced: states.length, repo: ROOT, manifests, states })

async function syncGithubSource(source) {
  const sourceId = assertCatalogId('source', source.source_id)
  const repo = parseGithubRepo(source.url)
  if (!repo) throw new Error(`unsupported source URL for minimal sync: ${source.url}`)
  const repoInfo = await githubJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}`)
  const branchName = source.sync?.default_ref ?? repoInfo.default_branch ?? 'main'
  const branch = await githubJson(`https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/branches/${encodeURIComponent(branchName)}`)
  const sha = assertGitCommit(branch.commit?.sha)
  const tree = await githubJson(`https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/git/trees/${sha}?recursive=1`)
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
  writeTextAtomic(path, JSON.stringify(manifest, null, 2) + '\n')
  return { ...manifest, path }
}

async function githubJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'skill-intelligence-catalog' } })
  if (!response.ok) throw new Error(`GitHub request failed ${response.status}: ${url}`)
  return response.json()
}

function matchesAny(path, globs) {
  return globs.some((glob) => globMatch(path, glob))
}

function globMatch(path, glob) {
  if (glob === '**/SKILL.md') return path === 'SKILL.md' || path.endsWith('/SKILL.md')
  if (glob === '**/*.md') return path.endsWith('.md')
  if (glob === 'node_modules/**') return path === 'node_modules' || path.startsWith('node_modules/') || path.includes('/node_modules/')
  // Support wildcard: *.ext → equivalent to **/*.ext
  if (glob.startsWith('*.')) return path.endsWith(glob.slice(1))
  // Support trailing directory: skills/ → skills/**
  const normalized = glob.includes('**') ? glob : (glob.endsWith('/') ? glob + '**' : glob + '/**')
  const parts = normalized.split('**').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = '^' + parts.join('.*') + '$'
  // For directory patterns like skills/**, also match direct children: skills/*.md
  const dirSuffix = '/**'
  const altPattern = normalized.endsWith(dirSuffix)
    ? '^' + parts.slice(0, -1).join('.*').replace(/\/$/, '') + '(?:/.*)?$'
    : null
  return new RegExp(pattern).test(path) || (altPattern ? new RegExp(altPattern).test(path) : false)
}
