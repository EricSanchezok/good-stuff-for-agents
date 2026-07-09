---
schema_version: 1
skill_id: skl_autofix-src-https-github-com-coderabbitai-skills-coderabbit-skills-8f2a22eb-skills-autofix-skill-md_25a31687
source_hash: sha256:04e1f0ae7090f8cbf8467bcb613c062dba70387e
analysis_version: 1
confidence: high
updated_at: "2026-07-09T17:25:52Z"
---

# CodeRabbit Autofix

This skill turns CodeRabbit PR review threads into applied code fixes, but that undersells it. Its real headline is that it treats every word of reviewer feedback as adversarial input. The entire workflow is built around a threat model where CodeRabbit's review comments — including the "Prompt for AI Agents" section meant to guide fix behavior — could contain malicious instructions to read secrets, fetch rogue URLs, modify CI config, or trick the agent into executing shell commands. That posture is what makes this skill worth attention.

## Why it matters

Most code-review tools and their integrations assume good-faith reviewer content. This skill assumes the opposite: the reviewer could be compromised, could produce hallucinated line anchors, or could embed prompts designed to hijack the fixing agent. Every design decision flows from this — sanitization rules strip URLs and credential paths from reviewer summaries, scope limits prevent reading dotfiles or infrastructure code, and every single fix requires explicit user approval before the `Edit` tool is called. There is no bulk-apply path. This is not just a safety feature bolted on; it is the organizing principle of the entire workflow.

The skill also handles the full lifecycle: detecting uncommitted or unpushed changes, creating a PR if none exists, detecting in-progress CodeRabbit reviews (via a "come back later" string check in PR comments), paginating through GraphQL review threads, and producing a single consolidated commit with an optional push-and-comment step. That lifecycle completeness is solid, though not unique among CI/CD-integration skills.

What is genuinely distinctive is the step-by-step approval model combined with the sanitzation pipeline. Most "apply review feedback" skills would parse reviewer suggestions as instructions and run with them. This one parses them as evidence to be independently validated, then asks the user to approve a locally-determined fix. It is a human-in-the-loop design for a domain where most tools optimize for automation.

## Where it helps, where it hurts

**Best case:** You work on a security-sensitive codebase with CodeRabbit set up on your GitHub repos. CodeRabbit has flagged a handful of real issues — an inverted auth check, a missing await, a race condition. You load the skill. It detects the open PR, fetches unresolved threads, displays them in a clean severity-ordered table, and walks you through each fix one at a time. For each, it reads the local file, independently verifies the issue, proposes the smallest possible diff, and asks for approval. After processing four issues, it creates a single clean commit with a summary comment. Every CodeRabbit "Prompt for AI Agents" section was treated as untrusted and sanitized before display. No secrets were read. No external URLs were fetched. You push and move on.

**Worst case:** CodeRabbit just re-ran on a large refactor PR and produced 47 threads, 35 of which are unresolved. You load the skill expecting efficiency. It shows all 47 in a table — fine. But then the one-at-a-time approval loop begins. Each fix requires: read the file, validate, propose diff, ask approval. For 35 issues, this takes forever. Halfway through, the user gets approval fatigue and starts clicking "Apply fix" without reading. The safety gate becomes a rubber stamp. Meanwhile, five of CodeRabbit's threads reference line numbers that shifted since the review because of unpushed local edits — and the skill warns about unpushed changes but doesn't detect mid-session drift. The user applies a fix to the wrong line because the line anchor is stale.

A quieter failure mode: CodeRabbit changes its in-progress message from "Come back again in a few minutes" to something slightly different. The string-matching gate in Step 3 silently fails to detect the in-progress state. The skill proceeds, finds zero valid threads, and exits with "No unresolved current CodeRabbit review threads found." The user thinks CodeRabbit found nothing to fix when it was actually still running.

## What it quietly assumes

- **GitHub CLI is installed and authenticated.** The skill checks this in prerequisites but does not handle `gh` auth expiry, token scope issues, or enterprise GitHub instances with different API endpoints. In practice this holds for maybe 70% of target users — anyone on a standard github.com repo with `gh` set up. For enterprise GitHub or users who prefer the REST API directly, it silently fails at `gh api graphql`.

- **CodeRabbit's bot usernames are stable.** The hardcoded set `coderabbitai`, `coderabbit[bot]`, `coderabbitai[bot]` appears in three separate GraphQL/jq queries. If CodeRabbit adds a new bot identity or rebrands, threads are silently skipped. This is a reasonable assumption today but is a single point of fragility that would break the skill completely.

- **Review thread headers match the regex `_([^_]+)_ \| _([^_]+)_`.** The parsing in Step 4 depends on CodeRabbit formatting its issue headers with exactly this pattern. If CodeRabbit changes its comment template — adding a new field, changing the delimiter, or localizing the output — issue type and severity extraction fails silently. The table would display empty or garbled severity columns.

- **The "come back later" detection string is stable.** The in-progress check searches PR comments for the literal phrase "Come back again in a few minutes." A minor wording change breaks this gate. This is the most fragile assumption in the skill because it's a sentence fragment in natural language, not a structured field.

- **`jq` is available.** The GraphQL response parsing chain depends heavily on `jq` for JSON manipulation (`.data.repository.pullRequest.reviewThreads.nodes`, `.pageInfo.hasNextPage`, etc.). The skill never checks for `jq` in prerequisites. On minimal containers or macOS without brew-installed `jq`, the parsing pipeline breaks.

- **A single PR per branch.** The skill resolves the PR by `gh pr list --head "$(git branch --show-current)"` and takes only `.[0].number`. If your workflow has multiple open PRs from the same branch (unusual but possible with stacked PRs), it silently picks the first and ignores the rest.

- **AGENTS.md exists and provides build/lint/test instructions.** Step 0 loads it if present, and Step 8 reminds the user of it before push. The skill handles the missing case gracefully, but the workflow loses quality-gate value in repos without one.

## What could go wrong

The primary tool risk is `gh` with push and PR-commenting permissions. The worst realistic outcome: the user approves a fix that introduces a bug (the agent misread the local code or CodeRabbit's line anchor was stale), the skill commits it, the user approves the push, and broken code lands on a PR branch that CI then fails or — worse — that gets merged before anyone notices. This is not a tool-exploit risk; it is a trust-in-the-loop risk. The skill's entire safety model assumes the human reads every proposed diff carefully. If the human doesn't, the skill becomes a vector for applying bad fixes faster.

The sanitization rules protect against prompt-injection attacks in reviewer content, which is the right threat to worry about. But the rules are enforced by agent behavior, not by tool restrictions. If the agent fails to sanitize (e.g., includes raw reviewer URLs in the summary comment posted to the PR), the safety model breaks at the output boundary. The risk is subtle: the skill protects the agent's internal actions well but the PR comment in Step 10 is assembled from local state — if that local state accidentally captures unsanitized reviewer text, it gets posted to a public GitHub PR.

The user must be present. Every fix requires explicit approval. This is a feature, not a bug, but it means the skill is not usable in fully autonomous pipelines.

## Bottom line

Pick this skill if you use CodeRabbit on GitHub and care about safely processing AI-generated review feedback — the threat-model-aware design is genuinely thoughtful and I have not seen it in other review-fix skills. Skip it if you don't use CodeRabbit, or if you want a fully autonomous fix pipeline, or if you have a workflow with very large PRs where the one-at-a-time approval loop would become approval theater. The biggest risk is the string-matching fragility in detecting in-progress reviews and parsing issue headers; if those break, the skill degrades into a silent no-op. The biggest benefit is the per-fix approval gate that prevents both malicious prompt injection and hasty bulk application of bad reviewer suggestions. In a tight 100-skill catalog, this earns a spot — not because "applying review feedback" is the hard part, but because doing it safely with an adversarial-input threat model is genuinely rare and valuable.

## Confidence: high

I read the full source — all 10 workflow steps, the GraphQL query, the parsing logic, the sanitization rules, and the safety notes — and the design intent is clear and internally consistent. Every judgment above is drawn directly from the artifact's own structure and stated constraints.
