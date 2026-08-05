# Nightly v3 Ownership Boundaries

The controller owns lifecycle order and evidence binding. Phase owners retain semantic and deterministic ownership.

## Owners

- `catalog-maintenance`: health and approved-source synchronization.
- `catalog-growth-ops`: fixed Issue processing and bounded target coordination.
- `skill-deep-analysis`: Analysis v2 claims.
- `skill-dedup-relations`: Relation v2 judgments.
- `pack-synthesis`: Pack v3 DAG design in a synthesis-only session.
- `catalog-evaluation`: Evaluation v2 judgment in a fresh session.
- `catalog-data`: canonical writes, proof binding, promotion, validation, indexes, and impact checks.
- `catalog-publishing`: generated public surfaces.
- `nightly-catalog-ops`: fresh reservation, fixed state transitions, immutable event chain, one gate, seal, audit, and terminal.

## Target Rejection

Reject the affected target when context or intent binding is invalid, a failure fingerprint repeats, required analysis or relation evidence is missing, topology lacks support, proof is stale, session isolation fails, repair budget is exhausted, or independent evaluation does not pass every MIN gate.

When no supported candidate remains, use `no_pack_clean`. Missing infrastructure or incomplete input is never a clean zero-candidate outcome.

## Run Blocking

Block or fail the run when maintenance has a total source-sync failure (every attempted source hit a provider incident), Issue pagination or terminals are incomplete, the context cannot be bound, an owner stage times out, the trusted gate fails, the seal cannot cover all evidence, or the audit is non-ready. Partial provider incidents are recorded and the run continues. A terminal run is not continued.

## Fixed Issue Boundary

Only the fixed repository and deterministic factual template are authorized. Complete intake, assessment, canonical dedup, and a fresh TOCTOU match are mandatory before one restricted comment. Other GitHub mutations and free-form replies are forbidden.

## Git Boundary

Nightly stops after writing its audit-bound terminal. Commit and push belong only to a separately trusted controller acting on current explicit authorization.