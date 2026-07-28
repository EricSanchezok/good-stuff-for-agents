#!/usr/bin/env node
import { prepareWorkload } from './lib/normalization-lib.mjs'

const args = process.argv.slice(2)
if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
  console.error('Usage: node prepare-workload.mjs <run-id>')
  console.error('')
  console.error('  run-id  The extraction run ID (e.g. run_2026-07-13-210300)')
  console.error('')
  console.error('  Produces: reports/skill-normalization/<run-id>/workload.json')
  process.exit(args[0] === '--help' || args[0] === '-h' ? 0 : 1)
}

const runId = args[0]

try {
  const { workloadPath, workload } = prepareWorkload(runId)
  console.log(JSON.stringify({
    status: 'ok',
    workload_path: workloadPath,
    workload_digest: workload.workload_digest,
    candidate_count: workload.candidate_count,
    item_count: workload.item_count,
    provenance_blocked_count: workload.provenance_blocked_count,
    input_bindings: workload.input_bindings,
  }, null, 2))
} catch (err) {
  console.error(JSON.stringify({ status: 'error', error: err.message }, null, 2))
  process.exit(1)
}
