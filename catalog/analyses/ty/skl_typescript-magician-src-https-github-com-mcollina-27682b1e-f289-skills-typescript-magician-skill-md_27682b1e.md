---
schema_version: 1
skill_id: skl_typescript-magician-src-https-github-com-mcollina-27682b1e-f289-skills-typescript-magician-skill-md_27682b1e
source_hash: sha256:bbd539a21e1887beed388243971f12c028d9b79a
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T01:28:00+08:00"
---

# TypeScript Magician

This is an agent-facing TypeScript type-system expert skill, authored by Matteo Collina, focused squarely on eliminating `any` types and replacing them with strict, precise alternatives. It bundles a concrete workflow (capture errors with `tsc --noEmit`, diagnose root cause, craft a fix, validate at call sites, re-verify) with a curated reference tree of 15 rule files covering generics, conditional types, `infer`, mapped types, template literal types, branded types, type narrowing, function overloads, and error diagnosis. The skill is a prompt — it tells an agent how to think about TypeScript problems, not what pre-scripted answer to give.

## Why it matters

The skill is not revolutionary in concept — any competent TypeScript developer can describe the same workflow of "run tsc, find the error, fix it." What earns it attention is the breadth and curation of its reference files. It covers essentially every advanced TypeScript pattern an agent might need to draw on during a type-strict refactor: variance, distribution rules, builder patterns with chainable methods, deep inference with `const` type parameters, the `F.Narrow` pattern, opaque brand types, and function overloads. That is a lot of ground, and covering it all in one skill means an agent doesn't need to hop between five different resources.

The downside: the skill's actual instructions are thin. It says "identify the root cause," "craft precise solutions," and "validate," but it does not teach the agent how to diagnose. The reference files do the teaching — the main SKILL.md is a routing table. If an agent loads this skill without also reading the reference files, it gets a checklist, not expertise. The value depends entirely on whether the agent system surfaces the references during execution.

## Where it helps, where it hurts

**Best-case scenario:** An agent is working through a legacy TypeScript codebase with scattered `any` annotations, returning `any` from API calls, and `as any` casts hiding real type mismatches. The skill's workflow gives the agent a systematic approach: capture all errors in one pass, triage by root cause, apply patterns from the reference catalog (type guards for unknown JSON, branded types for string identifiers, utility types for common transformations), then re-verify. The before/after examples in the skill — particularly the `fetchUser` pattern with `isUser` type guards — are genuinely good templates for the most common real-world case: narrowing `unknown` API responses.

**Worst-case / failure scenario:** An agent encounters a deeply nested conditional type where `infer` fails unexpectedly because of distributivity over a union, and the actual fix requires understanding whether the conditional should distribute or not. The skill references "variance and distribution rules" and has a `conditional-types.md` and `infer-keyword.md` reference, but the agent must correctly identify that distributivity is the culprit, navigate to the right reference, and synthesize a solution. An agent that can already do that probably doesn't need this skill — and an agent that can't will misdiagnose the problem and either give up or apply a dangerously wrong fix (e.g., widening a type to `unknown` to make tsc happy rather than resolving the distributive behavior). The skill's "run tsc first" strategy also assumes a project where `tsc --noEmit` produces useful output — in a codebase using SWC or esbuild for transpilation and only running tsc in CI, the agent might face hundreds of cascading errors where the true root cause is one `@ts-ignore` ten files away.

## What it quietly assumes

- **The host project has a functioning `tsc` CLI with a `tsconfig.json` that reflects the actual build.** This holds for most TypeScript projects, but not all — many modern setups use alternative compilers for speed and only run tsc as a lint pass in CI. The skill makes no mention of project-specific build tooling.
- **The agent understands TypeScript error messages at a fluent level.** The skill says "identify the root cause" but does not explain how to read tsc error codes, trace type expansions, or distinguish between a symptom error and a root error. This is a senior-developer-level assumption that excludes agents without deep TS knowledge.
- **Edit-and-recompile is a viable, fast iteration loop.** In a large monorepo with minutes-long type-checking, following the "fix, then re-verify with tsc" loop is impractical. The skill gives no guidance on scoping fixes to stay within a fast feedback loop.
- **The goal is always strict typing.** There are legitimate cases where `any` is the least-bad option (migrating a JS module incrementally, interfacing with untyped third-party code, performance-sensitive hot paths where type gymnastics would harm readability). The skill frames `any` as always wrong, which is ideologically pure but sometimes tactically impractical.
- **File modifications are isolated and non-destructive.** The skill assumes the agent can safely edit source files and recompile without breaking unrelated code, running tests, or coordinating with other in-progress work.

## What could go wrong

The skill calls for running `tsc --noEmit` and editing source files. The practical risks:

- **Semantically wrong but type-correct fixes.** An agent could replace `any` with an incorrect strict type that compiles but misrepresents the data shape. The worst real outcome: a downstream consumer trusts the new strict type, ships code, and hits a runtime `TypeError` in production because the type was too narrow or too wide. The `tsc --noEmit` validation gate only catches structural errors, not semantic ones.
- **Over-engineered types that harm readability.** An agent faced with "eliminate `any`" as a mandate might produce a correct but unmaintainable web of conditional types, mapped types, and template literal unions that no human on the team can understand or modify. This skill doesn't include a calibration rule for when to stop.
- **File system churn with no safety net.** The skill assumes the agent can modify files and recheck with tsc. If the agent edits 15 files chasing a cascading error chain and the final fix is wrong, the user is left with a polluted working tree and no easy revert path. At minimum, an agent should commit or stash clean work before starting.

The user does not need to be present during the tsc-and-fix loop, but should absolutely review changes before they land — especially any changes that touch business-logic type definitions, runtime type guards, or module augmentation declarations. Those have blast radius beyond the file being edited.

## Bottom line

This is a well-scoped, credible TypeScript skill from a trustworthy author, and its `any`-elimination focus is sharper than a general "help with TypeScript" prompt. It earns a spot in a 100-skill catalog because it covers a genuinely high-value, high-frequency task (tightening types in the real world) and its reference catalog is comprehensive enough to replace several narrower skills. The biggest risk is that the skill's value is almost entirely in its references, not its instructions — if an agent system doesn't surface reference files, the skill reduces to a four-bullet checklist wrapped in good branding.

## Confidence: medium

I read the full source artifact, including the 15 referenced rule file topics, but I have not read each reference file itself. The main SKILL.md is clear about its scope and workflow, but the real quality depends on the content of those references, which I could not evaluate. A higher-confidence analysis would require reading at least the top 5 reference files to judge whether they actually deliver on the patterns they promise.
