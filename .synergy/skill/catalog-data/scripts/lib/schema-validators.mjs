import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_ROOT = join(__dirname, '..', '..', 'references', 'schemas')

function loadSchema(relPath) {
  try {
    return JSON.parse(readFileSync(join(SCHEMA_ROOT, relPath), 'utf8'))
  } catch (e) {
    if (e?.code === 'ENOENT') return null
    throw e
  }
}

// --- Schema shorthand loaders ---
export const analysisSchemaV2 = loadSchema('v2/analysis.schema.json')
export const relationSchemaV2 = loadSchema('v2/relation.schema.json')
export const packSchemaV3 = loadSchema('v3/pack.schema.json')
export const evaluationSchemaV2 = loadSchema('v2/evaluation.schema.json')
export const issueAssessmentSchemaV1 = loadSchema('v2/issue-assessment.schema.json')
export const issueResponseLedgerSchemaV1 = loadSchema('v2/issue-response-ledger.schema.json')

// --- Current v3 Nightly schemas (Blueprint) ---
export const runContextSchemaV3 = loadSchema('v3/run-context.schema.json')
export const phaseEventSchemaV3 = loadSchema('v3/phase-event.schema.json')
export const gateResultSchemaV3 = loadSchema('v3/gate-result.schema.json')
export const sealSchemaV3 = loadSchema('v3/seal.schema.json')
export const auditReceiptSchemaV3 = loadSchema('v3/audit-receipt.schema.json')
export const terminalSchemaV3 = loadSchema('v3/terminal.schema.json')
export const runLedgerSchemaV3 = loadSchema('v3/run-ledger.schema.json')
export const runSummarySchemaV3 = loadSchema('v3/run-summary.schema.json')
export const sealManifestSchemaV3 = loadSchema('v3/seal-manifest.schema.json')
export const canonicalIssueResponseSchemaV3 = loadSchema('v3/canonical-issue-response.schema.json')

// --- Lightweight structural validation (not full JSON Schema) ---
// Validates required structure, types, patterns, and enums per schema contracts.
// Does not attempt full $ref/$defs resolution; validates against known shapes.

export function validateAgainstSchema(record, schema) {
  const errors = []
  const warnings = []

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    errors.push('record must be a non-null object')
    return { ok: false, errors, warnings }
  }

  // schema_version must match
  if (schema.properties?.schema_version?.const !== undefined) {
    const expected = schema.properties.schema_version.const
    if (record.schema_version !== expected) {
      errors.push(`schema_version must be ${expected}, got ${JSON.stringify(record.schema_version)}`)
    }
  }

  // required fields
  for (const key of (schema.required || [])) {
    if (!(key in record)) {
      errors.push(`missing required field: ${key}`)
    }
  }

  // additionalProperties check
  if (schema.additionalProperties === false && schema.properties) {
    const allowed = new Set(Object.keys(schema.properties))
    for (const key of Object.keys(record)) {
      if (!allowed.has(key)) {
        errors.push(`unknown field: ${key}`)
      }
    }
  }

  // property type/pattern/enum checks
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (!(key in record)) continue
      const value = record[key]
      checkProperty(key, value, prop, errors, schema)
    }
  }

  // Root-level allOf conditional required checks and property enum constraints
  if (schema.allOf) {
    for (const cond of schema.allOf) {
      if (cond.if?.properties) {
        const ifMatch = Object.entries(cond.if.properties).every(
          ([k, p]) => record[k] !== undefined && (
            (p.const !== undefined && matchConst(record[k], p.const)) ||
            (Array.isArray(p.enum) && p.enum.includes(record[k]))
          )
        )
        if (ifMatch) {
          if (cond.then?.required) {
            for (const rk of cond.then.required) {
              if (!(rk in record)) {
                errors.push(`conditional required: "${rk}" is required (${JSON.stringify(cond.if.properties)})`)
              }
            }
          }
          if (cond.then?.properties) {
            for (const [pk, pv] of Object.entries(cond.then.properties)) {
              if (pk in record) {
                if (pv.enum && !pv.enum.includes(record[pk])) {
                  errors.push(`conditional: ${pk} must be in [${pv.enum}], got ${JSON.stringify(record[pk])}`)
                }
                if (pv.const !== undefined && record[pk] !== pv.const) {
                  errors.push(`conditional: ${pk} must be ${JSON.stringify(pv.const)}, got ${JSON.stringify(record[pk])}`)
                }
              } else {
                errors.push(`conditional: ${pk} missing for branch ${JSON.stringify(cond.if.properties)}`)
              }
            }
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

function checkProperty(key, value, prop, errors, rootSchema) {
  // Resolve $ref
  if (prop.$ref) {
    const refSchema = resolveRef(rootSchema, prop.$ref)
    if (refSchema) {
      checkProperty(key, value, refSchema, errors, rootSchema)
      return
    }
  }

  const type = prop.type
  if (!type) return

  if (Array.isArray(type)) {
    if (!type.some((t) => checkType(value, t))) {
      errors.push(`${key}: expected one of types ${JSON.stringify(type)}, got ${typeof value}`)
    }
    return
  }

  if (!checkType(value, type)) {
    errors.push(`${key}: expected type ${type}, got ${typeof value}`)
    return
  }

  if (value === null || value === undefined) return

  if (prop.pattern && typeof value === 'string') {
    // Schema patterns are used with RegExp.test() semantics (match anywhere).
    // Patterns may include ^ for start anchoring but typically not $.
    const re = new RegExp(prop.pattern)
    if (!re.test(value)) {
      errors.push(`${key}: "${value}" does not match pattern ${prop.pattern}`)
    }
  }
  if (prop.enum && !prop.enum.includes(value)) {
    errors.push(`${key}: "${value}" is not in enum [${prop.enum.join(', ')}]`)
  }
  if (prop.minLength !== undefined && typeof value === 'string' && value.length < prop.minLength) {
    errors.push(`${key}: min length ${prop.minLength}, got ${value.length}`)
  }
  if (prop.minItems !== undefined && Array.isArray(value) && value.length < prop.minItems) {
    errors.push(`${key}: min items ${prop.minItems}, got ${value.length}`)
  }
  if (prop.minimum !== undefined && typeof value === 'number' && value < prop.minimum) {
    errors.push(`${key}: minimum ${prop.minimum}, got ${value}`)
  }
  if (prop.maximum !== undefined && typeof value === 'number' && value > prop.maximum) {
    errors.push(`${key}: maximum ${prop.maximum}, got ${value}`)
  }

  // Recurse into array items if items schema exists
  if (prop.items && Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      checkProperty(`${key}[${i}]`, value[i], prop.items, errors, rootSchema)
    }
  }

  // Recurse into object properties
  if (prop.properties && typeof value === 'object' && !Array.isArray(value)) {
    for (const [subKey, subProp] of Object.entries(prop.properties)) {
      if (subKey in value) {
        checkProperty(`${key}.${subKey}`, value[subKey], subProp, errors, rootSchema)
      } else if (prop.required?.includes(subKey)) {
        errors.push(`${key}.${subKey}: missing required field`)
      }
    }
    // additionalProperties check for sub-objects
    if (prop.additionalProperties === false) {
      const allowedSub = new Set(Object.keys(prop.properties))
      for (const subKey of Object.keys(value)) {
        if (!allowedSub.has(subKey)) {
          errors.push(`${key}.${subKey}: unknown field`)
        }
      }
    }
  }

  // Check conditional allOf branches
  if (prop.allOf) {
    for (const cond of prop.allOf) {
      if (cond.if?.properties) {
        const ifMatch = Object.entries(cond.if.properties).every(
          ([k, p]) => value[k] !== undefined && matchConst(value[k], p.const)
        )
        if (ifMatch && cond.then?.required) {
          for (const rk of cond.then.required) {
            if (!(rk in value)) {
              errors.push(`${key}.${rk}: missing required field for conditional branch`)
            }
          }
        }
      }
    }
  }
}

function checkType(value, type) {
  if (type === 'null') return value === null
  if (type === 'array') return Array.isArray(value)
  if (type === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value)
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value)
  return typeof value === type
}

function resolveRef(schema, ref) {
  if (!ref) return null
  // Handle local $defs references: #/$defs/claim
  const match = ref.match(/^#\/\$defs\/(.+)$/)
  if (match && schema?.$defs) {
    return schema.$defs[match[1]] || null
  }
  return null
}

function matchConst(value, expected) {
  return value === expected
}

// --- Fixture builders ---

export function buildAnalysisV2(overrides = {}) {
  return {
    schema_version: 2,
    analysis_id: 'anl_test-valid_20000001',
    skill_id: 'skl_test-fixture-a_20000001',
    source_hash: 'sha256:abcdef1234567890',
    analysis_version: 1,
    claims: {
      requires: {
        required: [
          { claim_id: 'clm_req_001', content: 'Requires Python 3.10+', required: true },
        ],
        optional: [
          { claim_id: 'clm_opt_001', content: 'Nice to have git installed' },
        ],
      },
      produces: [
        { claim_id: 'clm_prd_001', content: 'Produces a validated JSON output' },
      ],
      preconditions: [
        { claim_id: 'clm_pre_001', content: 'Input must be valid UTF-8', severity: 'critical' },
      ],
      refusal: [
        { claim_id: 'clm_ref_001', content: 'Refuses when input is binary', severity: 'high' },
      ],
      failure_warnings: [
        { claim_id: 'clm_fw_001', content: 'May time out on large inputs', severity: 'medium' },
      ],
      tool_constraints: [
        { claim_id: 'clm_tc_001', content: 'No network access required', required: true },
      ],
      alternatives: [
        { claim_id: 'clm_alt_001', content: 'Alternative: use jq for simple cases' },
      ],
      judgement: [
        { claim_id: 'clm_jud_001', content: 'Well-structured and reliable for its domain' },
      ],
    },
    confidence: 'high',
    updated_at: '2026-07-27T12:00:00Z',
    created_by_run: 'run_fixture-test_20000001',
    notes: 'Test fixture',
    ...overrides,
  }
}

export function buildRelationV2(predicate = 'chains_with', overrides = {}) {
  const base = {
    schema_version: 2,
    relation_id: 'rel_test-valid_20000001',
    predicate,
    subject: 'skl_test-producer_20000001',
    object: 'skl_test-consumer_20000001',
    weight: 0.85,
    evidence: 'Test evidence for chains_with relation',
    created_at: '2026-07-27T12:00:00Z',
    created_by_run: 'run_fixture-test_20000001',
  }

  switch (predicate) {
    case 'chains_with':
      base.chains_with = {
        producer_skill: 'skl_test-producer_20000001',
        consumer_skill: 'skl_test-consumer_20000001',
        producer_claim_id: 'clm_prd_001',
        consumer_claim_id: 'clm_req_001',
        direction: 'sequential',
        description: 'Producer feeds consumer via artifact handoff',
      }
      break
    case 'strengthens':
      base.strengthens = {
        strengthening_skill: 'skl_test-boost_20000001',
        strengthened_skill: 'skl_test-base_20000001',
        reason: 'Boosts output quality with post-processing',
        is_required_handoff: false,
      }
      break
    case 'alternatives':
      base.alternatives = {
        candidate_a: 'skl_test-option-a_20000001',
        candidate_b: 'skl_test-option-b_20000001',
        disposition: 'contextual',
        context_note: 'Depends on input size',
      }
      break
    case 'conflicts_with':
      base.conflicts_with = {
        skill_a: 'skl_test-conflict-a_20000001',
        skill_b: 'skl_test-conflict-b_20000001',
        disposition: 'mutually_exclusive',
        mitigation_note: 'Do not use in same workflow',
      }
      break
  }

  return { ...base, ...overrides }
}

export function buildPackV3(overrides = {}) {
  return {
    schema_version: 3,
    pack_id: 'pack_test-valid_20000001',
    name: 'Test Pack v3',
    status: 'candidate',
    intent: 'Validate pack v3 DAG contract',
    domain: 'testing',
    version: '1.0.0',
    description: 'A valid pack v3 fixture with linear DAG',
    members: [
      { skill_id: 'skl_test-producer_20000001', version_id: 'v1', role: 'entry', inclusion_reason: 'Produces initial artifact' },
      { skill_id: 'skl_test-consumer_20000001', version_id: 'v1', role: 'processor', inclusion_reason: 'Consumes and transforms' },
    ],
    excluded: [],
    workflow: {
      nodes: [
        {
          node_id: 'n1',
          type: 'task',
          member_ids: ['skl_test-producer_20000001'],
          label: 'Produce',
          entry_contract: {
            required_claim_ids: [],
            precondition_claim_ids: [],
            refusal_claim_ids: [],
            tool_constraint_claim_ids: [],
            description: 'User prompt or structured input',
          },
          output_contract: {
            produces_claim_ids: ['clm_prd_001'],
            description: 'Intermediate artifact',
          },
        },
        {
          node_id: 'n2',
          type: 'task',
          member_ids: ['skl_test-consumer_20000001'],
          label: 'Consume',
          entry_contract: {
            required_claim_ids: [],
            precondition_claim_ids: [],
            refusal_claim_ids: [],
            tool_constraint_claim_ids: [],
            description: 'Receives intermediate result',
          },
          output_contract: {
            produces_claim_ids: [],
            description: 'Final result',
          },
        },
      ],
      edges: [
        {
          edge_id: 'e1',
          from_node: 'n1',
          to_node: 'n2',
          direction: 'sequential',
          artifact_handoff: {
            relation_id: 'rel_test-valid_20000001',
            producer_skill_id: 'skl_test-producer_20000001',
            producer_claim_id: 'clm_prd_001',
            consumer_skill_id: 'skl_test-consumer_20000001',
            consumer_claim_id: 'clm_req_001',
            produced: 'intermediate result',
            consumed_as: 'input',
          },
        },
      ],
      entry_roots: ['n1'],
      terminal_sinks: ['n2'],
    },
    compatibility: {
      notes: 'Test pack v3 compatibility notes',
      chains: [
        { relation_id: 'rel_test-valid_20000001', state: 'used', disposition: 'required', claim_ids: ['clm_prd_001', 'clm_req_001'] },
      ],
      strengthens: [],
      alternatives: [],
      conflicts: [],
    },
    evidence: {
      analysis_ids: ['anl_test-valid_20000001'],
      relation_ids: ['rel_test-valid_20000001'],
    },
    mitigation: [],
    artifact_mapping: [
      { node_id: 'n1', claim_id: 'clm_prd_001', artifact: 'intermediate.json', description: 'Produced by entry node' },
      { node_id: 'n2', artifact: 'final.json', description: 'Produced by terminal node' },
    ],
    created_by_run: 'run_fixture-test_20000001',
    updated_at: '2026-07-27T12:00:00Z',
    ...overrides,
  }
}

export function buildPackV3FanIn(overrides = {}) {
  return {
    schema_version: 3,
    pack_id: 'pack_test-fan-in_20000001',
    name: 'Test Pack Fan-In',
    status: 'candidate',
    intent: 'Validate fan-in DAG topology',
    domain: 'testing',
    version: '1.0.0',
    description: 'A pack with parallel fan-in DAG shape: 3 upstream nodes merge into 1',
    members: [
      { skill_id: 'skl_test-a_20000001', version_id: 'v1', role: 'source_a', inclusion_reason: 'Source A' },
      { skill_id: 'skl_test-b_20000001', version_id: 'v1', role: 'source_b', inclusion_reason: 'Source B' },
      { skill_id: 'skl_test-c_20000001', version_id: 'v1', role: 'source_c', inclusion_reason: 'Source C' },
      { skill_id: 'skl_test-merger_20000001', version_id: 'v1', role: 'merger', inclusion_reason: 'Merges parallel outputs' },
    ],
    excluded: [],
    workflow: {
      nodes: [
        { node_id: 'n_a', type: 'task', member_ids: ['skl_test-a_20000001'], label: 'Source A', entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'Input A' }, output_contract: { produces_claim_ids: [], description: 'Result A' } },
        { node_id: 'n_b', type: 'task', member_ids: ['skl_test-b_20000001'], label: 'Source B', entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'Input B' }, output_contract: { produces_claim_ids: [], description: 'Result B' } },
        { node_id: 'n_c', type: 'task', member_ids: ['skl_test-c_20000001'], label: 'Source C', entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'Input C' }, output_contract: { produces_claim_ids: [], description: 'Result C' } },
        {
          node_id: 'n_merge',
          type: 'fan_in',
          member_ids: ['skl_test-merger_20000001'],
          label: 'Merge',
          fan_config: { strategy: 'merge' },
          entry_contract: { required_claim_ids: [], precondition_claim_ids: [], refusal_claim_ids: [], tool_constraint_claim_ids: [], description: 'Receives from A, B, C' },
          output_contract: { produces_claim_ids: [], description: 'Merged result' },
        },
      ],
      edges: [
        { edge_id: 'ea', from_node: 'n_a', to_node: 'n_merge', direction: 'fan_in', artifact_handoff: { relation_id: 'rel_test-fan-a_20000001', producer_skill_id: 'skl_test-a_20000001', producer_claim_id: 'clm_prd_a', consumer_skill_id: 'skl_test-merger_20000001', consumer_claim_id: 'clm_req_a', produced: 'result_a', consumed_as: 'input_a' } },
        { edge_id: 'eb', from_node: 'n_b', to_node: 'n_merge', direction: 'fan_in', artifact_handoff: { relation_id: 'rel_test-fan-b_20000001', producer_skill_id: 'skl_test-b_20000001', producer_claim_id: 'clm_prd_b', consumer_skill_id: 'skl_test-merger_20000001', consumer_claim_id: 'clm_req_b', produced: 'result_b', consumed_as: 'input_b' } },
        { edge_id: 'ec', from_node: 'n_c', to_node: 'n_merge', direction: 'fan_in', artifact_handoff: { relation_id: 'rel_test-fan-c_20000001', producer_skill_id: 'skl_test-c_20000001', producer_claim_id: 'clm_prd_c', consumer_skill_id: 'skl_test-merger_20000001', consumer_claim_id: 'clm_req_c', produced: 'result_c', consumed_as: 'input_c' } },
      ],
      entry_roots: ['n_a', 'n_b', 'n_c'],
      terminal_sinks: ['n_merge'],
    },
    compatibility: { notes: 'Fan-in test', chains: [{ relation_id: 'rel_test-fan-a_20000001', state: 'used', disposition: 'required' }, { relation_id: 'rel_test-fan-b_20000001', state: 'used', disposition: 'required' }, { relation_id: 'rel_test-fan-c_20000001', state: 'used', disposition: 'required' }], strengthens: [], alternatives: [], conflicts: [] },
    evidence: { analysis_ids: [], relation_ids: ['rel_test-fan-a_20000001', 'rel_test-fan-b_20000001', 'rel_test-fan-c_20000001'] },
    mitigation: [],
    artifact_mapping: [
      { node_id: 'n_merge', artifact: 'merged.json', description: 'Final merged artifact' },
    ],
    created_by_run: 'run_fixture-test_20000001',
    updated_at: '2026-07-27T12:00:00Z',
    ...overrides,
  }
}

export function buildEvaluationV2(overrides = {}) {
  return {
    schema_version: 2,
    evaluation_id: 'eval_test-valid_20000001',
    synthesis_session_id: 'synth_test-valid_20000001',
    evaluation_session_id: 'evalses_test-valid_20000001',
    pack_id: 'pack_test-valid_20000001',
    metrics: {
      relevance: { score: 0.85 },
      coverage: { score: 0.80 },
      non_redundancy: { score: 0.90 },
      workflow_coherence: { score: 0.88 },
      compatibility: { score: 0.82 },
      conflict_control: { score: 0.95 },
      evidence_quality: { score: 0.75 },
      actionability: { score: 0.80 },
      freshness: { score: 0.78 },
      source_quality: { score: 0.85 },
    },
    blockers: [],
    checked_claim_ids: ['clm_prd_001', 'clm_req_001'],
    warnings: [],
    proof_digest: 'sha256:0000000000000000000000000000000000000000000000000000000000000001',
    decision: {
      passed: true,
      level: 'passed',
      reason: 'All metrics above MIN-gate threshold, no blockers',
      min_metric: 0.75,
      blocker_count: 0,
    },
    created_by_run: 'run_fixture-test_20000001',
    created_at: '2026-07-27T12:00:00Z',
    ...overrides,
  }
}

export function buildIssueAssessment(overrides = {}) {
  return {
    schema_version: 1,
    assessment_id: 'asm_n42_0123456789abcdef',
    assessment_digest: `sha256:${'1'.repeat(64)}`,
    issue_number: 42,
    repository: { owner: 'EricSanchezok', repo: 'good-stuff-for-agents' },
    issue_title: 'Add support for new skill format',
    content_digest: `sha256:${'2'.repeat(64)}`,
    updated_at_bound: '2026-07-27T10:00:00Z',
    classification: {
      kind: 'skill_request',
      criteria: [
        { criterion_id: 'criterion-1', text: 'Provide the requested capability.', status: 'unsatisfied' },
      ],
    },
    fulfillment_state: 'not_started',
    public_evidence: {
      boundary: 'Published catalog skills and packs only',
      related_entities: [
        {
          entity_type: 'skill',
          entity_id: 'skl_test-a_20000001',
          path: 'catalog/skills/records/te/skl_test-a_20000001.yaml',
        },
      ],
    },
    gap_criteria: [
      { criterion_id: 'criterion-1', text: 'Provide the requested capability.' },
    ],
    assessed_at: '2026-07-27T12:00:00Z',
    assessed_by_run: 'run_fixture-test_20000001',
    ...overrides,
  }
}

export function buildIssueResponseLedger(overrides = {}) {
  return {
    schema_version: 1,
    response_id: 'rsp_n42_0123456789abcdef_draft',
    assessment_id: 'asm_n42_0123456789abcdef',
    assessment_digest: `sha256:${'1'.repeat(64)}`,
    repository: 'EricSanchezok/good-stuff-for-agents',
    issue_number: 42,
    template_version: 'issue-factual-v1',
    response_state: 'draft',
    comment_id: null,
    dedup_fingerprint: `sha256:${'3'.repeat(64)}`,
    toctou_state: {
      checked_at: '2026-07-27T12:00:00Z',
      issue_updated_at: '2026-07-27T10:00:00Z',
      staleness: 'current',
      bound_digest: `sha256:${'2'.repeat(64)}`,
      current_digest: `sha256:${'2'.repeat(64)}`,
    },
    created_at: '2026-07-27T12:00:00Z',
    created_by_run: 'run_fixture-test_20000001',
    ...overrides,
  }
}

// Old schema v1 fixtures that should be rejected by v2/v3 validators
export function buildAnalysisV1() {
  return {
    schema_version: 1,
    skill_id: 'skl_test-old_20000001',
    source_hash: 'sha256:old',
    analysis_version: 1,
    confidence: 'high',
    updated_at: '2026-07-27T12:00:00Z',
  }
}

export function buildRelationV1() {
  return {
    schema_version: 1,
    subject: 'skl_a',
    predicate: 'complements',
    object: 'skl_b',
    weight: 0.8,
    evidence: 'old evidence',
    source: 'test',
    created_at: '2026-07-27T12:00:00Z',
  }
}

export function buildPackV2() {
  return {
    schema_version: 2,
    pack_id: 'pack_test-old_20000001',
    name: 'Old Pack v2',
    status: 'candidate',
    intent: 'Old pack',
    domain: 'testing',
    created_by_run: 'run_old',
    version: '1.0.0',
    members: [
      { skill_id: 'skl_a', version_id: 'v1', role: 'core', stage: 's1', inclusion_reason: 'test' },
      { skill_id: 'skl_b', version_id: 'v1', role: 'core', stage: 's2', inclusion_reason: 'test' },
    ],
    excluded: [],
    workflow: {
      entry: { description: 'Start', input_contract: 'In' },
      terminal: { description: 'End', output_contract: 'Out' },
      stages: [
        {
          stage_id: 's1', name: 'Stage 1', description: 'First',
          member_ids: ['skl_a'],
          handoffs: [{ from_stage: 's1', from_skill: 'skl_a', to_stage: 's2', to_skill: 'skl_b', produced_artifact: 'x', consumed_as: 'y' }],
        },
        {
          stage_id: 's2', name: 'Stage 2', description: 'Second',
          member_ids: ['skl_b'],
          handoffs: [],
        },
      ],
      branches: [],
    },
    compatibility: { notes: 'ok', chains: [], strengthens: [], alternatives: [], conflicts: [], unresolved: [] },
    evidence: { analysis_paths: [], relation_edges: [] },
    evaluation: { evaluation_id: null, score: null, status: 'candidate' },
    updated_at: '2026-07-27T12:00:00Z',
  }
}

export function buildEvaluationV1() {
  return {
    schema_version: 1,
    evaluation_id: 'eval_test-old_20000001',
    output_id: 'pack_test-old_20000001',
    kind: 'pack',
    metrics: {},
    overall_score: 0.9,
    passed: true,
    failure_modes: [],
    recommendations: [],
    created_at: '2026-07-27T12:00:00Z',
  }
}
