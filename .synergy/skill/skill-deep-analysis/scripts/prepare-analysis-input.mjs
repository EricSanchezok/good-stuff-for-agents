#!/usr/bin/env node
import { relative } from 'node:path'
import { ROOT } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { option, printResult } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import {
  ANALYSIS_DISPATCH_INSTRUCTIONS,
  createAnalyzerInput,
  loadAnalysisDispatch,
} from './lib/analysis-dispatch.mjs'

const dispatch = loadAnalysisDispatch(option('--dispatch'))
const response = await fetch(dispatch.envelope.binding.raw_url, {
  headers: { Accept: 'text/plain', 'User-Agent': 'skill-intelligence-catalog' },
  redirect: 'error',
})
if (!response.ok) throw new Error(`bound artifact fetch failed ${response.status}`)
const content = Buffer.from(await response.arrayBuffer())
const analyzerInput = createAnalyzerInput(content, dispatch.envelope)

printResult({
  prompt: ANALYSIS_DISPATCH_INSTRUCTIONS,
  dispatch_path: relative(ROOT, dispatch.path).split('\\').join('/'),
  analyzer_input: analyzerInput,
})
