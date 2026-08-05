---
description: "Execute single-path Nightly Catalog v3+ production controller with pause/resume"
agent: "synergy"
---

## /nightly — V3+ Production Run Orchestrator

### Fresh Invocation

```bash
npm --prefix .synergy run nightly
```

The Node controller owns the fixed lifecycle:

```text
init → maintenance → issues → context → targets → gate → seal → audit → terminal
```

Do not invoke phases independently.

### Pause Protocol

If Issues produce `newUnassessed`:

- Controller writes `paused_for_assessment` with `issue-assessment-handoff.json`
- Releases active marker
- Return: `{ status: "paused_for_assessment", new_unassessed, workload_path, handoff_digest, events }`

Outer Agent:
1. Reads handoff descriptors
2. Loads `skill/catalog-growth-ops/SKILL.md` for Issue owner procedures
3. Dispatches `issue-intake` subagents per accepted issue
4. Writes drafts via canonical `writeIssueDrafts` (write-once, coverage-binding)
5. Resumes: `npm --prefix .synergy run nightly -- --resume <runId>`

If nonzero `targetSelector` intents exist but no `targetExecutor`:

- Controller writes `paused_for_targets` with `target-execution-handoff.json`
- Releases active marker
- Return: `{ status: "paused_for_targets", intents, handoff_digest, events }`

Outer Agent:
1. Reads handoff for `context_digest`, `intents`, `required_owners`, `evidence_budget`, `session_isolation`
2. Dispatches owner skills per L0-L7 workflow priority
3. Writes target results via canonical target-result writer:
   ```bash
   node .synergy/skill/nightly-catalog-ops/scripts/lib/target-result-writer.mjs --input <path>
   # or via stdin:
   echo '{"runId":"...","contextDigest":"...","intents":[...],"candidateResults":[...],"intentResults":[...],"sessionDescriptors":[...]}' | node .synergy/skill/nightly-catalog-ops/scripts/lib/target-result-writer.mjs
   # or via npm:
   npm --prefix .synergy run nightly:target-result -- --input <path>
   ```
4. Resumes: `npm --prefix .synergy run nightly -- --resume <runId>`

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

### Resume Dispatch

`paused_for_assessment` resume:
- Validates `validateIssueDrafts` (coverage, binding, forbidden keys)
- Runs `issueExecutor` with drafts present (it finalizes)
- Writes `issues-finalized.json` (new output, does not overwrite `issues-prepared.json`)
- Writes context phase event (transition from pause, not overwriting prior events)
- Continues `runContextStage` → `runSelectAndPrepareTargetsStage` → `runGateSealAuditTerminalStages`

`paused_for_targets` resume:
- Validates `target-intents.json` exists and intents are non-empty
- Requires `targetExecutor` (rejects if null)
- Executes targets, writes `targets-finalized.json`
- Writes targets phase event (transition from pause)
- Continues into `runGateSealAuditTerminalStages`

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
node .synergy/skill/nightly-catalog-ops/scripts/lib/delivery-guard.mjs <runId> [--fetch-remote]
```

Pure-read validator (JSON output): `{ ready, errors, warnings, manifest_paths, baseline_head, current_head, remote_head, commit_message }`

Checks: terminal status=completed, outcome=published, audit ready, chain/schema/seal/manifest integrity, baseline=current HEAD, changed paths = manifest exactly (bidirectional), no code/secret/git/ordinary blockers, remote drift (optional).

Commit message includes required `Co-authored-by` footer. Guard never stages, commits, or pushes.

### Outer Agent Git Delivery (after delivery-guard ready=true)

1. `git fetch origin main`
2. Verify `origin/main` = baseline HEAD (TOCTOU)
3. Stage manifest paths exactly: `git add <path1> <path2> ...` (never `git add -A`)
4. Commit with guard-provided `commit_message`
5. `git push origin main` (never force push)

### Blocked / Insufficient Evidence

Do NOT commit or push. Report the terminal status and error summary to the user.

### Exit Codes

- Container exit 0: `completed` with `published` or `no_pack_clean`
- Container exit 1: `blocked`, `failed`, `interrupted`, `audit_blocked`, `insufficient_evidence`, or pause

$ARGUMENTS
