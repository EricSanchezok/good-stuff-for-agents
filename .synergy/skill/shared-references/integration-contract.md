# Project Skill Integration Contract

This contract describes handoffs across all skill layers in the catalog system.

## Three-Layer Ownership Model

| Layer | Skill | Scope |
| --- | --- | --- |
| Maintenance | `catalog-maintenance` | Deterministic validation, sync, indexing, rendering, health checks. No discovery, analysis, or pack work. |
| Growth | `catalog-growth-ops` | Autonomous source discovery, activation, extraction, normalization, analysis, relations, pack synthesis, and evaluation. Skill-driven; no monolithic scripts. |
| Total controller | `nightly-catalog-ops` | Delegates to maintenance preflight, growth, final validation/publishing, then writes total run report and commits/pushes when authorized. Does not duplicate phase SOPs. |

Phase skills (`source-discovery`, `source-sync`, `skill-extraction`, `skill-normalization`, `skill-deep-analysis`, `skill-dedup-relations`, `pack-synthesis`, `catalog-evaluation`, `catalog-curation`, `catalog-data`, `catalog-publishing`) accept input from the user or from the orchestrator layer and must not require user interaction during autonomous runs.

## Terminal State Model

Full catalog operations do not have one fixed endpoint such as "publish a new pack." They are complete only when every catalog object touched by the run reaches a terminal state for that run.

Terminal states are:

- **No-op:** inspected and explicitly unchanged because no affected inputs, no sufficient evidence, or no eligible action exists.
- **Written or updated:** canonical records, analyses, relations, indexes, reports, or public pages were changed and validated.
- **Evaluated:** pack or public-readiness review produced `passed`, `needs_work`, or `rejected` with evidence and owner-specific recommendations.
- **Promotion-ready:** evaluation passed and the next deterministic promotion/publishing step is available to the controller.
- **Promoted or published:** passing pack or public record was promoted through catalog-data and rendered through catalog-publishing checks.
- **Deprecated or removed:** status was changed only when policy and curation authority allow it.
- **Blocked:** the next action needs missing evidence, unsafe policy, user-owned authority, unavailable tooling, or a failing validation signal. The blocker must name the owner and exact next action.

A handoff is not a terminal state when the next owner skill is available and no blocker exists. In that case, the controller should load the owner skill and continue.

## Activation Predicate

Before you start a phase, state why this skill owns it. You should be able to name the catalog object, artifact, or decision that will change. If another skill owns the next action, stop and hand off instead of stretching this skill across boundaries.

## Helper Resolution

Resolve helpers in this order:

1. Use an owner-local helper under `.synergy/skill/<owner>/scripts/` when the helper is specific to that skill.
2. Use `.synergy/skill/catalog-data/scripts/` when you need a canonical catalog write, validation, formatting, indexing, hashing, migration, or impact check.
3. Use `.synergy/skill/catalog-publishing/scripts/` only when you are rendering or checking public catalog pages.
4. If no truthful helper exists, write the agent-authored artifact first and either call the closest canonical writer or stop with a clear gap. Do not invent semantic decisions inside a helper.

## Artifact Contract

Every handoff must name the exact artifact path, the record IDs touched, the confidence level, and the verification command already run. If you cannot name those items, your work is not ready for the next skill.

## Failure Policy

Choose one policy and say which one you used:

- **Block:** stop because missing evidence, schema failure, or user-owned decision would make the result unsafe.
- **Warn and skip:** continue with unaffected records and report skipped items.
- **Forensic write-direct:** preserve evidence exactly as found without interpreting it.
- **Aggregate partial success:** write successful deterministic outputs and report failures per item.
- **Diagnostic only:** produce a report without changing catalog records.

## Verification Gate

Before handoff, run the narrowest deterministic check that proves the artifact can be consumed. For catalog records, run validation. For public pages, run render, drift, link, and public-boundary checks. For review-only phases, include the evidence list and explicit unresolved questions.

## Trace Output

Your final handoff should include:

- input artifacts read;
- output artifacts written;
- helpers invoked;
- verification result;
- unresolved risks;
- recommended next skill.
