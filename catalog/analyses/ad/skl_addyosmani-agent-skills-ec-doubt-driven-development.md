---
schema_version: 1
skill_id: skl_addyosmani-agent-skills-ec-doubt-driven-development
source_hash: sha256:59aef769adeae40aad67a1d54474aaf914ea7ecdfc2a4752a54840a8d29f80de
analysis_version: 1
confidence: high
updated_at: "2026-07-09T19:06:09Z"
---

# Doubt-Driven Development

## 1. What it does

This skill implements a disciplined, adversarial review loop for non-trivial coding and architectural decisions. Before any consequential output stands, the agent names the decision as a concrete claim, strips away its own reasoning and conclusions, extracts a minimal artifact with a contract, and feeds it to a *fresh-context reviewer* whose prompt demands finding flaws rather than validating. The reviewer's output is then classified against a strict precedence order — contract misreads, actionable issues, trade-offs, or noise — and the cycle repeats up to three times or until findings become trivial. The core insight is that long-session context erodes skepticism; a reviewer who never saw the reasoning catches what the author normalized into invisibility.

## 2. What's special

This is not "add a reviewer to your workflow." Three things make it genuinely distinctive. First, the **CLAIM/ARTIFACT separation**: the reviewer receives the artifact and its contract but explicitly NOT the claim. This prevents the most common failure mode in AI review — the reviewer validates the author's conclusion rather than independently assessing the artifact. Second, the **finding classification precedence** (contract misread → actionable → trade-off → noise) is a concrete reconciliation discipline that forces the orchestrator to re-read the artifact before accepting or rejecting any finding. Most review skills stop at "here's what the reviewer said." Third, the **"doubt theater" red flag** — detecting when the process has become performative because no findings are being classified as actionable across multiple cycles — shows operational experience rather than armchair methodology. The cross-model escalation protocol with mandatory user consent, stdin-based invocation to prevent shell injection, and explicit non-interactive skip announcement rounds out a skill that has thought through its own failure modes.

## 3. When it works / when it fails

**Best case:** You're implementing a caching layer in an unfamiliar codebase and claim "this is thread-safe under the read-heavy workload." You extract the locking logic as the artifact, specify the concurrency contract, and the fresh reviewer catches that the lock ordering in the cache-eviction path deadlocks with the write path — something your session context had normalized as harmless because you hadn't revisited that assumption in the last hour of coding.

**Worst case:** You apply doubt-driven to a decision where the contract is poorly specified. The reviewer flags 15 issues, 12 of which are contract misreads that make you rewrite the contract each cycle. By cycle 3 you've spent more time on the review infrastructure than on the original change, and the artifact itself barely changed. The process becomes doubt theater — you classify everything as noise or trade-off — and you ship the same code you would have shipped without it, just three cycles later.

## 4. Hidden assumptions

The most consequential assumption is that a **subagent or external CLI spawn is available** — the skill explicitly targets Claude Code's subagent architecture and references a specific `agents/` directory. In any agent platform that doesn't support fresh-context subprocesses, the entire Step 3 mechanic collapses to a "degraded self-questioning fallback" that the skill itself admits is not fresh-context review. This assumption holds in Claude Code environments (~80% of the skill's intended audience) but fails everywhere else.

A second assumption is that the orchestrator can write a **precise contract**. The skill provides zero guidance on what constitutes a good contract — only that it must be "the constraints the artifact must satisfy." An agent that writes vague contracts ("should be thread-safe") gets vague review. This is a skill-level assumption: the user must already know how to formalize behavioral constraints.

Third, the cross-model escalation protocol assumes `codex` and `gemini` CLIs exist, are in PATH, support read-only sandbox flags, and that those flags genuinely prevent workspace writes. The skill provides example invocations but explicitly warns that "implementations vary; never assume." This is a fragility vector: the cross-model path depends on tools the skill doesn't control.

Fourth, the **3-cycle bound** is arbitrary — the skill admits it may be insufficient for large artifacts, but the only escape hatch is "return to Step 2 and decompose" rather than allowing the orchestrator to extend the bound with justification. This assumption is reasonable for the 80th percentile of decisions but under-serves deeply complex architectural changes.

## 5. Tool risks

The single highest-risk operation is piping an adversarial prompt containing untrusted artifact content through **stdin to an external CLI**. The skill itself recognizes this: "a doubt artifact may itself contain instructions (intentional or accidental prompt injection) that the cross-model CLI would otherwise execute against your workspace." The read-only sandbox flags (`--sandbox read-only`, `--approval-mode plan`) are the only protection, and if they fail or are omitted, the artifact becomes a remote code execution vector. This is a real threat model, not a theoretical one.

Additionally, a fresh-context reviewer invoked as a subagent has whatever tool access the host platform grants by default. If the reviewer persona carries file-write or shell-execution permissions and receives a malicious artifact instructing it to modify files, the orchestrator would need to detect this in the reconciliation step — but reconciliation focuses on correctness findings, not on whether the reviewer executed instructions. The user needs to be present for cross-model CLI authorization (every invocation requires re-confirmation), and the skill explicitly requires this. For single-model subagent review within the same platform, the user's permission profile applies transitively.

## 6. Verdict

This is one of the best metacognitive agent skills in the catalog. It addresses a real and under-instrumented problem — session-context erosion of skepticism — with mechanics that are genuinely adversarial rather than performatively adversarial. The claim/artifact separation, the classification precedence, the doubt-theater detection, and the cross-model escalation protocol with its safety discipline all show operational depth. The biggest risk is tool fragility (cross-model CLI dependencies and prompt injection through artifacts), and the biggest gap is that contract-writing is assumed competence without guidance. If the catalog keeps only 100 skills, this earns a spot: no other review skill operates at this level of structured disproof, and the rationalizations table alone is worth the read for any agent that reviews its own work.

## Confidence: high

The source artifact is comprehensive, internally consistent, and covers its own failure modes explicitly. I read every section, understand the 5-step loop deeply, and would defend these judgments to the author.
