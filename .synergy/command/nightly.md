---
description: "Execute the fully autonomous Nightly Catalog production run with automatic Git delivery"
agent: "synergy"
---

## /nightly — Fully Autonomous Production Run

### Authorization

Issuing `/nightly` **is** the Git commit/push authorization for this run. The outer Agent executes the entire lifecycle below with zero user interaction and zero waiting points. There are no questions, confirmations, or checkpoints in this flow. The command's emission is the only user action.

### Fresh Invocation

```bash
npm --prefix .synergy run nightly
```

The Node controller owns the fixed lifecycle:

```text
init → maintenance → issues → context → targets → gate → seal → audit → terminal
```

Do not invoke phases independently.

### Autonomous Execution Protocol

The outer Agent drives the run to terminal in a mechanical loop with no user interaction:

1. Run `npm --prefix .synergy run nightly` (fresh).
2. If it returns `paused_for_assessment`:
   - Read `catalog/runs/<runId>/outputs/issue-assessment-handoff.json`.
   - Load `skill/catalog-growth-ops/SKILL.md` for Issue owner procedures.
   - Dispatch one `issue-intake` subagent per accepted issue.
   - Write drafts via canonical `writeIssueDrafts` (write-once, coverage-binding).
   - Resume: `npm --prefix .synergy run nightly -- --resume <runId>`.
3. If it returns `paused_for_targets`:
   - Read `catalog/runs/<runId>/outputs/target-execution-handoff.json` for `context_digest`, `intents`, `required_owners`, `evidence_budget`, `session_isolation`.
   - Execute owner skills per L0-L7 workflow priority (see Growth Workflow below).
   - Write target results via the canonical target-result writer:
     ```bash
     node .synergy/skill/nightly-catalog-ops/scripts/lib/target-result-writer.mjs --input <path>
     ```
   - Resume: `npm --prefix .synergy run nightly -- --resume <runId>`.
4. Repeat steps 2-3 until the controller returns a terminal status. The controller guarantees every step is write-once and tamper-proof.
5. Read `catalog/runs/<runId>/outputs/terminal.json` and dispatch:
   - **published** → Git Delivery Protocol A (guard delivery).
   - **all others** (`blocked`, `insufficient_evidence`, `failed`, `interrupted`, `audit_blocked`, `no_pack_clean`) → Git Delivery Protocol B (evidence commit).
6. Output a final summary to the user. This is a **report, not a question**.

### Growth Workflow (L0-L7) — target-driven, not full backfill

Evidence processing is goal-driven owner work, driven by the handoff intents. Process intents in priority order, always closing the loop back into the run:

```text
L0.5  demand → source discovery   (if intent.requires_source_discovery)
L1    extraction
L2    normalization
L3    deep analysis (parallel per intent)
L4    relations
L5    pack synthesis
L6    independent evaluation
L7    gate + seal + audit + terminal
```

- **L0.5 需求补源**: If an intent carries `requires_source_discovery: true`, the demand capability has no source coverage. Use the `source-discovery` skill to find and qualify candidate upstream sources for the demanded capability, then sync approved sources (`catalog-maintenance`) so the next run (or the same run's backlog) has evidence to consume. Bounded: discovery is limited to the demanded capability; do not mass-discover.
- **L3 并行分析**: Multiple intents in one run may dispatch `skill-deep-analysis` subagents in parallel (one session per skill or per intent, never shared). Keep synthesis and evaluation in different isolated sessions.
- **Backlog**: If an intent cannot be completed this run (missing source, missing analysis, missing relations), record it through the growth backlog (`catalog/growth/backlog.json`) so the next run resumes where this one stopped instead of restarting from scratch.
- **No-pack invariant**: `no_pack_clean` is legal only after the exhaustion proof shows no demand, no backlog, no new artifacts, and no relation potential. `insufficient_evidence` is the correct terminal when gaps remain.

### Resume

```bash
npm --prefix .synergy run nightly -- --resume <runId>
```

Validates:
- Run directory exists, chain is paused (not terminal)
- Baseline HEAD = current HEAD
- Branch/upstream unchanged
- Handoff descriptors/digests intact
- Active marker re-acquired atomically

Rejects: replay, tamper, stale, parallel runs.

### Gate / Seal / Audit / Terminal

Shared path (fresh + resume):

1. **Gate**: Requires `gateExecutor`. 29 trusted checks via `npm run`. Fail = `failed` terminal.
2. **Seal**: Builds manifest (`collectChangedPaths` + future run paths), writes `seal-manifest.json` and `seal.json`.
3. **Audit**: `auditPlanner` checks changed paths against `NIGHTLY_ALLOWED_PATHS`. Blocks `.synergy/` code changes, `.git/`, secrets. Not ready → `audit_blocked`.
4. **Terminal**:
   - Promoted candidates → `published`
   - Zero candidates + exhaustion proof valid → `no_pack_clean`
   - Gaps but budget not exhausted → `insufficient_evidence`
   - Writes `terminal.json` with `terminal_digest`

### Delivery Guard

After completed + published terminal:

```bash
node .synergy/skill/nightly-catalog-ops/scripts/lib/delivery-guard.mjs <runId> --fetch-remote
```

Pure-read validator (JSON output): `{ ready, errors, warnings, manifest_paths, baseline_head, current_head, remote_head, commit_message }`

Checks: terminal status=completed, outcome=published, audit ready, chain/schema/seal/manifest integrity, baseline=current HEAD, changed paths = manifest exactly (bidirectional), no code/secret/git/ordinary blockers, remote drift.

Commit message includes required `Co-authored-by` footer. Guard never stages, commits, or pushes.

### Git Delivery Protocol A (published)

1. `node .synergy/skill/nightly-catalog-ops/scripts/lib/delivery-guard.mjs <runId> --fetch-remote`
2. If `ready !== true`: **do not push**. Degrade to Protocol B (evidence commit), report guard errors. Guard failure means no delivery.
3. `git fetch origin main`; verify `origin/main == baseline_head` (TOCTOU). Drift → fail closed, no push, report.
4. Stage manifest paths exactly: `git add <path1> <path2> ...` (never `git add -A`).
5. Verify staged set == manifest paths exactly (bidirectional).
6. Commit with guard-provided `commit_message` (contains `Co-authored-by` footer).
7. `git push origin main` — never force push.
8. If the worktree still contains non-manifest changes after the commit (e.g. `.synergy/` code edits): stage and commit them separately with the required footer to restore a clean worktree. If it cannot be made clean, report (never leave it silently).

### Git Delivery Protocol B (non-published evidence commit)

1. Collect changed paths: `git status --porcelain -z --untracked-files=all`.
2. Filter to paths under `NIGHTLY_ALLOWED_PATHS` roots (`catalog/`, `docs/`, `reports/`, `assets/`, `README.md` — matching the audit allowlist; never `.synergy/`, `.git/`).
3. Stage those paths exactly (never `git add -A`); commit with message `nightly: record <terminal> run <runId>` + footer; `git push origin main` when network is available. On total network loss, keep the local commit and report.
4. **Self-heal**: before the next run starts, if local HEAD is ahead of `origin/main`, push normally to catch up and restore the baseline==remote precondition.

### Network Failure

All sources failing simultaneously → controller `blocked` (the only network stall condition). Evidence is still committed locally per Protocol B; push is best-effort and failures are reported.

### Exit Codes

- Container exit 0: `completed` with `published` or `no_pack_clean`
- Container exit 1: `blocked`, `failed`, `interrupted`, `audit_blocked`, `insufficient_evidence`, or pause

$ARGUMENTS
