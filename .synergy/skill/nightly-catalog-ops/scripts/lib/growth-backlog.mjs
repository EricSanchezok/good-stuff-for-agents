/**
 * Cross-run Growth Backlog — stateful backlog for cold-start intent selection.
 *
 * Persists unresolved growth dimensions across runs so that the next run
 * can prioritize carrying them forward instead of rediscovering the same gaps.
 *
 * Entries are keyed by fingerprint = SHA256(dimension + sorted seeds).
 * Attempts track how many runs have tried this dimension; >= 3 → stale.
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const BACKLOG_SCHEMA_VERSION = 1
const VALID_STATUSES = new Set(['pending', 'stale', 'blocked', 'satisfied'])

// ── Fingerprint ──────────────────────────────────────────────────────

function computeFingerprint(dimension, seeds) {
  const sorted = [...(seeds || [])].sort()
  return createHash('sha256').update(`${dimension}|${sorted.join(',')}`).digest('hex')
}

// ── readBacklog ──────────────────────────────────────────────────────

export function readBacklog({ catalogRoot }) {
  const path = join(catalogRoot, 'growth', 'backlog.json')
  if (!existsSync(path)) {
    return { entries: [], schema_version: BACKLOG_SCHEMA_VERSION, updated_at: null }
  }

  let raw
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    return { entries: [], error: `backlog_parse_error: ${e.message}`, schema_version: BACKLOG_SCHEMA_VERSION, updated_at: null }
  }

  if (!raw || typeof raw !== 'object') {
    return { entries: [], error: 'backlog_root_not_object', schema_version: BACKLOG_SCHEMA_VERSION, updated_at: null }
  }
  if (!Array.isArray(raw.entries)) {
    return { entries: [], error: 'backlog_entries_not_array', schema_version: BACKLOG_SCHEMA_VERSION, updated_at: null }
  }

  // Validate each entry shape
  const validEntries = []
  for (let i = 0; i < raw.entries.length; i++) {
    const e = raw.entries[i]
    if (!e || typeof e !== 'object') continue
    if (typeof e.fingerprint !== 'string' || !e.fingerprint) continue
    if (typeof e.dimension !== 'string' || !e.dimension) continue
    if (!Array.isArray(e.seeds)) continue
    if (!VALID_STATUSES.has(e.status)) e.status = 'pending'
    validEntries.push(e)
  }

  return {
    schema_version: raw.schema_version || BACKLOG_SCHEMA_VERSION,
    updated_at: raw.updated_at || null,
    entries: validEntries,
  }
}

// ── mergeBacklog ─────────────────────────────────────────────────────

export function mergeBacklog({ catalogRoot, entries, satisfiedFingerprints = [] }) {
  const existing = readBacklog({ catalogRoot })
  const existingEntries = existing.error ? [] : (existing.entries || [])

  const satisfiedSet = new Set(satisfiedFingerprints || [])

  const byFingerprint = new Map()
  for (const e of existingEntries) {
    if (e.status === 'stale' || e.status === 'blocked') continue
    // Existing-entry cleanup: satisfied fingerprints are marked satisfied
    // (kept as evidence, never queued); empty-seed dead entries are dropped.
    if (satisfiedSet.has(e.fingerprint)) {
      e.status = 'satisfied'
      e.updated_at = new Date().toISOString()
      byFingerprint.set(e.fingerprint, e)
      continue
    }
    if (!Array.isArray(e.seeds) || e.seeds.length === 0) continue
    byFingerprint.set(e.fingerprint, e)
  }

  const now = new Date().toISOString()
  let mergedCount = 0

  for (const entry of entries) {
    if (!entry.dimension || !Array.isArray(entry.seeds)) continue
    // New-entry adjudication: empty seeds are dropped (no dead entries),
    // satisfied fingerprints are written as satisfied (never queued).
    if (entry.seeds.length === 0) continue
    const fp = computeFingerprint(entry.dimension, entry.seeds)
    entry.fingerprint = fp
    entry.updated_at = now

    if (satisfiedSet.has(fp)) {
      entry.status = 'satisfied'
      entry.created_at = entry.created_at || now
      byFingerprint.set(fp, entry)
      mergedCount++
      continue
    }

    const prev = byFingerprint.get(fp)
    if (prev) {
      prev.attempts = (prev.attempts || 0) + 1
      prev.updated_at = now
      if (prev.attempts >= 3) prev.status = 'stale'
      if (entry.reason) prev.reason = entry.reason
      if (entry.source) prev.source = entry.source
      if (entry.discovered_sources && entry.discovered_sources.length > 0) {
        const merged = new Set([...(prev.discovered_sources || []), ...entry.discovered_sources])
        prev.discovered_sources = [...merged]
      }
      mergedCount++
    } else {
      entry.attempts = typeof entry.attempts === 'number' ? entry.attempts : 0
      entry.status = entry.status || 'pending'
      entry.created_at = entry.created_at || now
      byFingerprint.set(fp, entry)
      mergedCount++
    }
  }

  return { entries: [...byFingerprint.values()], merged_count: mergedCount }
}

// ── writeBacklog ─────────────────────────────────────────────────────

export function writeBacklog({ catalogRoot, entries }) {
  const growthDir = join(catalogRoot, 'growth')
  mkdirSync(growthDir, { recursive: true })
  const targetPath = join(growthDir, 'backlog.json')
  const now = new Date().toISOString()

  const data = {
    schema_version: BACKLOG_SCHEMA_VERSION,
    updated_at: now,
    entries,
  }

  const content = JSON.stringify(data, null, 2) + '\n'
  const tmpName = `.backlog-${randomUUID()}.tmp`
  const tmpPath = join(growthDir, tmpName)

  // Atomic write: tmp → rename
  writeFileSync(tmpPath, content, 'utf8')
  try {
    renameSync(tmpPath, targetPath)
  } catch (e) {
    try { unlinkSync(tmpPath) } catch (_) {}
    throw e
  }

  const digest = `sha256:${createHash('sha256').update(content).digest('hex')}`
  return { path: targetPath, digest, entry_count: entries.length }
}

// ── backlogToIntents ─────────────────────────────────────────────────

export function backlogToIntents({ backlog, maxTargets = 2 }) {
  const entries = (backlog.entries || []).filter(e => e.status === 'pending')

  // Sort: lowest attempts first, then oldest created_at first
  entries.sort((a, b) => {
    const aAttempts = a.attempts || 0
    const bAttempts = b.attempts || 0
    if (aAttempts !== bAttempts) return aAttempts - bAttempts
    return (a.created_at || '').localeCompare(b.created_at || '')
  })

  const intents = []
  for (const entry of entries) {
    if (intents.length >= maxTargets) break
    if ((entry.attempts || 0) >= 3) {
      entry.status = 'stale'
      continue
    }
    const seeds = (entry.seeds || []).filter(s => typeof s === 'string')
    // Defensive: never generate an empty-seed intent (dead entry). Cleanup
    // of persisted empty-seed entries is owned by mergeBacklog, not here.
    if (seeds.length === 0) continue
    intents.push({
      domain: entry.dimension,
      reason: entry.reason || `Cross-run backlog: ${entry.dimension}`,
      source: 'backlog',
      score: 0.90,
      seed_skill_ids: seeds.slice(0, 50),
      max_analysis_budget: Math.min(50, Math.max(1, Math.max(seeds.length, 1) * 3)),
    })
  }

  return intents
}

export { computeFingerprint }
