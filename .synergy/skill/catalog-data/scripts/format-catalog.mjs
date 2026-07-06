#!/usr/bin/env node
import { CATALOG, listFiles, parseYamlFile, readJsonl, writeTextAtomic, writeYaml, sortDeep } from './lib/catalog-lib.mjs'
import { relative } from 'node:path'

let changed = 0
for (const path of listFiles(CATALOG, (file) => file.endsWith('.yaml'))) {
  const data = parseYamlFile(path)
  writeYaml(path, data)
  changed += 1
}
for (const path of listFiles(CATALOG, (file) => file.endsWith('.jsonl'))) {
  const rows = readJsonl(path)
  writeTextAtomic(path, rows.map((row) => JSON.stringify(sortDeep(row))).join('\n') + (rows.length ? '\n' : ''))
  changed += 1
}
console.log(`formatted ${changed} catalog files`)
