#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { CATALOG, listFiles, parseYamlFile, readJsonl, writeTextAtomic, writeYaml, sortDeep } from './lib/catalog-lib.mjs'

export function formatCatalog(catalogRoot = CATALOG) {
  let changed = 0
  for (const path of listFiles(catalogRoot, (file) => file.endsWith('.yaml'))) {
    const data = parseYamlFile(path)
    writeYaml(path, data, catalogRoot)
    changed += 1
  }
  for (const path of listFiles(catalogRoot, (file) => file.endsWith('.jsonl'))) {
    const rows = readJsonl(path)
    writeTextAtomic(path, rows.map((row) => JSON.stringify(sortDeep(row))).join('\n') + (rows.length ? '\n' : ''), catalogRoot)
    changed += 1
  }
  return changed
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`formatted ${formatCatalog()} catalog files`)
}
