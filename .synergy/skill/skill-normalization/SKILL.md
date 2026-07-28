---
name: skill-normalization
description: Normalize extracted skill candidates into stable canonical identity records. Use when candidates need deterministic skill IDs, source/version mapping, duplicate/update/block decisions, and minimal schema-valid records before deep analysis. Do not perform deep semantic interpretation here.
---

# Skill Normalization SOP

## Invocation Instructions

Additional user instructions for this invocation:

$ARGUMENTS

Treat these as scope refinements only. They do not override safety boundaries, ownership rules, or quality gates in this skill. If empty, follow the SOP as written.

## What You Own

You own identity, provenance, and version stability.

You are the SCP for `canonical_skill_id`, `source_skill_id`, `canonical_name`, `display_name`, `version_id`, and `status`. You derive `canonical_name` and `display_name` from the extraction-provided `declared_name` and this is the only place this derivation happens. For license, you map from sync's license evidence; you do not reinterpret the source license.

Your job is to answer: is this candidate a new canonical skill, an update to an existing skill, a duplicate/variant that needs curation, a rejected artifact, or a blocked artifact? You preserve enough source mapping for downstream deep analysis to read the original content.

You do not own the real semantic interpretation of the skill. Do not decide deep capability meaning, workflow value, tool risk, pack fit, final quality, or whether the skill deserves recommendation. Those judgments belong to `skill-deep-analysis` after it reads the original artifact.

## When To Use This Skill

Use this skill when:

- `catalog/skills/candidates/<run-id>.jsonl` contains reviewed candidates ready for identity normalization;
- a candidate needs deterministic source_skill_id, version_id, and canonical_skill_id mapping;
- an existing skill record needs identity-preserving updates after upstream changes;
- candidate duplicates, variants, rejects, or ambiguous identities need to be reported before canonical write.

## When Not To Use This Skill

Do not use this skill to create candidate shells; use `skill-extraction`. Do not write deep analysis sections; use `skill-deep-analysis`. Do not decide relation edges; use `skill-dedup-relations`. Do not approve questionable merges alone; use `catalog-curation`.

Do not use this skill as mini-analysis. If you find yourself deciding what the skill is good for, what hidden assumptions it makes, what risks it carries in practice, or whether it is high quality, stop. That belongs downstream.

## The One Normalization Route

Normalization uses a two-phase bounded workload: **prepare** produces a deterministic workload with immutable bindings; a semantic agent returns decisions against those bindings; **finalize** validates bindings and writes canonical records. There is no other route.

Phase 1 — prepare:

```bash
node skill/skill-normalization/scripts/prepare-workload.mjs <run-id>
```

- Loads `catalog/skills/candidates/<run-id>.jsonl`, source registry, existing skill records, and snapshot manifests from `catalog/sources/snapshots/`.
- Binds input digests (`candidate_jsonl_digest`, `source_registry_digest`, `existing_records_digest`, `snapshot_manifests_digest`) into the workload for TOCTOU protection.
- Detects duplicate candidate IDs and duplicate source+path combinations within the batch.
- Rejects candidates missing `source_id`, `path`, `content_digest`, `declared_name`, or `candidate_id` into `provenance_blocked` with `terminal: "provenance_blocked"`.
- Resolves every candidate's `provenance` against canonical snapshot manifests. The provenance `artifact_binding` must match exactly one snapshot artifact on source_id, remote_path, pinned_commit, and blob OID/digest. Registry current ref alone is insufficient. Missing, inconsistent, or ambiguous snapshots are `provenance_blocked` with a deterministic reason.
- Computes deterministic identity hints (not decisions), per-item digests, and a workload digest binding all inputs.
- Emits `reports/skill-normalization/<run-id>/workload.json` with immutable bindings.

Phase 2 — review (by semantic agent, NOT by script):

The semantic agent reads the workload and returns a decisions document. Each decision binds to exactly one `item_digest` and must supply `decision` (one of `new`, `update`, `duplicate_needs_curation`, `rejected`, `blocked`) and `reason`. For `new` decisions, the agent must supply `canonical_name` (the reviewed semantic name; the finalizer computes the canonical skill ID from it). The agent may supply `draft_fields.display_name` only; all identity, source, status, and semantic fields are controlled by the finalizer. Unknown keys anywhere in the decisions document are rejected. The decisions file must be placed at `reports/skill-normalization/<run-id>/decisions.json`.

Phase 3 — finalize:

```bash
node skill/skill-normalization/scripts/finalize-workload.mjs --run-id <run-id> [--dry-run]
```

The decisions path is derived from the run-id (`reports/skill-normalization/<run-id>/decisions.json`); it is not accepted as a CLI argument.

- Checks idempotence: if the workload was already finalized with the exact same decisions digest, returns `already_finalized` without mutation. If finalized with different decisions, fails closed.
- Verifies workload digest and all three input bindings (candidate JSONL, source registry, existing records) against current files; rejects if any have drifted.
- Validates every item is covered exactly once, no unknown/stale/duplicate bindings, no controlled or disallowed fields in `draft_fields`, no unknown keys at document or decision level, field size limits enforced.
- Runs preflight: builds all drafts, detects ID collisions, and fails the entire batch before any write.
- `new` decisions write through the canonical `write-skill-record.mjs` with schema-required sparse fields. The canonical skill ID is computed from the reviewed `canonical_name` + `source_id` + `path`.
- `update` decisions preserve every existing curation/analysis/relations/quality/capabilities/interfaces/tools/risk field while updating version, provenance, and `source_skill_ids`. Preserves `created_at` and stable ID.
- `duplicate_needs_curation`, `rejected`, `blocked` leave per-candidate outcome files but no canonical write.
- `provenance_blocked` candidates are included in outcomes with terminal status.
- Writes `reports/skill-normalization/<run-id>/finalization-outcomes.json` with `decisions_digest` for idempotence.

## Inputs You Should Gather First

You should gather:

- candidate JSONL path and run ID;
- source records and snapshot manifests;
- existing skill records that may match the same source path, declared name, content digest, or source_skill_id;
- `references/platform-mapping.md`, `references/normalization-rules.md`, and `references/normalization-quality-gate.md`;
- `../catalog-data/references/identity-rules.md` and schema references;
- shared `artifact-contract.md` and `script-policy.md`.

## Outputs You Must Leave Behind

You must leave behind:

- workload: `reports/skill-normalization/<run-id>/workload.json`
- per-candidate outcome files: `reports/skill-normalization/<run-id>/outcome-<skill-id>.json`
- per-candidate draft files: `reports/skill-normalization/<run-id>/draft-<skill-id>.json`
- finalization summary: `reports/skill-normalization/<run-id>/finalization-outcomes.json`
- canonical skill YAML under `catalog/skills/records/<prefix>/<skill-id>.yaml` written through `write-skill-record.mjs`;
- blocked/duplicate/rejected/unmatched outcome entries recorded in the summary;
- analysis handoff list with skill IDs, source paths, and content digests;
- validation result.

## References To Read

- `references/platform-mapping.md` for explicit platform metadata mapping only.
- `references/normalization-rules.md` for identity, provenance, and version stability.
- `references/normalization-quality-gate.md` before writing records.
- `../catalog-data/references/identity-rules.md` before creating or changing IDs.
- `../shared-references/artifact-contract.md` for handoff paths.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/prepare-workload.mjs` | Load candidates, bind evidence, emit immutable workload | `--run-id` or `<run-id>` positional | workload.json under `reports/skill-normalization/<run-id>/` | Block if candidate file missing or all candidates rejected | `scripts/test-normalization-bootstrap.mjs` |
| `scripts/finalize-workload.mjs` | Validate bindings, apply decisions, write canonical records | `--run-id`, optional `--dry-run` | finalization-outcomes.json, canonical YAML | Block on digest mismatch, stale bindings, controlled fields | `scripts/test-normalization-bootstrap.mjs` |
| `scripts/write-normalized-skills.mjs` | Write canonical skill records from reviewed normalized drafts | JSON object with `skills` array or single normalized draft | JSON result with written skill IDs | Block on malformed or incomplete drafts | strict validation |
| `../catalog-data/scripts/write-skill-record.mjs` | Write one canonical skill record | Complete normalized skill draft | YAML skill record | Block on ambiguous identity | strict validation |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate output | Existing catalog files | validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |

## Workflow

1. **Prepare workload.** Run `scripts/prepare-workload.mjs <run-id>` to produce a deterministic, digest-bound workload with all candidates, existing matches, source summaries, and identity scaffolds. Every item is bound to its `item_digest`; no untrusted text chooses paths or commands.
2. **Resolve identity (semantic agent).** Review each workload item. Decide new, update, duplicate-needs-curation, rejected, or blocked using source ID, source path, declared name, content digest, and existing records. Do not use filename alone. Do not silently merge possible duplicates. Each decision must reference the exact `item_digest` and include a `reason`. Controlled fields (`canonical_skill_id`, `identity`, `source`, `status`, etc.) are prohibited in `draft_fields`. Write the decisions JSON to `reports/skill-normalization/<run-id>/decisions.json`.
3. **Finalize.** Run `scripts/finalize-workload.mjs --run-id <run-id>`. The finalizer loads the decisions from `reports/skill-normalization/<run-id>/decisions.json` (derived from the run-id, not a CLI argument), validates digest/coverage/bindings, applies decisions, writes canonical records for `new`/`update`, and writes outcome files for all.
4. **Validate.** Run strict validation and fix structural failures without weakening identity requirements.
5. **Hand off to deep analysis.** Provide skill IDs plus source paths/content digests. State identity uncertainties, duplicate suspicions, rejected candidates, and blocked candidates. Deep analysis must be able to recover the original artifact from your handoff.

## Decisions Document Format

```json
{
  "schema_version": 1,
  "run_id": "run_2026-07-13-210300",
  "workload_digest": "sha256:abc123...",
  "decisions": [
    {
      "item_digest": "sha256:def456...",
      "decision": "new",
      "canonical_name": "my-skill",
      "reason": "First normalization for this candidate",
      "draft_fields": { "display_name": "Optional Display Name" }
    },
    {
      "item_digest": "sha256:789abc...",
      "decision": "update",
      "reason": "Upstream content changed",
      "draft_fields": { "display_name": "Updated Display Name" }
    },
    {
      "item_digest": "sha256:fedcba...",
      "decision": "duplicate_needs_curation",
      "reason": "Same source+path as existing skill X"
    },
    {
      "item_digest": "sha256:987654...",
      "decision": "rejected",
      "reason": "Not a skill artifact"
    },
    {
      "item_digest": "sha256:abcdef...",
      "decision": "blocked",
      "reason": "License unclear"
    }
  ]
}
```

Valid decisions: `new`, `update`, `duplicate_needs_curation`, `rejected`, `blocked`.

Allowed decision-level keys: `item_digest`, `decision`, `canonical_name` (required for `new`, prohibited for others), `reason`, `draft_fields`.
Allowed `draft_fields`: only `display_name`.

`workload_digest` must match the workload exactly; any mismatch (stale workload) is rejected.
Every workload item must have exactly one decision. Unknown keys at any level are rejected. Reasons are capped at 2000 UTF-8 bytes. Display names are capped at 200 UTF-8 bytes. Canonical names are capped at 200 UTF-8 bytes and must match `/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/`.

## Quality Bar

Good normalization preserves stable identity, records source evidence, avoids guessed semantic inflation, and makes downstream analysis possible. Existing records are updated without losing curation notes, analysis references, aliases, duplicate resolutions, pack references, or stable IDs.

A normalized record is allowed to be semantically sparse. Sparse is honest when deep analysis has not happened yet. A richly filled record based on guesses is worse than a minimal record with a perfect evidence thread.

## Bad Patterns To Avoid

- Do not derive canonical identity from filename alone.
- Do not treat normalization as mini-analysis.
- Do not fill capability/tool/risk fields because downstream wants richer records.
- Do not infer semantic meaning from source popularity, folder naming, or vague descriptions.
- Do not summarize away the source content; deep analysis must read the original artifact.
- Do not block clear identity records just because semantic quality is unknown.
- Do not overwrite existing analysis or curation data accidentally.
- Do not silently merge possible duplicates.
- Do not fill empty capabilities to make a skill look useful.
- Do not reinterpret the license. Map sync's SPDX/evidence directly.
- Do not re-derive `content_digest` or compute a new hash for `version_id`.
- Do not vary the `canonical_skill_id` derivation algorithm across runs.
- Do not attempt to auto-normalize every candidate as `new` from filename/declared_name alone. The semantic agent must review each workload item.
- Do not put controlled fields (`canonical_skill_id`, `identity`, `source`, `status`, etc.) in `draft_fields`. Only `display_name` is allowed.

## Failure Handling

- If identity is ambiguous, use `duplicate_needs_curation` or `blocked` as appropriate. Hand off to `catalog-curation` with the exact ambiguity.
- If source path or content digest is missing, the prepare phase blocks the candidate into `provenance_blocked`; return to `source-sync` or `skill-extraction`.
- If source license or source record context is missing, use `blocked`.
- If the workload digest in the decisions does not match, fix the decisions document — re-prepare if the candidate file changed.
- If any input binding (candidate JSONL, source registry, existing records) has drifted since prepare, finalize rejects the run. Re-prepare to bind current state.
- If preflight detects ID collisions (two `new` decisions resolving to the same target skill ID, or a `new` colliding with an `update` target), the entire batch is blocked before any write.
- If a draft fails validation, repair the draft rather than weakening the schema.
- If only some candidates are ready, write ready identity records and report blocked/deferred ones with explicit reasons.
- Finalize is idempotent: running it again with the exact same decisions document returns `already_finalized` without mutation. Running it with different decisions after finalization fails closed.
- `provenance_blocked` candidates are tracked in workload and outcomes; every candidate from the input JSONL must appear in the outcome report.

## Verification

Run:

```bash
node skill/skill-normalization/scripts/test-normalization-bootstrap.mjs
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
```

If you added or changed public-eligible records, expect `catalog-publishing` to render later.

## Handoff

Hand off to `skill-deep-analysis` with skill IDs, source paths, content digests, version IDs, blocked candidates, duplicate/update concerns, identity uncertainties, and validation result.

Make clear that the normalized record is a routing/identity artifact. It is not the semantic source of truth for the skill.
