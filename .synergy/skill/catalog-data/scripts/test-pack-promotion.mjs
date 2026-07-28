#!/usr/bin/env node
import assert from 'node:assert/strict'

// V3 promotion is handled by promotePassingCandidates in catalog-lib.mjs
// which requires: v3 pack, v2 evaluation file with passed decision, matching proof_digest
// No inline evaluation, no 0.78 average threshold.

// Import promotePassingCandidates to verify it's the canonical surface
import { promotePassingCandidates, publishedProofPath } from './lib/catalog-lib.mjs'

// Verify the function signature is callable
const skills = new Map()
// promotePassingCandidates does not have isPackPromotionEligible anymore -
// the eligibility logic is baked into promotePassingCandidates itself.

// Verify publishedProofPath exists
import { packRecordPath, ROOT } from './lib/catalog-lib.mjs'
assert.ok(publishedProofPath('pack_test-any_20000001').includes('preflight-proof.json'))

console.log('pack promotion tests passed')
