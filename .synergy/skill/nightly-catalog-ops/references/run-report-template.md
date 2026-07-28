# Ledger-Driven Run Report

`seal-run.mjs` writes `run-report.md` in the selected run output directory. Agents do not hand-author this report.

The renderer consumes only:

- the immutable run context;
- the sealed terminal ledger;
- the one final-gate result;
- the prepared intents.

## Rendered Sections

1. Run ID, timestamp, and ledger ID.
2. Context snapshot and context digest.
3. Catalog counts, freshness, analysis coverage, relation counts, Pack lifecycle, and Issue digest captured at preparation time.
4. At most two prepared intents with source, score, reason, and analysis budget.
5. Terminal-ledger outcome, action/error/warning counts, and outcome entries grouped by source, skill, relation, Pack, and Issue.
6. Final-gate decision, individual check results, errors, and warnings.

The report is explanatory Markdown. The v3 summary is the machine contract; the terminal ledger is the state source for both.

## Prohibited Content

- manually copied terminal states;
- Git authorization, commit/push claims, or pending Git actions;
- legacy publication-progress or starting-state structures;
- internal values that do not exist in the sealed context or ledger;
- a second evaluation, promotion, or gate decision.

## Verification

`test-seal-run.mjs` exercises report generation together with ledger, summary, and manifest seams:

```bash
npm --prefix .synergy run nightly:seal:test
```
