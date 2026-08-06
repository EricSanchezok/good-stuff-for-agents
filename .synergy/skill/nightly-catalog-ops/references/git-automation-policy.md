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

The outer Synergy Agent is the trusted controller for Git delivery. Issuing `/nightly` is the Git commit/push authorization for that run; the Agent delivers automatically with zero user interaction.

### Protocol A — published terminal

1. Run `delivery-guard.mjs <runId> --fetch-remote` — validates completed+published status, ready audit, valid chain/schema/seal/manifest, no active marker, exact path match, no code/secret/git/ordinary blockers.
2. If `ready !== true`: **do not push**. Degrade to Protocol B (evidence commit) and report guard errors.
3. `git fetch origin main` — TOCTOU check; remote must equal baseline HEAD. Remote drift fails closed (no auto-rebase).
4. Stage exact manifest paths only: `git add <path1> <path2> ...` — never `git add -A` or `git add .`.
5. Verify the staged set equals the manifest paths exactly (bidirectional).
6. Commit with the required footer: `Co-authored-by: synergy-agent <299070056+synergy-agent@users.noreply.github.com>`.
7. `git push origin main` — never force push.
8. If the worktree still has non-manifest changes after the commit, stage and commit them separately with the footer to restore a clean worktree; report if it cannot be made clean.

### Protocol B — all other terminals

Every non-published terminal (`blocked`, `insufficient_evidence`, `failed`, `interrupted`, `audit_blocked`, `no_pack_clean`) is committed as run evidence to restore a clean worktree:

1. Collect changed paths: `git status --porcelain -z --untracked-files=all`.
2. Filter to paths under `NIGHTLY_ALLOWED_PATHS` roots (`catalog/`, `docs/`, `reports/`, `assets/`, `README.md`); never `.synergy/`, `.git/`.
3. Stage those paths exactly; commit `nightly: record <terminal> run <runId>` + footer; push when network is available. On total network loss, keep the local commit and report.
4. Self-heal: before the next run, if local HEAD is ahead of `origin/main`, push normally to restore the baseline==remote precondition.

The delivery-guard module is pure-read deterministic. It never performs git mutations.

## Result Meaning

`ready: true` means only that the sealed evidence and current repository state are internally consistent. The outer Agent still inspects the intended diff, reruns appropriate checks, creates the exact commit, verifies it, selects the remote independently, and pushes without force.

`ready: false` requires an audit-blocked terminal and a non-zero command result. There is no override path.

## Verification

Delivery and audit behavior is exercised by the controller E2E suite:

```bash
npm --prefix .synergy run nightly:controller:test
npm --prefix .synergy run nightly:v4:test
```
