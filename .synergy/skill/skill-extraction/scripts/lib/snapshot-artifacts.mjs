import { assertSafeContainedPathForDelete, listFiles, readText } from '../../../catalog-data/scripts/lib/catalog-lib.mjs'

export function loadLatestSnapshotArtifacts(snapshotRoot, filterSourceId = null) {
  const manifests = listFiles(snapshotRoot, (path) => path.endsWith('.json'))
    .map((path) => {
      const safePath = assertSafeContainedPathForDelete(snapshotRoot, path, { type: 'file' })
      return JSON.parse(readText(safePath))
    })
    .filter((manifest) => !filterSourceId || manifest.source_id === filterSourceId)
    .sort((left, right) => String(right.checked_at).localeCompare(String(left.checked_at)))
  const latestBySource = new Map()
  for (const manifest of manifests) {
    if (!latestBySource.has(manifest.source_id)) latestBySource.set(manifest.source_id, manifest)
  }
  return [...latestBySource.values()].flatMap((manifest) => manifest.artifacts ?? [])
}
