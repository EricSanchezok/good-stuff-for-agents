# Read-Only Nightly Git Audit + Trusted Delivery

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

## Trusted Git Delivery (Outer Agent)

The outer Synergy Agent is the trusted controller for Git delivery:

1. Run `delivery-guard.mjs` — validates completed+published status, ready audit, valid chain/schema/seal/manifest, no active marker, exact path match, no code/secret/git/ordinary blockers.
2. `git fetch origin main` — TOCTOU check; remote must equal baseline HEAD. Remote drift fails closed (no auto-rebase).
3. Stage exact manifest paths only: `git add <path1> <path2> ...` — never `git add -A` or `git add .`.
4. Commit with the required footer: `Co-authored-by: synergy-agent <299070056+synergy-agent@users.noreply.github.com>`.
5. `git push origin main` — never force push.
6. `--no-push` opt-out available; blocked/failed/insufficient_evidence are never committed/pushed by default. `no_pack_clean` commits are opt-in only when explicitly requested and the user goal requires it.

The delivery-guard module is pure-read deterministic. It never performs git mutations.

## Result Meaning

`ready: true` means only that the sealed evidence and current repository state are internally consistent. A separately authorized trusted controller must still inspect the intended diff, rerun appropriate checks, create the exact commit, verify it, select the remote independently, and push without force.

`ready: false` requires an audit-blocked terminal and a non-zero command result. There is no override path.

## Verification

Audit behavior is exercised by the controller E2E suite:

```bash
npm --prefix .synergy run nightly:controller:test
npm --prefix .synergy run nightly:v4:test
```
