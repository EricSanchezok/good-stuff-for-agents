#!/usr/bin/env node
import { validateFulfillmentAssessment } from './lib/issue-fulfillment.mjs'

const chunks = []
for await (const chunk of process.stdin) chunks.push(chunk)

let payload
try {
  payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
} catch (error) {
  respond(false, [`input must be valid JSON: ${error.message}`], 2)
}

const errors = validateFulfillmentAssessment({
  intake: payload?.intake,
  assessment: payload?.assessment,
  evidenceIndex: payload?.evidence_index,
})
respond(errors.length === 0, errors, errors.length === 0 ? 0 : 2)

function respond(ok, errors, exitCode) {
  process.stdout.write(`${JSON.stringify({ ok, errors }, null, 2)}\n`)
  process.exit(exitCode)
}
