# Nightly Catalog Run Report

**Run ID**: run_2026-07-28-v3-final
**Timestamp**: 2026-07-28T04:53:54.522Z
**Ledger ID**: ldg_20260728-045511-9v2277

## Run Context

- Snapshot: snap_run_2026-07-28-v3-final
- Prior fingerprint: none
- Digest: 1cbc466ffd5b8cb49899a29c81716c8ddb5098ba01eb0be55134cd9d76ef5b5e

### Catalog Counts

- Sources: 17 total (8 active, 0 candidate)
- Skills: 2 total (2 active, 0 candidate)
- Analyses: 2 total
- Relations: 0 total
- Packs: 0 total (0 candidate, 0 published)
- Evaluations: 0 total
- Issues: 0 total

### Freshness

- Sources stale: 0
- Skills stale: 0
- Analyses stale: 0
- Oldest stale: 2026-07-27T21:32:43.713Z

### Coverage

- Skills with analysis: 2
- Skills without analysis: 0
- Coverage ratio: 100.0%
- Active skills with analysis: 0

### Relations

- Total edges: 0
- Chains: 0, Strengthens: 0, Alternatives: 0, Conflicts: 0

### Pack Lifecycle

- Candidates: 0
- Published: 0
- New since last run: 0
- Stale packs: 0
- Promoted this run: 0
- Rejected this run: 0

### Issue Digest

- Open: 6, Acknowledged: 0, Fulfilled: 0, Blocked: 0

## Target Intents

### Intent 1: code-review-remediation
- Source: issue_demand
- Score: 0.950
- Reason: Controller-bound demand: 2 explicit skill IDs, domains: code-review-remediation
- Analysis budget: 2

## Terminal Ledger

**Run Outcome**: `no_pack_clean`

> Run completed with no packs to publish. Zero packs is a clean terminal state.

Total actions: 7
Errors: 0
Warnings: 0

### Source Outcomes

_No outcomes_

### Skill Outcomes

_No outcomes_

### Relation Outcomes

_No outcomes_

### Pack Outcomes (1)

- **unknown_pack**: `no_pack_clean` — Candidate selection produced no pack.

### Issue Outcomes (6)

- **issue_6**: `held_for_review` — Issue #6: held_for_review
- **issue_5**: `posted` — Issue #5: posted
- **issue_4**: `posted` — Issue #4: posted
- **issue_3**: `posted` — Issue #3: posted
- **issue_2**: `posted` — Issue #2: posted
- **issue_1**: `posted` — Issue #1: posted

## Final Gate

**Decision**: `pass`
**Gate ID**: gate_1785214511201

- ✓ **same-session-verification**: Every evaluated candidate uses a distinct synthesis, evaluation, and final-gate session.
- ✓ **candidate-terminal-bindings**: All candidate terminals match owner decisions, proof checks, and promotion outcomes.
- ✓ **gate:catalog-strict-validation**: catalog:validate passed in 448ms
- ✓ **gate:catalog-indexes**: catalog:index passed in 282ms
- ✓ **gate:public-render**: publish:render passed in 650ms
- ✓ **gate:public-drift**: publish:check passed in 503ms
- ✓ **gate:public-links**: publish:links passed in 282ms
- ✓ **gate:public-boundary**: publish:boundary passed in 109ms
- ✓ **gate:public-summaries**: publish:summaries passed in 222ms
- ✓ **gate:extraction-test**: skill:extraction:test passed in 120ms
- ✓ **gate:normalization-bootstrap-test**: skill:normalization:bootstrap:test passed in 248ms
- ✓ **gate:analysis-binding-test**: analysis:binding:test passed in 2621ms
- ✓ **gate:relation-v2-test**: relations:v2:test passed in 495ms
- ✓ **gate:pack-schema-test**: pack:schema:test passed in 113ms
- ✓ **gate:pack-core-test**: pack:core:test passed in 121ms
- ✓ **gate:pack-preflight-test**: pack:preflight:test passed in 111ms
- ✓ **gate:pack-proof-test**: pack:proof:test passed in 2222ms
- ✓ **gate:pack-promotion-test**: pack:promotion:test passed in 114ms
- ✓ **gate:pack-destination-test**: pack:destination:test passed in 2062ms
- ✓ **gate:evaluation-binding-test**: evaluation:binding:test passed in 1687ms
- ✓ **gate:path-safety-test**: path:safety:test passed in 273ms
- ✓ **gate:issue-intake-test**: issue:intake:test passed in 258ms
- ✓ **gate:issue-pipeline-test**: issue:pipeline:test passed in 138ms
- ✓ **gate:issue-stage-test**: issue:stage:test passed in 250ms
- ✓ **gate:nightly-context-test**: nightly:context:test passed in 3079ms
- ✓ **gate:nightly-final-gate-test**: nightly:final-gate:test passed in 205ms
- ✓ **gate:nightly-seal-test**: nightly:seal:test passed in 147ms
- ✓ **gate:nightly-validator-test**: nightly:validator:test passed in 108ms
- ✓ **gate:nightly-git-test**: nightly:git:test passed in 1153ms
- ✓ **gate:catalog-reset-test**: catalog:reset:test passed in 557ms
- ✓ **gate:pack-publishing-test**: publish:pack-v3:test passed in 124ms
- ✓ **issue-states**: 1 Issue(s) are held or blocked with canonical terminal records
- ✓ **ledger-integrity**: Terminal ledger is sealed and bound to the run context

