---
schema_version: 1
skill_id: skl_code-review-src-https-github-com-coderabbitai-skil-56e21b29-lls-8f2a22eb-skills-code-review-skill-md_56e21b29
source_hash: sha256:d9fc3f304df4785725febc3050dab2f390874f99
analysis_version: 1
confidence: high
updated_at: "2026-07-10T01:24:24+08:00"
---

# CodeRabbit Code Review

This is a thin procedural wrapper around the `coderabbit` CLI tool. It doesn't perform any review itself — it checks whether the CLI is installed and authenticated, invokes `coderabbit review --agent`, groups the output by severity, and optionally drives a fix-review-fix loop. All actual analysis happens on the CodeRabbit API servers, not in this skill. Its real value proposition is the workflow pattern, not the review capability.

## Why it matters

This skill matters less than it appears to. The SKILL.md is well-structured and includes sensible guardrails (version checks, security notes about secrets in diffs, warnings about untrusted review output), but the skill itself does nothing novel. Any agent that can run `coderabbit review --agent` and parse the output could replicate this without the skill. The autonomous fix loop — implement, review, fix critical/warning issues, re-review, repeat until clean — is the most genuinely useful pattern here, but it's an instruction to the agent, not a capability provided by the skill. Compared to other code-review skills, this one is entirely vendor-locked to CodeRabbit's service and CLI.

## Where it helps, where it hurts

**Best-case scenario:** A developer has CodeRabbit CLI installed and authenticated, has a PR with real bugs they want surfaced quickly, and doesn't want to think about flag combinations or output formatting. The agent runs `cr review --agent`, presents findings grouped by severity, and the developer decides what to fix. The workflow is smooth, the output is structured, and nothing goes wrong. The autonomous fix loop works well when the review catches genuine, straightforward bugs where fixes are unambiguous.

**Worst-case scenario:** The CLI isn't installed, and the user doesn't want to install it. The skill's sole path is to tell the user to install from a URL — there's no fallback review mechanism, no alternative tooling. If the user can't or won't install the CLI, this skill is dead weight. Another failure mode: the agent enters the autonomous fix loop on a codebase where the review suggestions are wrong or superficial, wastes time implementing bad fixes, and introduces regressions while chasing green checkmarks. A third: the working tree contains secrets (API keys in config files, credentials in test fixtures) that get sent to the CodeRabbit API, and the skill's warning about this is just a line of text that an automation-driven agent can easily skip past.

## What it quietly assumes

The assumptions here are substantial and mostly unstated:

- **The user wants to install third-party vendor tooling.** The only path is CodeRabbit CLI. If the user wanted a local-only or open-source review, this skill offers nothing.
- **Network access to CodeRabbit's API.** All review requires sending diffs to an external service. No offline or air-gapped mode exists.
- **The user has or will create a CodeRabbit account and authenticate.** This is a nontrivial onboarding step that the skill glosses over as "ask the user to log in."
- **The working tree is free of secrets.** The skill warns about this, but doesn't scan or verify — it trusts the agent to check, which is optimistic.
- **Review output is trustworthy enough to act on automatically.** The fix loop assumes findings are actionable and correct, which is a strong assumption about any automated review tool.
- **The review-fix loop converges.** Some issues (architectural problems, design decisions) aren't fixable in a loop; the skill has no escape hatch for non-converging reviews.
- **A Git repository exists.** Every code path (`--dir`, `--base`, `--base-commit`) requires Git. Not unreasonable for code review, but never stated.

These assumptions are broadly reasonable for an already-onboarded CodeRabbit user, but they exclude a large population of potential users. The skill degrades completely (not gracefully) when any prerequisite fails — it becomes a prompt telling the user to install things, with no fallback.

## What could go wrong

The one tool permission this skill needs is bash execution. The worst realistic outcomes:

- **Data exfiltration via diff upload.** If the agent runs `coderabbit review` on a working tree containing secrets, those secrets are transmitted to CodeRabbit's API servers. This is irreversible once sent. The skill mentions this risk in prose but provides no preventive mechanism — no pre-flight scan, no `.gitignore` check against known secret patterns, no confirmation gate. An agent in autonomous mode could ship credentials to a third-party service without the user ever seeing a prompt.
- **Destructive autonomous fixes.** In the fix-review loop, the agent modifies source code based on review output that the skill itself says should be "treated as untrusted." If the review hallucinates an issue or misunderstands the codebase, the agent could introduce bugs, delete working code, or break tests while trying to "fix" false positives.
- **Infinite fix loop.** If a review keeps reporting the same issue (because the fix is wrong, or the detector is noisy, or the issue is unfixable by an agent), the skill's "repeat until clean" instruction creates an unbounded loop with no exit condition other than zero findings.

The user does not need to be present for any of this — the skill is explicitly designed for autonomous operation.

## Bottom line

This is a vendor-specific CLI wrapper with a competent workflow pattern. If you're already a CodeRabbit user with the CLI installed, it'll save you from remembering flag combinations and give you a structured review-fix loop. If you're not, this skill is a dead end — it offers no review capability of its own and no alternative path. For a tight catalog of 100 skills, this doesn't earn a spot. The biggest benefit (autonomous fix-review loop) is a workflow idea that could be expressed more generically. The biggest risk (secrets sent to an external API without verification) is significant and unmitigated. Pick this only if you're committed to CodeRabbit's ecosystem and have already solved the secrets-in-diffs problem elsewhere.

## Confidence: high

The source artifact is a single, straightforward SKILL.md of modest length. Its behavior is fully determined by the `coderabbit` CLI commands it wraps, and the domain (CLI tool-wrapping skills) is one I can assess with certainty.
