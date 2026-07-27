# Growth Runbook

Use this runbook for autonomous catalog growth — either full pipeline or targeted minimal evidence assembly.

## Batch Controls

Every touched source, skill, analysis, relation, pack intent, candidate pack, stale pack, or impacted pack must finish the run with an owner, terminal state, or explicit deferred reason.

Per-cycle defaults:

- Activate 3–5 sources in normal mode when discovery is justified.
- Keep extraction to no more than 50 candidates per extraction batch.
- Analyze 30–50 skills per normal run; every remainder needs a deferred reason.
- Attempt no more than 2 publication targets per total nightly run.
- Allow exactly one bridge repair (contract preflight) and one post-evaluation repair per target.
- Maximum 2 substantive repair attempts per target total.

Recovery mode changes priority: target-specific evidence work comes before broad discovery. It does not change batch quality, evidence standards, license policy, or the `0.78` publication threshold.

## Run Sequence — Target Mode (orchestrator supplies target)

1. Read the orchestrator-supplied target, intent, and any failure fingerprints to skip.
2. Check each fingerprint against prior-run records. Skip matched targets immediately.
3. Identify the minimal evidence set: which skill records, analyses, and relation edges are needed to form the pack contract.
4. Produce only those — load the relevant phase skills (extraction, normalization, analysis, relations) for the scope of the target only.
5. Hand the evidence bundle to `pack-synthesis` for contract preflight.
6. If the bundle cannot be completed, return `insufficient_evidence` with the exact gap spec and a failure fingerprint.
7. Synthesis and evaluation reuse this same bundle — do not re-run the pipeline between preflight and evaluation.

## Run Sequence — No-Target Mode (full autonomous growth)

1. Read maintenance status, catalog gaps, current pack lifecycle state, recent nightly summaries, and any controller-supplied publication mode.
2. Run demand scan and rank publication targets in this order: passing candidate, high-scoring `needs_work` candidate, stale pack needing bounded repair, relation-backed intent, then an intent missing a small evidence set.
3. In normal mode, choose bounded discovery themes from demand and gaps. In recovery mode, perform discovery only when it directly supplies the selected target's missing evidence.
4. Load `source-discovery`, apply activation policy, and activate only reviewed high-confidence public sources.
5. Load `source-sync`, `skill-extraction`, and `skill-normalization` for changed or target-relevant artifacts. Preserve exact source evidence and explicit deferred reasons.
6. Load `skill-deep-analysis` for new, changed, or publication-target skills. A target-specific request may preempt ordinary backlog order but never analysis quality.
7. Load `skill-dedup-relations` after analyses exist. Prioritize target-relevant groups, but write only evidence-backed edges.
8. Run catalog impact detection and identify stale published packs.
9. Select the highest-ranked publication target and record why it is closest to publication.
10. Hand the target to `pack-synthesis` for contract preflight. If preflight fails, one bridge repair is allowed. If preflight passes, proceed to full synthesis.
11. Load `catalog-evaluation` only for preflight-passed packs; require a terminal decision plus structured failure modes and owner actions.
12. If the target passes, return it for promotion and publishing. If it is `needs_work` and the one post-evaluation repair has not been used, route the finding to the owner and repeat only the affected work from steps 6 onward; do not repeat discovery, sync, or extraction unless the evaluation identifies a concrete source-evidence gap.
13. If the target is rejected, policy-blocked, or exhausts its repair attempts, record the result and failure fingerprint, then select the next ranked target while fewer than 2 targets have been attempted this run.
14. Validate catalog data and rebuild indexes after writes.
15. Write a growth report containing target ranking, selected targets, repair changes, failure fingerprints, scores before and after, blocker classes, terminal states, and exact next actions.
16. Hand promotion, public rendering, report enforcement, commit, and push to `nightly-catalog-ops`.

A valid `no_op` proves that ranking was performed, no candidate could be repaired within the remaining run budget, and the smallest missing evidence set has an owner. Never fabricate data to keep the run moving.
