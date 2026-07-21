---
name: catalog-data
description: Own canonical catalog data writes, schemas, validation, formatting, migrations, indexes, hashes, and impact checks for the Skill Intelligence Catalog.
---

# Catalog Data Integrity SOP

## Invocation Instructions

Additional user instructions for this invocation:

$ARGUMENTS

Treat these as scope refinements only. They do not override safety boundaries, ownership rules, or quality gates in this skill. If empty, follow the SOP as written.

## What You Own

You own the integrity of canonical catalog data under `catalog/`. You protect source, skill, analysis, relation, pack, evaluation, index, and run records from malformed writes, unstable IDs, duplicate identities, and hand-edited drift.

You do not decide whether a source is useful, whether a skill is valuable, whether a relation is semantically correct, or whether a pack should pass evaluation. Those decisions belong to the phase-specific skills. You only provide deterministic write and validation behavior once those decisions are captured in drafts.

## When To Use This Skill

Use this skill when you need to:

- validate, format, migrate, hash, or index catalog records;
- write a canonical source, skill, pack, analysis, evaluation, relation, run, or state record from an agent-authored draft;
- inspect schema contracts before another skill writes data;
- detect mechanical impact from changed catalog records;
- repair structural data issues without changing semantic meaning.

## When Not To Use This Skill

Do not use this skill to discover sources, interpret upstream skill content, normalize ambiguous identities, write deep analysis, create relation judgments, design packs, evaluate candidates, curate human decisions, or publish docs. Use the owning project skill for those phases, then return here only for deterministic writes and checks.

## Inputs You Should Gather First

You should gather:

- the agent-authored draft that contains the semantic decision;
- existing records under the relevant `catalog/**/records/` or candidate path;
- schema references under `references/schemas/`;
- `references/identity-rules.md`, `references/write-contracts.md`, and `references/validation-policy.md`;
- shared references: `../shared-references/artifact-contract.md`, `../shared-references/integration-contract.md`, and `../shared-references/script-policy.md`;
- any validation error output from earlier failed attempts.

## Outputs You Must Leave Behind

You must leave behind one or more of:

- updated canonical catalog records;
- formatted catalog records;
- migration output;
- rebuilt indexes under `catalog/indexes/`;
- catalog hash output;
- impact report output;
- validation output proving the data is consumable;
- a concise handoff that names every path written.

## References To Read

- `references/write-contracts.md` before writing any canonical record.
- `references/identity-rules.md` before creating or updating stable IDs.
- `references/validation-policy.md` before interpreting validator failures.
- `references/migration-policy.md` before changing schema versions.
- `references/schema-authoring.md` before editing schemas.
- `../shared-references/script-policy.md` before adding or exposing a helper.

## Helper Scripts You May Call

| Helper | Deterministic purpose | Input contract | Output contract | Failure policy | Verification |
|---|---|---|---|---|---|
| `scripts/validate-catalog.mjs` | Validate catalog structure and schema | Existing catalog files; use `--strict` for release checks | JSON/text validation result | Block on errors | `npm --prefix .synergy run catalog:validate` |
| `scripts/format-catalog.mjs` | Normalize YAML/JSON formatting | Existing catalog records | Rewritten formatted records | Block on parse errors | rerun validation |
| `scripts/migrate-catalog.mjs` | Apply known schema migrations | Existing catalog records | Migrated records and report | Block if migration is unknown | rerun validation |
| `scripts/build-indexes.mjs` | Rebuild deterministic indexes | Valid catalog records | `catalog/indexes/**` | Block on invalid records | `npm --prefix .synergy run catalog:index` |
| `scripts/compute-catalog-hash.mjs` | Compute catalog content hash | Valid catalog records | hash JSON/text | Diagnostic only | compare with manifest when needed |
| `scripts/detect-impact.mjs` | Report mechanical downstream impact | Changed catalog records | impact report | Diagnostic only unless release-blocking | inspect report |
| `scripts/append-source-candidate.mjs` | Append reviewed source candidate | Complete source candidate draft | JSONL entry | Block on missing required fields | validation |
| `scripts/write-source-record.mjs` | Write approved source record | Complete source record draft | YAML source record | Block on malformed draft | validation |
| `scripts/append-source-state.mjs` | Append source sync state event | Source state event draft | JSONL state event | Warn and continue per source when called by sync | validation |
| `scripts/append-skill-candidate.mjs` | Append extracted skill candidate | Candidate artifact draft | JSONL candidate | Block on malformed draft | validation |
| `scripts/write-skill-record.mjs` | Write normalized skill record | Complete normalized skill draft | YAML skill record | Block on ambiguous identity | validation |
| `scripts/write-analysis.mjs` | Write analysis markdown from sections | Complete analysis draft | analysis markdown | Block on missing skill ID | validation |
| `scripts/append-relation.mjs` | Append reviewed relation edge | Complete relation draft | JSONL relation edge | Block on missing endpoints | validation |
| `scripts/write-pack-record.mjs` | Write candidate or public pack record | Complete pack draft | YAML pack record | Block on malformed pack | validation |
| `scripts/write-evaluation.mjs` | Write evaluation from reviewed rubric draft | Complete evaluation draft | evaluation JSON | Block on missing pack/evaluation ID | validation |
| `scripts/promote-pack-candidates.mjs` | Promote packs that already satisfy policy | Existing candidate records and evaluations | promoted pack records | Block on policy failure | validation and publish checks |
| `scripts/append-run-event.mjs` | Append run event | Run event draft | JSONL event | Warn and continue for non-critical event logs | validation |

## Workflow

1. **Classify the write.** You identify the record type, owning upstream skill, semantic decision already made, and exact target path. If the decision has not been made, you stop and send the work back to the owning skill.
2. **Read the contract.** You inspect the relevant schema and write contract before editing. You confirm required fields, stable ID rules, status values, and allowed default behavior.
3. **Prepare the draft.** You ensure the draft contains semantic fields supplied by the owning skill. You do not fill missing capabilities, scores, relation reasons, or pack roles with guesses.
4. **Call the narrow helper.** You call the writer that matches the record type. You prefer stdin or `--input` drafts over ad hoc hand edits.
5. **Validate immediately.** You run strict validation after writes. If validation fails, you fix the structural issue at the writer or draft layer and rerun validation.
6. **Rebuild derived data.** When records that feed indexes or public pages changed, you rebuild indexes and hand off to publishing only after validation passes.
7. **Report paths and checks.** You summarize changed paths, helper invocations, validation results, and the next owning skill.

## Quality Bar

Good catalog-data work is boring, deterministic, and auditable. IDs are stable, paths are predictable, drafts preserve the owning skill's meaning, schemas catch malformed data, indexes rebuild cleanly, and no fake content is introduced.

## Bad Patterns To Avoid

- Do not hand-edit canonical YAML or JSONL records when a writer exists.
- Do not create placeholder records to make the catalog look populated.
- Do not infer semantic fields from filenames when the owning skill has not supplied them.
- Do not hide validation failures by changing schemas without a migration rationale.
- Do not keep helpers whose names imply judgment they do not perform.

## Failure Handling

- If a draft is missing required semantic fields, block and return it to the owning skill.
- If a stable ID collides, inspect identity rules and existing records before writing.
- If validation fails after a write, fix the draft or writer and rerun strict validation.
- If a migration is needed, write the migration path first and validate before touching unrelated records.
- If only some records in a batch fail, write successful deterministic outputs only when the helper supports partial reporting and you can name skipped records.

## Verification

Run the smallest applicable set:

```bash
npm --prefix .synergy run catalog:validate
npm --prefix .synergy run catalog:index
npm --prefix .synergy run catalog:hash
npm --prefix .synergy run catalog:impact
```

For release-ready changes, run the full project check:

```bash
npm --prefix .synergy run check
```

## Handoff

Your handoff names the record IDs, changed paths, helpers called, validation commands, failures skipped, and next skill. If downstream publishing is needed, say that `catalog-publishing` should render and check public pages after indexes are current.
