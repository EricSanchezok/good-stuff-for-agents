#!/usr/bin/env node
import { ISSUE_INTAKE_LIMITS, IntakeValidationError, normalizeIssueIntake } from './lib/issue-intake.mjs'

const chunks = []
let inputBytes = 0
let overBudget = false

for await (const chunk of process.stdin) {
  inputBytes += chunk.length
  if (inputBytes > ISSUE_INTAKE_LIMITS.inputBytes) {
    overBudget = true
    break
  }
  chunks.push(chunk)
}

if (overBudget) {
  respond(false, 'rejected_budget', [`input exceeds ${ISSUE_INTAKE_LIMITS.inputBytes} bytes`], null, 2)
}

let payload
try {
  payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
} catch (error) {
  respond(false, 'rejected_schema', [`input must be valid JSON: ${error.message}`], null, 2)
}

try {
  const intake = normalizeIssueIntake(payload, { inputBytes })
  respond(true, 'accepted', [], intake, 0)
} catch (error) {
  if (error instanceof IntakeValidationError) {
    respond(false, error.status, error.errors, null, 2)
  }
  respond(false, 'rejected_schema', [error.message], null, 2)
}

function respond(ok, status, errors, intake, exitCode) {
  process.stdout.write(`${JSON.stringify({ ok, status, errors, intake }, null, 2)}\n`)
  process.exit(exitCode)
}
