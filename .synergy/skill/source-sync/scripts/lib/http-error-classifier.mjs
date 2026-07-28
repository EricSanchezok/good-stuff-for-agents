/**
 * HTTP error classification for source sync operations.
 *
 * Two categories:
 *   provider_incident  — auth/rate-limit/transport errors that affect the whole provider,
 *                        must NOT increment any source's consecutive_failures.
 *   source_failure     — specific to one source (404/410, content/schema failure, targeted 403),
 *                        only updates that source.
 */

export const PROVIDER_INCIDENT_STATUSES = Object.freeze([401, 403, 429])

/**
 * A typed fetch error carrying the HTTP status and truncated body.
 */
export class SourceSyncError extends Error {
  constructor(status, message, body = null) {
    super(message)
    this.name = 'SourceSyncError'
    this.status = typeof status === 'number' ? status : null
    this.body = typeof body === 'string' ? body.slice(0, 500) : null
  }
}

/**
 * Build a SourceSyncError from a fetch Response.
 */
export async function buildFetchError(response, url) {
  let body = null
  try { body = await response.text() } catch { /* ignore */ }
  return new SourceSyncError(
    response.status,
    `GitHub request failed ${response.status}: ${url}`,
    body,
  )
}

/**
 * Classify a fetch error by HTTP status and response body hints.
 */
export function classifyFetchError({ status, body, url }) {
  if (!Number.isInteger(status)) {
    return { category: 'provider_incident', reason: `transport/network error`, incrementsFailures: false }
  }

  if (status === 401) {
    return { category: 'provider_incident', reason: `401 Unauthorized`, incrementsFailures: false }
  }
  if (status === 403) {
    const isTargeted = /not found|disabled|suspended|blocked|DMCA|terms of service/i.test(body ?? '')
    if (isTargeted) {
      return { category: 'source_failure', reason: `403 — resource-specific access denied`, incrementsFailures: true }
    }
    return { category: 'provider_incident', reason: `403 Forbidden (provider-level)`, incrementsFailures: false }
  }

  if (status === 429) {
    return { category: 'provider_incident', reason: `429 Too Many Requests`, incrementsFailures: false }
  }

  if (status === 404) {
    return { category: 'source_failure', reason: `404 Not Found`, incrementsFailures: true }
  }
  if (status === 410) {
    return { category: 'source_failure', reason: `410 Gone`, incrementsFailures: true }
  }

  if (status >= 500) {
    return { category: 'provider_incident', reason: `${status} server error`, incrementsFailures: false }
  }

  // Other 4xx — source failure
  if (status >= 400) {
    return { category: 'source_failure', reason: `${status} client error`, incrementsFailures: true }
  }

  return { category: 'source_failure', reason: `unexpected status ${status}`, incrementsFailures: true }
}

/**
 * Check if a batch of errors from multiple sources all share the same provider incident.
 */
export function isBatchProviderIncident(classifiedErrors) {
  if (!Array.isArray(classifiedErrors) || classifiedErrors.length === 0) return false
  const allProvider = classifiedErrors.every((e) => e.category === 'provider_incident')
  if (!allProvider) return false
  const firstStatus = classifiedErrors[0].status
  return classifiedErrors.every((e) => e.status === firstStatus)
}

/**
 * Classify a thrown error from a source sync operation.
 */
export function classifySourceSyncError({ error, sourceId }) {
  const status = error instanceof SourceSyncError ? error.status : extractHttpStatus(error)
  const message = String(error?.message ?? error)

  if (error instanceof SourceSyncError) {
    return {
      ...classifyFetchError({ status, body: error.body, url: null }),
      source_id: sourceId,
      status,
    }
  }

  if (status !== null) {
    return {
      ...classifyFetchError({ status, body: message, url: null }),
      source_id: sourceId,
      status,
    }
  }

  // Transport/timeout errors without status → provider_incident (not per-source)
  const isTransportError = /timeout|ECONNREFUSED|ENOTFOUND|EAI_|ETIMEDOUT|network/i.test(message)
  if (isTransportError) {
    return {
      category: 'provider_incident',
      reason: `transport error: ${message.slice(0, 100)}`,
      incrementsFailures: false,
      source_id: sourceId,
      status: null,
    }
  }

  // Content/schema parse errors → source_failure
  const isContentError = /invalid|parse|schema|content|unexpected|malformed/i.test(message)
  return {
    category: 'source_failure',
    reason: isContentError ? 'content/schema error' : `unknown error: ${message.slice(0, 100)}`,
    incrementsFailures: true,
    source_id: sourceId,
    status: null,
  }
}

export function extractHttpStatus(error) {
  if (Number.isInteger(error?.status)) return error.status
  if (Number.isInteger(error?.response?.status)) return error.response.status
  const message = String(error?.message ?? error)
  const match = message.match(/(?:HTTP\s+|status\s+|failed\s+)?(\d{3})\b/)
  return match ? Number(match[1]) : null
}
