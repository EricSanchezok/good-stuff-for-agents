# Read-Only Nightly Git Audit

Nightly never stages, commits, pushes, changes branches, rewrites history, runs hooks, or grants Git authorization. The controller records a clean baseline `HEAD`, seals the complete changed-path manifest, and writes one audit receipt before terminal.

## Required Bindings

The receipt binds:

- the baseline `HEAD` captured during init;
- the seal event and seal digest;
- the manifest digest;
- the sorted complete changed-path set and its digest;
- readiness, errors, and warnings.

The manifest contains every staged, unstaged, and untracked path reported after the baseline, plus the predeclared seal, audit, and terminal artifact paths. Paths are unique canonical repository-relative filenames. Absolute paths, traversal, backslashes, controls, Git metadata, and secret-like paths are rejected.

Code or controller changes during an ordinary run are blockers. A changed path missing from the manifest, an absent predeclared artifact, a baseline mismatch, or a digest mismatch makes the audit non-ready.

## Result Meaning

`ready: true` means only that the sealed evidence and current repository state are internally consistent. A separately authorized trusted controller must still inspect the intended diff, rerun appropriate checks, create the exact commit, verify it, select the remote independently, and push without force.

`ready: false` requires an audit-blocked terminal and a non-zero command result. There is no override path.

## Verification

Audit behavior is exercised by the controller E2E suite:

```bash
npm --prefix .synergy run nightly:controller:test
```
