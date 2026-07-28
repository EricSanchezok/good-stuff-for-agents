# Target-Gap Discovery Policy

Use this policy only after a current immutable intent's minimal evidence bundle identifies a concrete source-evidence gap. Discovery is not a default Nightly phase and never creates or changes an intent.

## Entry Conditions

Discovery may begin only when all conditions are true:

- the controller supplied the intent in the immutable prepared context;
- current canonical records and approved snapshots cannot satisfy a named evidence need;
- the missing item has an owner and is necessary to decide one candidate;
- the search can be bounded by query count, result count, and source activation count;
- a repeated target failure fingerprint does not already prove the same search futile.

If any condition fails, return the exact gap or `no_pack_clean` instead of searching broadly.

## Search Brief

Write a brief before searching:

| Field | Requirement |
|---|---|
| Intent | Exact prepared intent ID and binding |
| Missing evidence | Capability, artifact, analysis input, or relation endpoint needed |
| Consumer | Owner phase that will use the result |
| Current evidence | Canonical records already checked |
| Search boundary | Channels, queries, results, and time budget |
| Stop condition | Evidence found, policy block, repeated fingerprint, or budget exhausted |

## Channels

Choose the narrowest channel that can resolve the gap:

- **Approved-source inspection:** inspect target-relevant paths in an already approved source.
- **Known-lead inspection:** inspect a bounded public lead previously recorded under policy.
- **Reverse index:** follow a small number of relevant links from an approved directory source.
- **Domain-concept search:** use the target domain's language to find public skill-like artifacts.

Do not rotate channels for coverage's sake. Change channels only when the current one cannot resolve the same documented gap within budget.

## Default Limits

Unless the controller sets a smaller budget:

- inspect no more than 10 queries total for one intent;
- inspect no more than 20 results total;
- activate no more than 3 target-relevant sources;
- extract no more than 50 candidates from any one source batch;
- stop as soon as the minimum evidence bundle can proceed.

These are ceilings, not quotas. Finding one sufficient source is better than filling the batch.

## Source Decisions

A discovered source remains a lead until `source-discovery` qualifies it and `source-activation-policy.md` permits activation. Prefer public, maintained, parseable sources with clear provenance and license evidence. Block private, credentialed, sensitive, unsupported, or legally unclear sources.

Activation does not establish skill quality. Sync, extraction, normalization, analysis, and relation owners must produce the canonical evidence needed by the target.

## Evidence To Record

For every inspected lead, record:

- intent and exact gap binding;
- channel and query or parent lead;
- URL and public-access result;
- provenance and license signal;
- parseability and supported-sync result;
- duplicate check;
- decision and reason;
- downstream owner and produced evidence paths, if accepted.

Unrelated discoveries do not become current-run work. Do not broaden extraction, analysis, or relation review beyond the target bundle.

## Terminal Results

Discovery ends with one of:

- `evidence_found` — the owning phases can complete the minimum bundle;
- `blocked_policy` — license, access, safety, or tooling prevents use;
- `insufficient_evidence` — the bounded search found no adequate source;
- `skipped_repeat` — the same target gap and fingerprint already failed.

For any non-success terminal, return a stable failure fingerprint and the smallest next-owner action. A clean `insufficient_evidence` result may lead to `no_pack_clean`.
