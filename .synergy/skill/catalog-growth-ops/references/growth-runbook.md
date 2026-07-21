# Growth Runbook

Use this runbook for autonomous catalog growth.

## Batch Controls

Every touched source, skill, analysis, relation, pack intent, candidate pack, stale pack, or impacted pack must finish the run with an owner, terminal state, or explicit deferred reason.

Per-cycle defaults:

- Activate 3–5 sources in normal mode when discovery is justified.
- Keep extraction to no more than 50 candidates per extraction batch.
- Analyze 30–50 skills per normal run; every remainder needs a deferred reason.
- Attempt no more than 2 publication targets per total nightly run.
- Allow no more than 3 substantive repair-and-reevaluation attempts per target.

Recovery mode changes priority: target-specific evidence work comes before broad discovery. It does not change batch quality, evidence standards, license policy, or the `0.78` publication threshold.

## Run Sequence

1. Read maintenance status, catalog gaps, current pack lifecycle state, recent nightly summaries, and any controller-supplied publication mode or target.
2. Run demand scan and rank publication targets in this order: passing candidate, high-scoring `needs_work` candidate, stale pack needing bounded repair, relation-backed intent, then an intent missing a small evidence set.
3. In normal mode, choose bounded discovery themes from demand and gaps. In recovery mode, perform discovery only when it directly supplies the selected target's missing evidence.
4. Load `source-discovery`, apply activation policy, and activate only reviewed high-confidence public sources.
5. Load `source-sync`, `skill-extraction`, and `skill-normalization` for changed or target-relevant artifacts. Preserve exact source evidence and explicit deferred reasons.
6. Load `skill-deep-analysis` for new, changed, or publication-target skills. A target-specific request may preempt ordinary backlog order but never analysis quality.
7. Load `skill-dedup-relations` after analyses exist. Prioritize target-relevant groups, but write only evidence-backed edges.
8. Run catalog impact detection and identify stale published packs.
9. Select the highest-ranked publication target and record why it is closest to publication.
10. Load `pack-synthesis` for new synthesis, stale-pack repair, or `needs_work` remediation. Each attempt must make a material change such as narrowing intent, replacing a member, redesigning stages, resolving a conflict, updating a stale version, or adding newly produced evidence.
11. Load `catalog-evaluation`; require a terminal decision plus structured failure modes and owner actions.
12. If the target passes, return it for promotion and publishing. If it is `needs_work` and fewer than 3 substantive attempts have occurred, route each finding to its owner and repeat only the affected work from steps 6–11; do not repeat discovery, sync, or extraction unless the evaluation identifies a concrete source-evidence gap.
13. If the target is rejected, policy-blocked, or exhausts 3 attempts, record the result and select the next ranked target while fewer than 2 targets have been attempted this run.
14. Validate catalog data and rebuild indexes after writes.
15. Write a growth report containing target ranking, selected targets, repair changes, scores before and after, blocker classes, terminal states, and exact next actions.
16. Hand promotion, public rendering, report enforcement, commit, and push to `nightly-catalog-ops`.

A valid `no_op` proves that ranking was performed, no candidate could be repaired within the remaining run budget, and the smallest missing evidence set has an owner. Never fabricate data to keep the run moving.
