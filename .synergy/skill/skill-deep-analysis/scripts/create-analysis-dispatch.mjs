#!/usr/bin/env node
import { relative } from 'node:path'
import { ROOT } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { option, printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import {
  ANALYSIS_DISPATCH_INSTRUCTIONS,
  buildBindingForSkill,
  createAnalysisDispatch,
  writeAnalysisDispatch,
} from './lib/analysis-dispatch.mjs'

const runId = option('--run-id')
const skillId = option('--skill-id')
if (!runId || !skillId) throw new Error('Usage: create-analysis-dispatch.mjs --run-id <run_id> --skill-id <skill_id>')

const envelope = createAnalysisDispatch(runId, buildBindingForSkill(skillId))
const path = writeAnalysisDispatch(envelope)
printResult({
  prompt: ANALYSIS_DISPATCH_INSTRUCTIONS,
  dispatch_path: relative(ROOT, path).split('\\').join('/'),
  envelope,
})
