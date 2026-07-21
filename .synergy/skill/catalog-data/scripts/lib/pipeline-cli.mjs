import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveWithin, ROOT } from './catalog-lib.mjs'

export function option(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

export function hasFlag(name) {
  return process.argv.includes(name)
}

export function positional() {
  const out = []
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i]
    if (arg.startsWith('--')) {
      if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) i += 1
      continue
    }
    out.push(arg)
  }
  return out
}

export function readJsonInput(defaultValue = null) {
  const inputPath = option('--input') ?? positional()[0]
  if (inputPath) return JSON.parse(readFileSync(resolveWithin(ROOT, inputPath), 'utf8'))
  try {
    if (!process.stdin.isTTY) {
      const text = readFileSync(0, 'utf8').trim()
      if (text) return JSON.parse(text)
    }
  } catch (error) {
    if (error.code !== 'EAGAIN') throw error
  }
  return defaultValue
}

export function readJsonl(path) {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
}

export function catalogData(scriptName, draft, extraArgs = []) {
  const script = join(ROOT, '.synergy', 'skill', 'catalog-data', 'scripts', scriptName)
  const proc = spawnSync(process.execPath, [script, ...extraArgs], {
    input: JSON.stringify(draft),
    encoding: 'utf8',
  })
  if (proc.status !== 0) {
    throw new Error(`${scriptName} failed:\n${proc.stderr || proc.stdout}`)
  }
  const text = proc.stdout.trim()
  return text ? JSON.parse(text) : null
}

export function runScript(relativeScript, args = []) {
  const proc = spawnSync(process.execPath, [join(ROOT, relativeScript), ...args], { encoding: 'utf8' })
  if (proc.status !== 0) throw new Error(`${relativeScript} failed:\n${proc.stderr || proc.stdout}`)
  return proc.stdout.trim()
}

export function printResult(result) {
  console.log(JSON.stringify(result, null, 2))
}
