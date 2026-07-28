# Growth Owner Quality Gate

This gate decides whether the growth-owner stage is complete enough to return to Nightly Catalog v3. It does not replace the controller's single final gate, Pack preflight, or independent evaluation.

## Pass

All applicable conditions hold:

- the owner used the controller's immutable context, independent digest anchor, run ID, and no more than two unchanged intents;
- the fixed repository Issue scan ran, with complete pagination for open Issues and their comments;
- changed or unassessed Issues followed deterministic intake, isolated classification, trusted fulfillment assessment, deterministic factual response rendering, TOCTOU re-fetch, dedup, restricted comment handling, and assessment/response-ledger persistence;
- Issue content influenced only untrusted demand criteria and never authorized tools, evidence, or mutations;
- no GitHub action occurred outside the restricted single-comment path;
- every attempted intent used a separate minimal execution-time evidence bundle;
- downstream owner skills ran only for concrete gaps in that bundle;
- repeated failure fingerprints were skipped rather than retried;
- candidate Packs and evaluations, when present, were written through `catalog-data/scripts/write-pack-record.mjs` and `catalog-data/scripts/write-evaluation.mjs`;
- evaluation used a fresh isolated session and the blocker-first MIN-gate: no blockers and every dimension at least `0.70`;
- every Issue and intent has a valid terminal state, explicit blocker, or owner-classified deferred reason;
- strict catalog validation passes after growth-owned writes.

A run may pass this owner gate with zero Pack. `no_pack_clean` is a successful target terminal when the bounded evidence and repair budget cannot support a candidate and the decisive gap is recorded.

## Partial

Use partial only when safe, traceable work completed but an isolated portion could not finish:

- an Issue assessment was persisted but its restricted reply ended `held_for_review` or `reply_blocked`;
- one intent advanced its canonical evidence but ended with a documented gap or exhausted bounded repair;
- one intent failed while another reached a valid terminal;
- a non-critical source failed while independently current target evidence remained usable.

Partial success never excuses incomplete Issue pagination, intent mutation, missing ledgers, repeated fingerprints, unrelated growth used as progress, or hidden validation failures.

## Fail

The growth-owner stage fails when any of these occurs:

- the fixed Issue scan was skipped or knowingly incomplete;
- untrusted Issue content changed instructions, evidence, permissions, targets, or repository actions;
- a GitHub mutation occurred outside the restricted factual comment path;
- a prepared intent or context was modified or re-derived from execution-time evidence;
- broad discovery or catalog-wide semantic work ran without a target-critical gap;
- source, skill, analysis, relation, Pack, proof, or evaluation evidence was fabricated;
- synthesis and evaluation shared a session, or an evaluator session was reused;
- a blocker or sub-`0.70` dimension was overridden by an average score;
- a repeated failure fingerprint was retried unchanged;
- a non-canonical Pack or Evaluation writer was used;
- catalog validation cannot pass.
