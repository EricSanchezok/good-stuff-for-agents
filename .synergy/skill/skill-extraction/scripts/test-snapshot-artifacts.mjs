#!/usr/bin/env node
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadLatestSnapshotArtifacts } from './lib/snapshot-artifacts.mjs'

const temp = mkdtempSync(join(tmpdir(), 'skill-extraction-snapshots-'))

try {
  testValidSnapshots()
  testDirectorySymlink()
  testFileSymlink()
  testSymlinkLoop()
  console.log('skill extraction snapshot tests passed')
} finally {
  rmSync(temp, { recursive: true, force: true })
}

function testValidSnapshots() {
  const root = fixtureDir('valid')
  const nested = join(root, 'nested')
  mkdirSync(nested)
  writeSnapshot(join(root, 'older.json'), 'src_fixture', '2026-07-20T00:00:00.000Z', 'skills/older/SKILL.md')
  writeSnapshot(join(nested, 'latest.json'), 'src_fixture', '2026-07-21T00:00:00.000Z', 'skills/latest/SKILL.md')
  writeSnapshot(join(root, 'other.json'), 'src_other', '2026-07-19T00:00:00.000Z', 'skills/other/SKILL.md')
  writeFileSync(join(root, 'ignored.txt'), '{}\n')

  assert.deepEqual(loadLatestSnapshotArtifacts(root), [
    artifact('src_fixture', 'skills/latest/SKILL.md'),
    artifact('src_other', 'skills/other/SKILL.md'),
  ])
  assert.deepEqual(loadLatestSnapshotArtifacts(root, 'src_fixture'), [artifact('src_fixture', 'skills/latest/SKILL.md')])
}

function testDirectorySymlink() {
  const root = fixtureDir('directory-link')
  const outside = fixtureDir('directory-link-outside')
  writeSnapshot(join(outside, 'outside.json'), 'src_outside', '2026-07-21T00:00:00.000Z', 'skills/outside/SKILL.md')
  const link = join(root, 'linked')
  symlinkSync(outside, link, 'dir')

  assert.throws(() => loadLatestSnapshotArtifacts(root), (error) => error.message.includes(link))
}

function testFileSymlink() {
  const root = fixtureDir('file-link')
  const outside = join(fixtureDir('file-link-outside'), 'outside.json')
  writeSnapshot(outside, 'src_outside', '2026-07-21T00:00:00.000Z', 'skills/outside/SKILL.md')
  const link = join(root, 'linked.json')
  symlinkSync(outside, link, 'file')

  assert.throws(() => loadLatestSnapshotArtifacts(root), (error) => error.message.includes(link))
}

function testSymlinkLoop() {
  const root = fixtureDir('loop')
  const nested = join(root, 'nested')
  mkdirSync(nested)
  const link = join(nested, 'loop')
  symlinkSync(root, link, 'dir')

  assert.throws(() => loadLatestSnapshotArtifacts(root), (error) => error.message.includes(link))
}

function writeSnapshot(path, sourceId, checkedAt, artifactPath) {
  writeFileSync(path, JSON.stringify({
    schema_version: 1,
    source_id: sourceId,
    checked_at: checkedAt,
    artifacts: [artifact(sourceId, artifactPath)],
  }, null, 2) + '\n')
}

function artifact(sourceId, path) {
  return { source_id: sourceId, path }
}

function fixtureDir(name) {
  const path = join(temp, name)
  mkdirSync(path)
  return path
}
