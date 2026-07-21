#!/usr/bin/env node
import { relative } from 'node:path'
import { ROOT } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, option, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'
import { assertDispatchMatchesCatalog, bindSemanticAnalysisDraft, loadAnalysisDispatch } from './lib/analysis-dispatch.mjs'

const input = readJsonInput(null)
const analyses = Array.isArray(input) ? input : input?.analyses ? input.analyses : input ? [input] : []
if (!Array.isArray(analyses) || analyses.length !== 1) throw new Error('Provide exactly one analysis draft per bound dispatch')

const dispatch = loadAnalysisDispatch(option('--dispatch'))
assertDispatchMatchesCatalog(dispatch.envelope)
const analysis = bindSemanticAnalysisDraft(analyses[0], dispatch.envelope)
const dispatchPath = relative(ROOT, dispatch.path).split('\\').join('/')
const record = catalogData('write-analysis.mjs', analysis, ['--dispatch', dispatchPath])

printResult({ written: 1, records: [record] })
