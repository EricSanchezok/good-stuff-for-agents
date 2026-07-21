import { createHash } from 'node:crypto'
import { isIP } from 'node:net'

export const TRUSTED_REPOSITORY = 'EricSanchezok/good-stuff-for-agents'

export const ISSUE_INTAKE_LIMITS = Object.freeze({
  inputBytes: 262_144,
  titleBytes: 512,
  bodyBytes: 32_768,
  commentCount: 50,
  commentBytes: 16_384,
  totalCommentBytes: 65_536,
  labelCount: 50,
  totalLabelBytes: 4_096,
  urlCount: 25,
  urlBytes: 2_048,
  attachmentCount: 8,
})

const INJECTION_PATTERNS = [
  ['role_spoofing', /(?:^|\n)\s*(?:system|developer|assistant|tool)\s*(?:message|prompt|role)?\s*:/iu],
  ['instruction_override', /\b(?:ignore|disregard|override|forget)\b.{0,80}\b(?:previous|prior|above|system|developer|instructions?|rules?|policy)\b/iu],
  ['fake_authorization', /\b(?:maintainer|admin|owner|security team|project lead)\b.{0,100}\b(?:approved|authorized|permission|allow(?:ed)?)\b/iu],
  ['prompt_extraction', /\b(?:reveal|print|show|dump|expose)\b.{0,80}\b(?:system prompt|developer prompt|hidden instructions?|chain of thought)\b/iu],
]

const PRIVILEGED_ACTION_PATTERNS = [
  ['secret_exfiltration', /\b(?:secret|token|credential|api[ _-]?key|password|\.env|private key)\b.{0,100}\b(?:read|show|print|send|upload|exfiltrat|leak|post|return|reveal)|\b(?:read|show|print|send|upload|exfiltrat|leak|post|return|reveal)\b.{0,100}\b(?:secret|token|credential|api[ _-]?key|password|\.env|private key)\b/iu],
  ['shell_execution', /\b(?:run|execute|invoke)\b.{0,60}\b(?:shell|bash|zsh|terminal|command|sudo|rm\s+-rf)\b|`(?:sudo|rm\s+-rf|curl|wget|bash|zsh)\b/iu],
  ['git_mutation', /\bgit\s+(?:add|commit|push|reset|clean|rebase|checkout|switch|merge|tag)\b|\b(?:commit|push|force[ -]?push)\b.{0,50}\b(?:repo|repository|branch|changes?)\b/iu],
  ['config_mutation', /\b(?:edit|write|change|modify|overwrite|delete)\b.{0,80}\b(?:synergy|system|global|agent|permission|config(?:uration)?)\b/iu],
  ['github_mutation', /\b(?:comment|reply|react|label|close|reopen)\b.{0,60}\b(?:issue|thread|github)\b|\b(?:create|open|merge|approve)\b.{0,60}\b(?:pull request|\bpr\b)|\bgithub\b.{0,60}\b(?:comment|reply|close|push|merge)\b/iu],
  ['dependency_install', /\b(?:npm|pnpm|yarn|bun|pip|pipx|brew|apt|get|cargo)\s+(?:install|add)\b|\binstall\b.{0,60}\b(?:dependency|package|plugin|tool)\b/iu],
  ['gate_override', /\b(?:bypass|override|skip|disable|ignore|lower)\b.{0,80}\b(?:gate|threshold|validation|license|safety|evaluation|publication|approval|policy)\b/iu],
]

const URL_PATTERN = /\b(?:[a-z][a-z0-9+.-]*:\/\/|(?:data|javascript|file):)[^\s<>{}"'`]+/giu
const ATTACHMENT_EXTENSION = /\.(?:7z|avif|bmp|csv|docx?|gif|gz|jpe?g|mov|mp3|mp4|pdf|png|pptx?|svg|tar|tgz|webp|xlsx?|zip)(?:[?#]|$)/iu
const RESERVED_HOST_SUFFIXES = ['.local', '.localhost', '.internal', '.home', '.invalid', '.test', '.example']
const RESERVED_HOSTS = new Set(['localhost', 'example.com', 'example.net', 'example.org'])

export class IntakeValidationError extends Error {
  constructor(status, errors) {
    super(errors.join('; '))
    this.name = 'IntakeValidationError'
    this.status = status
    this.errors = errors
  }
}

export function normalizeIssueIntake(payload, options = {}) {
  const inputBytes = options.inputBytes ?? byteLength(JSON.stringify(payload))
  if (inputBytes > ISSUE_INTAKE_LIMITS.inputBytes) {
    throw new IntakeValidationError('rejected_budget', [`input exceeds ${ISSUE_INTAKE_LIMITS.inputBytes} bytes`])
  }
  if (!isPlainObject(payload)) {
    throw new IntakeValidationError('rejected_schema', ['input must be an object'])
  }

  const repository = repositoryName(payload.repository)
  if (repository !== TRUSTED_REPOSITORY) {
    throw new IntakeValidationError('rejected_repository', [`repository must be exactly "${TRUSTED_REPOSITORY}"`])
  }

  const issue = payload.issue
  const schemaErrors = []
  if (!isPlainObject(issue)) schemaErrors.push('issue must be an object')
  if (payload.comments_complete !== true) schemaErrors.push('comments_complete must be true')
  if (payload.labels_complete !== true) schemaErrors.push('labels_complete must be true')
  if (schemaErrors.length > 0) throw new IntakeValidationError('rejected_schema', schemaErrors)

  const number = issue.number
  const title = issue.title
  const body = issue.body ?? ''
  const updatedAt = issue.updated_at ?? issue.updatedAt
  const labels = issue.labels
  const comments = payload.comments

  if (!Number.isInteger(number) || number <= 0) schemaErrors.push('issue.number must be a positive integer')
  if (typeof title !== 'string') schemaErrors.push('issue.title must be a string')
  if (typeof body !== 'string') schemaErrors.push('issue.body must be a string or null')
  if (!isTimestamp(updatedAt)) schemaErrors.push('issue.updated_at must be an ISO timestamp')
  if (!Array.isArray(labels)) schemaErrors.push('issue.labels must be an array')
  if (!Array.isArray(comments)) schemaErrors.push('comments must be an array')
  if (schemaErrors.length > 0) throw new IntakeValidationError('rejected_schema', schemaErrors)

  const normalizedLabels = normalizeLabels(labels, schemaErrors)
  const normalizedComments = normalizeComments(comments, schemaErrors)
  if (schemaErrors.length > 0) throw new IntakeValidationError('rejected_schema', schemaErrors)

  const budgetErrors = []
  const titleBytes = byteLength(title)
  const bodyBytes = byteLength(body)
  const commentBytes = normalizedComments.reduce((sum, comment) => sum + byteLength(comment.body), 0)
  const labelBytes = normalizedLabels.reduce((sum, label) => sum + byteLength(label), 0)

  enforceBudget(budgetErrors, 'title', titleBytes, ISSUE_INTAKE_LIMITS.titleBytes)
  enforceBudget(budgetErrors, 'body', bodyBytes, ISSUE_INTAKE_LIMITS.bodyBytes)
  enforceBudget(budgetErrors, 'comment count', normalizedComments.length, ISSUE_INTAKE_LIMITS.commentCount)
  enforceBudget(budgetErrors, 'total comment bodies', commentBytes, ISSUE_INTAKE_LIMITS.totalCommentBytes, 'bytes')
  enforceBudget(budgetErrors, 'label count', normalizedLabels.length, ISSUE_INTAKE_LIMITS.labelCount)
  enforceBudget(budgetErrors, 'total label names', labelBytes, ISSUE_INTAKE_LIMITS.totalLabelBytes, 'bytes')
  normalizedComments.forEach((comment, index) => {
    enforceBudget(budgetErrors, `comments[${index}].body`, byteLength(comment.body), ISSUE_INTAKE_LIMITS.commentBytes)
  })

  const untrustedText = [title, body, ...normalizedLabels, ...normalizedComments.map((comment) => comment.body)].join('\n')
  const markdownImages = scanMarkdownImages(untrustedText)
  const urlLeads = extractUrlLeads(untrustedText, markdownImages.destinations)
  const attachmentCount = markdownImages.count
    + urlLeads.filter((lead) => lead.attachment && !markdownImages.destinations.has(lead.url)).length
  enforceBudget(budgetErrors, 'URL count', urlLeads.length, ISSUE_INTAKE_LIMITS.urlCount)
  enforceBudget(budgetErrors, 'attachment count', attachmentCount, ISSUE_INTAKE_LIMITS.attachmentCount)
  urlLeads.forEach((lead, index) => {
    enforceBudget(budgetErrors, `URLs[${index}]`, byteLength(lead.url), ISSUE_INTAKE_LIMITS.urlBytes)
  })
  if (budgetErrors.length > 0) throw new IntakeValidationError('rejected_budget', budgetErrors)

  const injectionIndicators = matchIndicators(untrustedText, INJECTION_PATTERNS)
  const requestedPrivilegedActions = matchIndicators(untrustedText, PRIVILEGED_ACTION_PATTERNS)
  if (urlLeads.some((lead) => lead.classification === 'dangerous_scheme')) {
    requestedPrivilegedActions.push('dangerous_url_scheme')
  }
  if (urlLeads.some((lead) => lead.classification === 'non_public_host')) {
    requestedPrivilegedActions.push('non_public_url')
  }
  if (attachmentCount > 0) requestedPrivilegedActions.push('attachment_access')
  if (markdownImages.malformedCount > 0) requestedPrivilegedActions.push('malformed_markdown_image')

  const canonicalContent = {
    repository: TRUSTED_REPOSITORY,
    issue_number: number,
    updated_at: updatedAt,
    title,
    body,
    labels: [...normalizedLabels].sort(compareText),
    comments: [...normalizedComments].sort((left, right) => compareText(left.id, right.id)),
  }
  const contentDigest = `sha256:${createHash('sha256').update(stableStringify(canonicalContent)).digest('hex')}`
  const uniquePrivilegedActions = [...new Set(requestedPrivilegedActions)].sort(compareText)

  return {
    schema_version: 1,
    kind: 'github_issue_intake',
    intake_status: 'accepted',
    trust: {
      content: 'untrusted',
      authority: 'none',
      grants: [],
    },
    issue_binding: {
      repository: TRUSTED_REPOSITORY,
      issue_number: number,
      updated_at: updatedAt,
      content_digest: contentDigest,
    },
    untrusted_request: {
      title,
      body,
      labels: normalizedLabels,
      comments: normalizedComments,
    },
    security: {
      injection_indicators: injectionIndicators,
      requested_privileged_actions: uniquePrivilegedActions,
      requires_human_review: injectionIndicators.length > 0 || uniquePrivilegedActions.length > 0,
      url_leads: urlLeads,
    },
    budgets: {
      input_bytes: inputBytes,
      title_bytes: titleBytes,
      body_bytes: bodyBytes,
      comment_count: normalizedComments.length,
      comment_bytes: commentBytes,
      label_count: normalizedLabels.length,
      label_bytes: labelBytes,
      url_count: urlLeads.length,
      attachment_count: attachmentCount,
    },
  }
}

function repositoryName(repository) {
  if (typeof repository === 'string') return repository
  if (isPlainObject(repository) && typeof repository.full_name === 'string') return repository.full_name
  if (isPlainObject(repository) && typeof repository.nameWithOwner === 'string') return repository.nameWithOwner
  return null
}

function normalizeLabels(labels, errors) {
  const normalized = []
  labels.forEach((label, index) => {
    const name = typeof label === 'string' ? label : isPlainObject(label) ? label.name : null
    if (typeof name !== 'string' || name.length === 0) {
      errors.push(`issue.labels[${index}] must contain a non-empty name`)
    } else {
      normalized.push(name)
    }
  })
  return normalized
}

function normalizeComments(comments, errors) {
  const normalized = []
  const ids = new Set()
  comments.forEach((comment, index) => {
    if (!isPlainObject(comment)) {
      errors.push(`comments[${index}] must be an object`)
      return
    }
    const id = normalizeId(comment.id)
    const body = comment.body ?? ''
    const author = normalizeLogin(comment.author?.login) ?? normalizeLogin(comment.user?.login)
    const createdAt = comment.created_at ?? comment.createdAt
    const updatedAt = comment.updated_at ?? comment.updatedAt
    if (id === null) errors.push(`comments[${index}].id must be a non-empty string or integer`)
    if (id !== null && ids.has(id)) errors.push(`comments[${index}].id must be unique`)
    if (typeof body !== 'string') errors.push(`comments[${index}].body must be a string or null`)
    if (author !== null && typeof author !== 'string') errors.push(`comments[${index}].author must be a string or null`)
    if (!isTimestamp(createdAt)) errors.push(`comments[${index}].created_at must be an ISO timestamp`)
    if (!isTimestamp(updatedAt)) errors.push(`comments[${index}].updated_at must be an ISO timestamp`)
    if (id !== null) ids.add(id)
    if (id !== null && typeof body === 'string' && (author === null || typeof author === 'string') && isTimestamp(createdAt) && isTimestamp(updatedAt)) {
      normalized.push({ id, author, body, created_at: createdAt, updated_at: updatedAt })
    }
  })
  return normalized
}

function extractUrlLeads(text, markdownImageDestinations) {
  const leadMap = new Map()
  for (const raw of markdownImageDestinations) addUrlLead(leadMap, raw, true)
  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = unescapeMarkdown(trimUrlPunctuation(match[0]))
    addUrlLead(leadMap, raw, markdownImageDestinations.has(raw))
  }
  return [...leadMap.values()].sort((left, right) => compareText(left.url, right.url))
}

function scanMarkdownImages(text) {
  const definitions = scanMarkdownReferenceDefinitions(text)
  const destinations = new Set()
  let count = 0
  let malformedCount = 0

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '!' || text[index + 1] !== '[' || isMarkdownEscaped(text, index)) continue
    count += 1
    const alt = scanMarkdownBracket(text, index + 1)
    if (alt === null) {
      malformedCount += 1
      continue
    }

    const next = text[alt.end]
    if (next === '(') {
      const inline = scanInlineMarkdownImage(text, alt.end)
      if (inline === null) malformedCount += 1
      else if (inline.destination.length > 0) destinations.add(inline.destination)
      continue
    }

    if (next === '[') {
      const reference = scanMarkdownBracket(text, alt.end)
      if (reference === null) {
        malformedCount += 1
        continue
      }
      const label = normalizeMarkdownLabel(reference.value.length === 0 ? alt.value : reference.value)
      if (label.length === 0) malformedCount += 1
      else if (definitions.has(label)) destinations.add(definitions.get(label))
      continue
    }

    let lookahead = alt.end
    while (isMarkdownWhitespace(text[lookahead])) lookahead += 1
    if (text[lookahead] === '(' || text[lookahead] === '[') {
      malformedCount += 1
      continue
    }
    const label = normalizeMarkdownLabel(alt.value)
    if (label.length === 0) malformedCount += 1
    else if (definitions.has(label)) destinations.add(definitions.get(label))
  }

  return { count, malformedCount, destinations }
}

function scanMarkdownReferenceDefinitions(text) {
  const definitions = new Map()
  let lineStart = 0
  while (lineStart < text.length) {
    let lineEnd = lineStart
    while (lineEnd < text.length && text[lineEnd] !== '\n' && text[lineEnd] !== '\r') lineEnd += 1
    const definition = scanMarkdownReferenceDefinition(text.slice(lineStart, lineEnd))
    if (definition !== null) definitions.set(definition.label, definition.destination)
    if (text[lineEnd] === '\r' && text[lineEnd + 1] === '\n') lineEnd += 1
    lineStart = lineEnd + 1
  }
  return definitions
}

function scanMarkdownReferenceDefinition(line) {
  let index = 0
  while (index < 3 && line[index] === ' ') index += 1
  if (line[index] !== '[') return null
  const label = scanMarkdownBracket(line, index, false)
  if (label === null || line[label.end] !== ':') return null
  const normalizedLabel = normalizeMarkdownLabel(label.value)
  if (normalizedLabel.length === 0) return null
  index = label.end + 1
  while (line[index] === ' ' || line[index] === '\t') index += 1
  const destination = scanMarkdownDefinitionDestination(line, index)
  return destination === null ? null : { label: normalizedLabel, destination }
}

function scanMarkdownDefinitionDestination(line, startIndex) {
  if (line[startIndex] === '<') {
    let index = startIndex + 1
    while (index < line.length) {
      if (line[index] === '\\' && index + 1 < line.length) {
        index += 2
        continue
      }
      if (line[index] === '>') return trimMarkdownDestination(line.slice(startIndex + 1, index))
      if (line[index] === '<') return null
      index += 1
    }
    return null
  }

  let index = startIndex
  let depth = 0
  while (index < line.length && !isMarkdownWhitespace(line[index])) {
    if (line[index] === '\\' && index + 1 < line.length) {
      index += 2
      continue
    }
    if (line[index] === '(') depth += 1
    if (line[index] === ')') {
      if (depth === 0) return null
      depth -= 1
    }
    index += 1
  }
  if (depth !== 0 || index === startIndex) return null
  return trimMarkdownDestination(line.slice(startIndex, index))
}

function scanInlineMarkdownImage(text, openIndex) {
  let index = openIndex + 1
  while (isMarkdownWhitespace(text[index])) index += 1
  let destination

  if (text[index] === '<') {
    const destinationStart = index + 1
    index += 1
    while (index < text.length) {
      if (text[index] === '\\' && index + 1 < text.length) {
        index += 2
        continue
      }
      if (text[index] === '>') break
      if (text[index] === '<' || text[index] === '\n' || text[index] === '\r') return null
      index += 1
    }
    if (text[index] !== '>') return null
    destination = trimMarkdownDestination(text.slice(destinationStart, index))
    index += 1
  } else {
    const destinationStart = index
    let depth = 0
    while (index < text.length) {
      const character = text[index]
      if (character === '\\' && index + 1 < text.length) {
        index += 2
        continue
      }
      if (character === '(') depth += 1
      if (character === ')') {
        if (depth === 0) break
        depth -= 1
      }
      if (isMarkdownWhitespace(character) && depth === 0) break
      if (character === '\n' || character === '\r') return null
      index += 1
    }
    if (depth !== 0 || index >= text.length) return null
    destination = trimMarkdownDestination(text.slice(destinationStart, index))
  }

  while (isMarkdownWhitespace(text[index])) index += 1
  if (text[index] === ')') return { destination, end: index + 1 }
  const titleEnd = scanMarkdownTitle(text, index)
  if (titleEnd === null) return null
  index = titleEnd
  while (isMarkdownWhitespace(text[index])) index += 1
  return text[index] === ')' ? { destination, end: index + 1 } : null
}

function scanMarkdownTitle(text, startIndex) {
  const opener = text[startIndex]
  const closer = opener === '(' ? ')' : opener
  if (!['"', "'", '('].includes(opener)) return null
  let index = startIndex + 1
  while (index < text.length) {
    if (text[index] === '\\' && index + 1 < text.length) {
      index += 2
      continue
    }
    if (text[index] === closer) return index + 1
    if (text[index] === '\n' || text[index] === '\r' || (opener === '(' && text[index] === '(')) return null
    index += 1
  }
  return null
}

function scanMarkdownBracket(text, openIndex, allowNewlines = true) {
  if (text[openIndex] !== '[') return null
  let depth = 1
  let index = openIndex + 1
  while (index < text.length) {
    if (text[index] === '\\' && index + 1 < text.length) {
      index += 2
      continue
    }
    if (!allowNewlines && (text[index] === '\n' || text[index] === '\r')) return null
    if (text[index] === '[') depth += 1
    if (text[index] === ']') {
      depth -= 1
      if (depth === 0) return { value: text.slice(openIndex + 1, index), end: index + 1 }
    }
    index += 1
  }
  return null
}

function isMarkdownEscaped(text, index) {
  let backslashes = 0
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) backslashes += 1
  return backslashes % 2 === 1
}

function isMarkdownWhitespace(value) {
  return value === ' ' || value === '\t' || value === '\n' || value === '\r'
}

function addUrlLead(leadMap, raw, markdownImage) {
  if (typeof raw !== 'string' || raw.length === 0) return
  const existing = leadMap.get(raw)
  if (existing) {
    if (markdownImage) existing.attachment = true
    return
  }
  leadMap.set(raw, classifyUrl(raw, markdownImage))
}

function normalizeMarkdownLabel(value) {
  return unescapeMarkdown(value).trim().replace(/\s+/gu, ' ').toLowerCase()
}

function trimMarkdownDestination(value) {
  return unescapeMarkdown(value.trim())
}

function unescapeMarkdown(value) {
  let result = ''
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    const next = value[index + 1]
    if (character === '\\' && isAsciiPunctuation(next)) {
      result += next
      index += 1
    } else {
      result += character
    }
  }
  return result
}

function isAsciiPunctuation(value) {
  const code = value?.codePointAt(0)
  return code !== undefined && (
    (code >= 0x21 && code <= 0x2f)
    || (code >= 0x3a && code <= 0x40)
    || (code >= 0x5b && code <= 0x60)
    || (code >= 0x7b && code <= 0x7e)
  )
}

function classifyUrl(raw, markdownImage = false) {
  const attachment = markdownImage || isAttachmentReference(raw)
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return { url: raw, classification: 'invalid', attachment }
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { url: raw, classification: 'dangerous_scheme', attachment }
  }
  if (isNonPublicHost(parsed.hostname)) {
    return { url: raw, classification: 'non_public_host', attachment }
  }
  return { url: raw, classification: 'public_http', attachment }
}

function isAttachmentReference(raw) {
  try {
    const parsed = new URL(raw)
    const hostname = parsed.hostname.toLowerCase()
    return hostname === 'user-images.githubusercontent.com'
      || hostname === 'github-production-user-asset-6210df.s3.amazonaws.com'
      || parsed.pathname.includes('/user-attachments/')
      || ATTACHMENT_EXTENSION.test(parsed.pathname)
  } catch {
    return ATTACHMENT_EXTENSION.test(raw)
  }
}

function isNonPublicHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/gu, '').replace(/\.+$/u, '')
  const ipVersion = isIP(host)
  if (ipVersion === 4) return isNonPublicIpv4(host)
  if (ipVersion === 6) return isNonPublicIpv6(host)
  return RESERVED_HOSTS.has(host)
    || RESERVED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
    || !host.includes('.')
}

function isNonPublicIpv4(host) {
  const [first, second, third] = host.split('.').map(Number)
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 0 && third === 0)
    || (first === 192 && second === 0 && third === 2)
    || (first === 192 && second === 88 && third === 99)
    || (first === 192 && second === 168)
    || (first === 198 && [18, 19].includes(second))
    || (first === 198 && second === 51 && third === 100)
    || (first === 203 && second === 0 && third === 113)
    || first >= 224
}

function isNonPublicIpv6(host) {
  const bytes = ipv6Bytes(host)
  if (bytes === null) return true

  if (bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isNonPublicIpv4(bytes.slice(12).join('.'))
  }

  return bytes.every((byte) => byte === 0)
    || (bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1)
    || bytes[0] === 0xfc
    || bytes[0] === 0xfd
    || (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80)
    || (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0xc0)
    || bytes[0] === 0xff
    || matchesIpv6Prefix(bytes, [0x00, 0x64, 0xff, 0x9b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 96)
    || matchesIpv6Prefix(bytes, [0x00, 0x64, 0xff, 0x9b, 0x00, 0x01], 48)
    || matchesIpv6Prefix(bytes, [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 64)
    || matchesIpv6Prefix(bytes, [0x20, 0x01, 0x00, 0x00], 32)
    || matchesIpv6Prefix(bytes, [0x20, 0x01, 0x00, 0x02, 0x00, 0x00], 48)
    || matchesIpv6Prefix(bytes, [0x20, 0x01, 0x00, 0x03], 32)
    || matchesIpv6Prefix(bytes, [0x20, 0x01, 0x00, 0x04, 0x01, 0x12], 48)
    || matchesIpv6Prefix(bytes, [0x20, 0x01, 0x00, 0x10], 28)
    || matchesIpv6Prefix(bytes, [0x20, 0x01, 0x00, 0x20], 28)
    || matchesIpv6Prefix(bytes, [0x20, 0x01, 0x00, 0x30], 28)
    || matchesIpv6Prefix(bytes, [0x20, 0x01, 0x0d, 0xb8], 32)
    || matchesIpv6Prefix(bytes, [0x20, 0x02], 16)
    || matchesIpv6Prefix(bytes, [0x3f, 0xff, 0x00], 20)
    || matchesIpv6Prefix(bytes, [0x5f, 0x00], 16)
}

function ipv6Bytes(host) {
  const normalized = host.toLowerCase()
  const halves = normalized.split('::')
  if (halves.length > 2) return null
  const left = halves[0] === '' ? [] : halves[0].split(':')
  const right = halves.length === 1 || halves[1] === '' ? [] : halves[1].split(':')
  const omitted = 8 - left.length - right.length
  if ((halves.length === 1 && omitted !== 0) || (halves.length === 2 && omitted < 1)) return null
  const groups = [...left, ...Array.from({ length: omitted }, () => '0'), ...right]
  if (groups.length !== 8 || groups.some((group) => !/^[a-f0-9]{1,4}$/u.test(group))) return null
  return groups.flatMap((group) => {
    const value = Number.parseInt(group, 16)
    return [value >> 8, value & 0xff]
  })
}

function matchesIpv6Prefix(bytes, prefix, bitLength) {
  const wholeBytes = Math.floor(bitLength / 8)
  const remainingBits = bitLength % 8
  for (let index = 0; index < wholeBytes; index += 1) {
    if (bytes[index] !== prefix[index]) return false
  }
  if (remainingBits === 0) return true
  const mask = 0xff << (8 - remainingBits)
  return (bytes[wholeBytes] & mask) === (prefix[wholeBytes] & mask)
}

function matchIndicators(text, patterns) {
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name).sort(compareText)
}

function enforceBudget(errors, name, value, limit, unit = name.includes('count') ? 'items' : 'bytes') {
  if (value > limit) errors.push(`${name} exceeds ${limit} ${unit}`)
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort(compareText).map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function normalizeId(value) {
  if (typeof value === 'string' && value.length > 0) return value
  if (Number.isSafeInteger(value) && value >= 0) return String(value)
  return null
}

function normalizeLogin(value) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function trimUrlPunctuation(value) {
  let result = value.replace(/[,.;!?]+$/gu, '')
  while (result.endsWith(')') && hasUnbalancedClosingParenthesis(result)) result = result.slice(0, -1)
  return result.replace(/[,.;!?]+$/gu, '')
}

function hasUnbalancedClosingParenthesis(value) {
  let depth = 0
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '\\' && index + 1 < value.length) {
      index += 1
      continue
    }
    if (value[index] === '(') depth += 1
    if (value[index] === ')') depth -= 1
  }
  return depth < 0
}

function byteLength(value) {
  return Buffer.byteLength(value, 'utf8')
}

function compareText(left, right) {
  return left.localeCompare(right, 'en')
}

function isTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(value) && !Number.isNaN(Date.parse(value))
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
