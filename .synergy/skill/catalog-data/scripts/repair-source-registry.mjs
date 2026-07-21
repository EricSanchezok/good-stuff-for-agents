#!/usr/bin/env node
import { join } from 'node:path'
import {
  CATALOG,
  parseYaml,
  readDraft,
  readText,
  validateCatalog,
  writeRegistry,
  writeTextAtomic,
} from './lib/catalog-lib.mjs'

const args = process.argv.slice(2)
const inputIndex = args.indexOf('--input')
const draftArgs = inputIndex >= 0 ? [args[inputIndex + 1]] : args
if (inputIndex >= 0 && !args[inputIndex + 1]) throw new Error('--input requires a draft path')
const draft = readDraft(draftArgs)
const registryPath = join(CATALOG, 'sources', 'registry.yaml')
const removeExactLines = draft.remove_exact_lines ?? []
const source = draft.source

if (!Array.isArray(removeExactLines) || removeExactLines.length === 0) {
  throw new Error('remove_exact_lines must be a non-empty array')
}
if (new Set(removeExactLines).size !== removeExactLines.length) {
  throw new Error('remove_exact_lines must not contain duplicates')
}
if (!source || typeof source !== 'object') {
  throw new Error('source must be a complete reviewed source record')
}
for (const field of ['schema_version', 'source_id', 'name', 'type', 'status', 'license', 'sync', 'state']) {
  if (source[field] === undefined || source[field] === null) throw new Error(`source.${field} is required`)
}

const original = readText(registryPath)
const lines = original.split(/\r?\n/)
const blockScalarLines = findYamlBlockScalarContentLines(lines)
for (const line of removeExactLines) {
  const matchingIndexes = lines.flatMap((candidate, index) => candidate === line ? [index] : [])
  if (matchingIndexes.length !== 1) {
    throw new Error(`expected exactly one corrupt line ${JSON.stringify(line)}, found ${matchingIndexes.length}`)
  }
  if (blockScalarLines.has(matchingIndexes[0])) {
    throw new Error(`refusing to remove YAML block scalar content ${JSON.stringify(line)}`)
  }
}

const repairedText = lines.filter((line) => !removeExactLines.includes(line)).join('\n')
const registry = parseYaml(repairedText, 'catalog/sources/registry.yaml after declared line removal') ?? {}
if (!Array.isArray(registry.sources)) throw new Error('repaired registry sources must be an array')
if (registry.sources.some((item) => item.source_id === source.source_id)) {
  throw new Error(`source_id already exists after repair: ${source.source_id}`)
}
if (source.url && registry.sources.some((item) => item.url === source.url)) {
  throw new Error(`source URL already exists after repair: ${source.url}`)
}

registry.sources.push(source)
registry.sources.sort((a, b) => a.source_id.localeCompare(b.source_id))
writeRegistry({ schema_version: registry.schema_version ?? 1, sources: registry.sources })
const validation = validateCatalog({ strict: true })
if (!validation.ok) {
  writeTextAtomic(registryPath, original)
  throw new Error(`strict catalog validation failed after registry repair; original registry restored: ${validation.errors.join('; ')}`)
}
console.log(JSON.stringify({ repaired: true, source_id: source.source_id, removed_lines: removeExactLines.length }, null, 2))

function findYamlBlockScalarContentLines(lines) {
  const contentLines = new Set()
  let blockIndent = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const indent = leadingSpaces(line)

    if (blockIndent !== null) {
      if (line.trim() === '' || indent > blockIndent) {
        contentLines.add(index)
        continue
      }
      blockIndent = null
    }

    if (/^[ ]*[^#\s][^:]*:\s*[>|][+-]?\s*(?:#.*)?$/.test(line)) {
      blockIndent = indent
    }
  }

  return contentLines
}

function leadingSpaces(line) {
  return line.match(/^ */)[0].length
}
