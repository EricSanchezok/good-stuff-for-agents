#!/usr/bin/env node
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import {
  analysisPath,
  assertCatalogId,
  assertSafeContainedPathForWrite,
  CATALOG_ID_MAX_BYTES,
  evaluationPathForPack,
  evidencePathForPack,
  listFiles,
  packRecordPath,
  readDraft,
  resolveWithin,
  ROOT,
  skillRecordPath,
  writeTextAtomic,
} from './lib/catalog-lib.mjs'
import { formatCatalog } from './format-catalog.mjs'
import { readJsonInput } from './lib/pipeline-cli.mjs'
import { cleanGeneratedMarkdown } from '../../catalog-publishing/scripts/lib/publishing-lib.mjs'

const workspaceTemp = mkdtempSync(join(ROOT, '.tmp-path-safety-'))
const outsideTemp = mkdtempSync(join(tmpdir(), 'catalog-path-safety-'))

try {
  testCatalogIds()
  testContainment()
  testCatalogPaths()
  testFileInputs()
  testStdinInput()
  testWalkerRejectsDirectorySymlink()
  testWalkerRejectsSymlinkLoop()
  testWalkerRejectsFileSymlink()
  testWriteRejectsFileSymlink()
  testPublishingCleanupDoesNotDeleteOutside()
  testFormatDoesNotWriteOutside()
  testWriteRejectsReplacedMissingAncestor()
  testLegalDirectoryOperations()
  console.log('path safety tests passed')
} finally {
  rmSync(workspaceTemp, { recursive: true, force: true })
  rmSync(outsideTemp, { recursive: true, force: true })
}

function testCatalogIds() {
  const validIds = [
    ['source', 'src_https-github-com-anthropics-skills-anthropic-agent-skills_04f79b56'],
    ['skill', 'skl_video-src-https-github-com-coreyhaines31-marketing-f3f679c3-ey-haines-ef920698-skills-video-skill-md_f3f679c3'],
    ['pack', 'pack_research-workflow_1234abcd'],
    ['evaluation', 'eval_run_2026-07-21-recovery_1234abcd'],
    ['run', 'run_manual'],
    ['run', 'run_2026-07-21-recovery'],
  ]
  for (const [kind, value] of validIds) assert.equal(assertCatalogId(kind, value), value)

  const longestValid = `skl_${'a'.repeat(CATALOG_ID_MAX_BYTES - 4)}`
  assert.equal(Buffer.byteLength(longestValid), CATALOG_ID_MAX_BYTES)
  assert.equal(assertCatalogId('skill', longestValid), longestValid)
  assert.throws(() => assertCatalogId('skill', `${longestValid}a`), /exceeds 200 UTF-8 bytes/)

  for (const value of ['', '../../outside', '/tmp/outside', 'skl_safe/path', 'skl_safe\\path', 'skl_safe\n---\noutput: ../../outside', 'skl_safe\x00outside']) {
    assert.throws(() => assertCatalogId('skill', value))
  }
  assert.throws(() => assertCatalogId('skill', 'SKL_uppercase_1234abcd'))
  assert.throws(() => assertCatalogId('unknown', 'unknown_value'))
}

function testContainment() {
  assert.equal(resolveWithin(ROOT, '.synergy', 'package.json'), join(ROOT, '.synergy', 'package.json'))
  assert.throws(() => resolveWithin(ROOT, '../../outside'))
  assert.throws(() => resolveWithin(ROOT, '..\\..\\outside'))
  assert.throws(() => resolveWithin(ROOT, join(outsideTemp, 'outside.json')))
}

function testCatalogPaths() {
  const skillId = 'skl_video-src-https-github-com-coreyhaines31-marketing-f3f679c3-ey-haines-ef920698-skills-video-skill-md_f3f679c3'
  const packId = 'pack_research-workflow_1234abcd'
  assert.ok(skillRecordPath(skillId).startsWith(join(ROOT, 'catalog', 'skills', 'records')))
  assert.ok(analysisPath(skillId).startsWith(join(ROOT, 'catalog', 'analyses')))
  assert.ok(packRecordPath(packId).startsWith(join(ROOT, 'catalog', 'packs', 'candidates')))
  assert.ok(evaluationPathForPack(packId).endsWith(join(packId, 'evaluation.json')))
  assert.ok(evidencePathForPack(packId).endsWith(join(packId, 'evidence.md')))

  for (const invalidId of ['../../outside', 'skl_safe/path', 'skl_safe\\path', 'skl_safe\n---\npath: ../../outside']) {
    assert.throws(() => skillRecordPath(invalidId))
    assert.throws(() => analysisPath(invalidId))
  }
  for (const invalidId of ['../../outside', 'pack_safe/path', 'pack_safe\\path', 'pack_safe\n---\npath: ../../outside']) {
    assert.throws(() => packRecordPath(invalidId))
    assert.throws(() => evaluationPathForPack(invalidId))
    assert.throws(() => evidencePathForPack(invalidId))
  }
}

function testFileInputs() {
  const insidePath = join(workspaceTemp, 'inside.json')
  const outsidePath = join(outsideTemp, 'outside.json')
  writeFileSync(insidePath, '{"location":"inside"}\n')
  writeFileSync(outsidePath, '{"location":"outside"}\n')

  const insideRelative = relative(ROOT, insidePath)
  assert.deepEqual(readDraft([insideRelative]), { location: 'inside' })
  assert.deepEqual(withArgv(['--input', insideRelative], () => readJsonInput()), { location: 'inside' })

  assert.throws(() => readDraft(['../../outside.json']))
  assert.throws(() => readDraft([outsidePath]))
  assert.throws(() => withArgv(['--input', outsidePath], () => readJsonInput()))
}

function testStdinInput() {
  const moduleUrl = pathToFileURL(join(ROOT, '.synergy', 'skill', 'catalog-data', 'scripts', 'lib', 'pipeline-cli.mjs')).href
  const script = `import { readJsonInput } from ${JSON.stringify(moduleUrl)}; process.stdout.write(JSON.stringify(readJsonInput()))`
  const proc = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: ROOT,
    input: '{"location":"stdin"}\n',
    encoding: 'utf8',
  })
  assert.equal(proc.status, 0, proc.stderr)
  assert.deepEqual(JSON.parse(proc.stdout), { location: 'stdin' })
}

function testWalkerRejectsDirectorySymlink() {
  const root = fixtureDir('walker-directory-link')
  const outside = join(outsideTemp, 'walker-directory-target')
  mkdirSync(outside)
  writeFileSync(join(outside, 'outside.md'), 'outside\n')
  const link = join(root, 'linked-directory')
  symlinkSync(outside, link, 'dir')
  assert.throws(() => listFiles(root), (error) => error.message.includes(link))
}

function testWalkerRejectsSymlinkLoop() {
  const root = fixtureDir('walker-loop')
  const nested = join(root, 'nested')
  mkdirSync(nested)
  const link = join(nested, 'loop')
  symlinkSync(root, link, 'dir')
  assert.throws(() => listFiles(root), (error) => error.message.includes(link))
}

function testWalkerRejectsFileSymlink() {
  const root = fixtureDir('walker-file-link')
  const outside = join(outsideTemp, 'walker-file-target.md')
  writeFileSync(outside, 'outside\n')
  const link = join(root, 'linked.md')
  symlinkSync(outside, link, 'file')
  assert.throws(() => listFiles(root), (error) => error.message.includes(link))
}

function testWriteRejectsFileSymlink() {
  const root = fixtureDir('write-file-link')
  const outside = join(outsideTemp, 'write-file-target.json')
  writeFileSync(outside, '{"outside":true}\n')
  const link = join(root, 'linked.json')
  symlinkSync(outside, link, 'file')

  assert.throws(() => writeTextAtomic(link, '{"unsafe":true}\n', root), (error) => error.message.includes(link))
  assert.equal(readFileSync(outside, 'utf8'), '{"outside":true}\n')
}

function testPublishingCleanupDoesNotDeleteOutside() {
  const docsRoot = fixtureDir('publishing-cleanup')
  const outside = join(outsideTemp, 'publishing-cleanup-target')
  mkdirSync(outside)
  const outsidePage = join(outside, 'keep.md')
  writeFileSync(outsidePage, 'keep\n')
  const link = join(docsRoot, 'linked-docs')
  symlinkSync(outside, link, 'dir')

  assert.throws(() => cleanGeneratedMarkdown(new Map(), docsRoot), (error) => error.message.includes(link))
  assert.equal(readFileSync(outsidePage, 'utf8'), 'keep\n')
}

function testFormatDoesNotWriteOutside() {
  const catalogRoot = fixtureDir('format-catalog')
  const outside = join(outsideTemp, 'format-target.yaml')
  writeFileSync(outside, 'name: outside\n')
  const link = join(catalogRoot, 'linked.yaml')
  symlinkSync(outside, link, 'file')

  assert.throws(() => formatCatalog(catalogRoot), (error) => error.message.includes(link))
  assert.equal(readFileSync(outside, 'utf8'), 'name: outside\n')
}

function testWriteRejectsReplacedMissingAncestor() {
  const root = fixtureDir('write-race')
  const outside = join(outsideTemp, 'write-race-target')
  mkdirSync(outside)
  const target = join(root, 'missing', 'nested', 'record.json')
  assertSafeContainedPathForWrite(root, target)
  rmSync(join(root, 'missing'), { recursive: true })
  symlinkSync(outside, join(root, 'missing'), 'dir')

  assert.throws(() => writeTextAtomic(target, '{"unsafe":true}\n', root), /Symbolic link is not allowed/)
  assert.equal(existsSync(join(outside, 'nested', 'record.json')), false)
}

function testLegalDirectoryOperations() {
  const root = fixtureDir('legal-directory')
  const yamlPath = join(root, 'nested', 'record.yaml')
  const jsonlPath = join(root, 'nested', 'rows.jsonl')
  writeTextAtomic(yamlPath, 'name: legal\n', root)
  writeTextAtomic(jsonlPath, '{"ok":true}\n', root)
  assert.deepEqual(listFiles(root, (path) => path.endsWith('.yaml') || path.endsWith('.jsonl')), [jsonlPath, yamlPath].sort())
  assert.equal(formatCatalog(root), 2)
  assert.equal(readFileSync(yamlPath, 'utf8'), 'name: legal\n')
  assert.equal(readFileSync(jsonlPath, 'utf8'), '{"ok":true}\n')
}

function fixtureDir(name) {
  const path = join(workspaceTemp, name)
  mkdirSync(path)
  return path
}

function withArgv(args, callback) {
  const previous = process.argv
  process.argv = [previous[0], previous[1], ...args]
  try {
    return callback()
  } finally {
    process.argv = previous
  }
}
