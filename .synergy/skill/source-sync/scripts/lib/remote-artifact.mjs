import { Buffer } from 'node:buffer'

export const MAX_REMOTE_PATH_BYTES = 1024

export function parseGithubRepo(value) {
  let url
  try {
    url = new URL(String(value ?? ''))
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash) return null
  const segments = url.pathname.replace(/\/$/u, '').split('/').filter(Boolean)
  if (segments.length !== 2) return null
  const owner = segments[0]
  const repo = segments[1].replace(/\.git$/u, '')
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/u.test(owner)) return null
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/u.test(repo) || repo === '.' || repo === '..') return null
  return { owner, repo }
}

export function assertGitCommit(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/u.test(value)) throw new Error(`invalid pinned Git commit: ${JSON.stringify(value)}`)
  return value
}

export function gitBlobOid(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/u.test(value)) throw new Error(`invalid Git blob OID: ${JSON.stringify(value)}`)
  return `git_sha1:${value}`
}

export function assertGitBlobOid(value) {
  if (typeof value !== 'string' || !/^git_sha1:[a-f0-9]{40}$/u.test(value)) throw new Error(`invalid Git blob OID: ${JSON.stringify(value)}`)
  return value
}

export function assertRemoteTreePath(value) {
  if (typeof value !== 'string' || value.length === 0) throw new Error('remote tree path must be a non-empty string')
  if (value !== value.normalize('NFC')) throw new Error(`remote tree path must be NFC: ${JSON.stringify(value)}`)
  if (/[\p{Cc}\p{Cf}\u2028\u2029]/u.test(value)) throw new Error(`remote tree path contains control, format, line-separator, or paragraph-separator characters: ${JSON.stringify(value)}`)
  if (value.includes('\\')) throw new Error(`remote tree path contains a backslash: ${JSON.stringify(value)}`)
  if (value.startsWith('/') || /^[A-Za-z]:\//u.test(value)) throw new Error(`remote tree path must be relative: ${JSON.stringify(value)}`)
  if (Buffer.byteLength(value, 'utf8') > MAX_REMOTE_PATH_BYTES) throw new Error(`remote tree path exceeds ${MAX_REMOTE_PATH_BYTES} UTF-8 bytes`)
  const segments = value.split('/')
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new Error(`remote tree path contains an unsafe segment: ${JSON.stringify(value)}`)
  }
  return value
}

export function buildRawGithubUrl(repo, commit, remotePath) {
  const validatedRepo = assertRepo(repo)
  const validatedCommit = assertGitCommit(commit)
  const validatedPath = assertRemoteTreePath(remotePath)
  const segments = [validatedRepo.owner, validatedRepo.repo, validatedCommit, ...validatedPath.split('/')]
  const rawUrl = `https://raw.githubusercontent.com/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`
  const parsed = new URL(rawUrl)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'raw.githubusercontent.com' || parsed.port || parsed.username || parsed.password) {
    throw new Error('raw GitHub URL escaped the fixed origin')
  }
  return rawUrl
}

export function buildGithubBlobUrl(repo, commit, remotePath) {
  const validatedRepo = assertRepo(repo)
  const validatedCommit = assertGitCommit(commit)
  const validatedPath = assertRemoteTreePath(remotePath)
  const path = validatedPath.split('/').map((segment) => encodeURIComponent(segment)).join('/')
  return `https://github.com/${encodeURIComponent(validatedRepo.owner)}/${encodeURIComponent(validatedRepo.repo)}/blob/${validatedCommit}/${path}`
}

function assertRepo(repo) {
  const parsed = parseGithubRepo(`https://github.com/${repo?.owner ?? ''}/${repo?.repo ?? ''}`)
  if (!parsed || parsed.owner !== repo.owner || parsed.repo !== repo.repo) throw new Error('invalid validated GitHub repository identity')
  return parsed
}
