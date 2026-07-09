---
schema_version: 1
skill_id: skl_skill-creator-src-https-github-com-microsoft-skill-f5dab2cc-3e-github-skills-skill-creator-skill-md_f5dab2cc
source_hash: sha256:8377383735afeb36e4b55a9937876b427785db9e
analysis_version: 1
confidence: high
updated_at: "2026-07-10T01:30:00+08:00"
---

# Skill Creator (Microsoft)

This is a meta-skill: its job is to teach an AI agent how to create other skills, specifically Azure SDK wrapper skills conforming to Microsoft's internal skill repository conventions. It is not a general-purpose skill-creation guide. It is a deeply institutional document encoding Microsoft's Azure authentication policies, directory layouts, testing harness expectations, and documentation update procedures. If you are inside Microsoft's `microsoft/skills` repo adding an Azure SDK skill, this is your required playbook. If you are anywhere else, most of this document is irrelevant noise.

## Why it matters

The skill occupies an unusual architectural role. It is a bootstrap artifact — the skill that creates skills — which makes it structurally significant if you are operating inside the ecosystem it targets. Its real value is enforcement of cross-skill consistency: every Azure SDK skill it produces will have the same authentication patterns, the same section ordering, the same `DefaultAzureCredential` callout block, the same Best Practices rules, and the same test structure. This is less a creative guide and more a compliance checklist dressed as a skill.

Outside Microsoft's repo, the value collapses. The skill makes no attempt at generality. Its "Core Principles" section (conciseness, progressive disclosure, degrees of freedom) contains genuinely useful meta-skill design advice, but these sections total roughly 50 lines out of a 400+ line document. The remaining 350+ lines are Microsoft-specific infrastructure mandates: symlink schemes under `skills/<language>/<category>/`, `pnpm harness` test commands, `docs-site/` extraction scripts, `microsoft-docs` MCP server usage, and exact authentication callout blocks that must be copied verbatim.

A competitor's skill-creator skill could cover the general principles in a quarter of the length and work anywhere. This one covers Azure with high fidelity and nothing else.

## Where it helps, where it hurts

**Best-case scenario:** You are a developer or agent working inside the `microsoft/skills` repository, and you need to add a new Azure SDK skill for a language Microsoft already supports (Python, .NET, Java, TypeScript, Go, Rust). You load this skill, provide an SDK package name, and it walks you through: verifying current API patterns via `microsoft-docs` MCP search, structuring sections in the mandated order, inserting the verbatim authentication callout, creating acceptance criteria and scenarios, setting up symlinks, updating README counts, and regenerating the docs site. The output will be indistinguishable from existing skills. That is the point.

**Worst-case scenario:** An agent loads this skill to "create a skill" for a non-Azure domain — say, a database migration workflow or a frontend component library. The skill wastes enormous context window space on Azure authentication patterns, Python `DefaultAzureCredential` rules, Rust `cargo add` gate checks, and symlink-to-category procedures that have no meaning outside the Microsoft repo. The agent may follow the checklist literally and create empty Azure boilerplate alongside whatever it was actually trying to do. Worse, the agent may try to create `.github/skills/` directories, `tests/scenarios/` harness structures, and `docs-site/` extraction scripts in a repo that has none of that infrastructure, producing a mess of broken scaffolding.

## What it quietly assumes

The assumptions here are massive and mostly invisible to the text itself because the skill was written by and for people already inside the system:

- **The Microsoft skills repo structure exists.** It assumes `.github/skills/` as the skill root, `skills/<language>/<category>/` with symlinks, `tests/scenarios/<name>/` with `acceptance-criteria.md` and `scenarios.yaml`, and a `docs-site/` with `extract-skills.ts`. None of these paths exist in any other repository. This assumption holds in exactly one repository on Earth.
- **The `microsoft-docs` MCP server is available.** The skill repeatedly instructs agents to search `microsoft-docs` MCP for current API patterns. Without this server, an essential verification step is impossible. This assumption holds for Microsoft-internal agents and partners but fails everywhere else.
- **The `pnpm harness` testing framework exists.** The skill references `pnpm harness <skill-name> --mock --verbose` and `--ralph` mode extensively. This is a custom test harness in the Microsoft repo. An agent following these instructions outside that repo will run commands that do nothing or error out.
- **Azure SDK expertise is the norm.** The skill assumes you understand the Microsoft Entra identity ecosystem, `DefaultAzureCredential` chains, `ManagedIdentityCredential` vs `WorkloadIdentityCredential`, and Azure's standard verb conventions (`create`, `upsert`, `get`, `list`, `delete`, `begin`). These are reasonable assumptions for Azure developers but completely exclude anyone else.
- **All skills are Azure SDK skills.** Despite a brief mention of "domain skills" that can use their own judgment for section ordering, the entire document's structure, checklists, and conventions are Azure-SDK-first. A domain skill created with this guide would bear unnecessary Azure scaffolding.
- **A specific auth policy is non-negotiable.** The skill mandates that `DefaultAzureCredential` with `with` context managers is the only acceptable pattern, demoting API-key authentication to a legacy subsection. This is a policy decision, not a technical requirement, and it is enforced through "verbatim" callout blocks that must not be paraphrased.

These assumptions are fine-tuned for the Microsoft skills repo and break completely anywhere else. The skill would be genuinely harmful loaded into a general-purpose agent outside that context.

## What could go wrong

The skill itself is a document — it doesn't execute tools. But the instructions it gives an agent carry real risks:

- **Filesystem pollution.** The skill instructs agents to create `.github/skills/<name>/`, symlinks under `skills/<language>/<category>/`, `tests/scenarios/<name>/`, and update `README.md` with count increments. An agent following these instructions in the wrong repo creates directory trees and symlinks that don't belong, potentially colliding with existing structures.
- **MCP dependency failure.** The skill's quality gate depends on `microsoft-docs` MCP search. With the wrong MCP server or no server at all, the agent either skips verification (producing stale API patterns) or fails entirely. The redirect back to the user here is explicit — "Users MUST provide SDK package name, documentation URL, or repository reference" — but this guardrail only works if the agent reads it as a hard stop, which many won't.
- **Blind copy-paste of authentication blocks.** The "Required Authentication & Lifecycle Callout" must be inserted "verbatim" with explicit placement rules. An agent that mechanically inserts this block into a skill for an SDK that doesn't support Entra ID at all (some legacy services) will produce misleading documentation. The skill acknowledges this edge case with fallback rules, but the fallback is a single sentence buried in a parenthetical — easily missed.
- **Test harness fragility.** The `pnpm harness` commands assume a specific Node.js project structure with installed dependencies. Running these outside the Microsoft repo produces npm errors, not meaningful test results. There is no fallback for repos without `pnpm`.

The user must be present for any filesystem write operations in a repo they care about. The skill provides no sandboxing or dry-run guidance.

## Bottom line

This is a high-quality institutional meta-skill that does exactly one job well: it ensures every Azure SDK skill in the Microsoft skills repo follows the same conventions, uses the same auth patterns, and passes the same test harness. For that single use case, it is irreplaceable. For the Skill Intelligence Catalog, this is a reference artifact rather than a reusable skill — its value is in demonstrating how a large organization enforces cross-skill consistency through a meta-skill template, not in providing general-purpose skill-creation guidance. If the catalog could only keep 100 skills, this one does not earn a spot unless the catalog has a dedicated "skill design methods" domain. The biggest benefit is its brutally effective consistency enforcement; the biggest risk is that its assumptions are so deeply embedded in Microsoft's infrastructure that loading it anywhere else wastes context and produces broken scaffolding.

## Confidence: high

I read the full 400+ line source artifact, understand the Azure SDK ecosystem it targets, and can identify precisely where the boundary between general meta-skill advice and Microsoft-specific infrastructure lies. The skill is complete and unambiguous about what it is and who it is for.
