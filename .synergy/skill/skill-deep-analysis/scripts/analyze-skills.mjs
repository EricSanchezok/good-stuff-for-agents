#!/usr/bin/env node
import { loadSkillRecords, sha256 } from '../../catalog-data/scripts/lib/catalog-lib.mjs'
import { catalogData, printResult, readJsonInput } from '../../catalog-data/scripts/lib/pipeline-cli.mjs'

const input = readJsonInput(null)
const selected = new Set(input?.skill_ids ?? [])
const skills = loadSkillRecords().map(({ record }) => record).filter((skill) => selected.size === 0 || selected.has(skill.canonical_skill_id))
const analyses = []
for (const skill of skills) {
  analyses.push(catalogData('write-analysis.mjs', {
    skill_id: skill.canonical_skill_id,
    title: skill.display_name,
    source_hash: skill.identity?.current_version_id ?? sha256(JSON.stringify(skill.source ?? {})),
    confidence: skill.quality?.confidence ?? 'unknown',
    sections: {
      core_purpose: `Catalog analysis for ${skill.display_name}.`,
      trigger_semantics: 'Use when the skill trigger semantics match the current task. Missing trigger evidence should lower confidence.',
      capability_breakdown: `Domains: ${(skill.capabilities?.domains ?? []).join(', ') || 'none recorded'}.`,
      workflow_role: `Workflow stages: ${(skill.capabilities?.workflow_stages ?? []).join(', ') || 'none recorded'}.`,
      inputs_outputs: `Inputs: ${(skill.interfaces?.inputs ?? []).join(', ') || 'none recorded'}. Outputs: ${(skill.interfaces?.outputs ?? []).join(', ') || 'none recorded'}.`,
      tool_permission_profile: `Required tools: ${(skill.tools?.required ?? []).join(', ') || 'none recorded'}. Side effect level: ${skill.risk?.side_effect_level ?? 'none'}.`,
      compatibility_notes: 'Compatibility must be checked against relation edges before pack synthesis.',
      conflict_notes: 'No conflicts recorded by this minimal analysis pass.',
      dedupe_notes: 'No duplicate resolution recorded by this minimal analysis pass.',
      evaluation_hooks: 'Evaluate evidence quality, actionability, and tool risk before publishing packs.',
      evidence_confidence: `Confidence: ${skill.quality?.confidence ?? 'unknown'}.`,
    },
  }))
}
printResult({ analyzed: analyses.length, analyses })
