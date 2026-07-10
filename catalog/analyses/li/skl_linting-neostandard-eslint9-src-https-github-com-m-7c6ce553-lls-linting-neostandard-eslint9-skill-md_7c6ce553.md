---
schema_version: 1
skill_id: skl_linting-neostandard-eslint9-src-https-github-com-m-7c6ce553-lls-linting-neostandard-eslint9-skill-md_7c6ce553
source_hash: sha256:f4b7f4b528392762c35627e979880c7d9f47a6e3
analysis_version: 1
confidence: high
updated_at: "2026-07-10T22:00:00+08:00"
---

# linting-neostandard-eslint9 (mcollina/skills)

This is not a skill. It is a quickstart snippet — three commands and six lines of JavaScript — wrapped in a SKILL.md file and padded with section headers. The total actionable content is: install `eslint@9` and `neostandard`, create an `eslint.config.js` with `export default neostandard()`, and run `npx eslint .`. Everything else is either generic linting advice ("prefer reproducible linting with pinned major versions") or pointers to five referenced rule files that aren't included in the document body.

## Why it doesn't earn its keep

There is a real need for a skill that teaches agents how to configure ESLint v9 flat config for JavaScript and TypeScript projects. The flat config migration is genuinely confusing, neostandard is a legitimate alternative to the deprecated `standard` package, and agents frequently produce broken ESLint configurations. This skill gestures at that need but doesn't meet it.

The five referenced rule files — `rules/neostandard.md`, `rules/eslint-v9-flat-config.md`, `rules/migration-from-standard.md`, `rules/migration-from-legacy-eslint.md`, `rules/ci-and-editor-integration.md` — are listed but not included. If those files are substantial (covering custom rule configuration, TypeScript parser setup, monorepo patterns, migration edge cases, pre-commit hook integration), the skill might be useful when loaded with all its references. But the SKILL.md itself gives an agent no way to evaluate whether those references exist or what they contain. The skill's value is entirely dependent on content that may or may not be accessible.

The "core principles" section is the hollowest part: "Prefer reproducible linting with pinned major versions. Keep config minimal and explicit. Use flat config for ESLint v9 projects. Treat lint failures as quality gates in CI. Enable auto-fix for local workflows, but validate with non-fix CI runs." Every one of these could describe any linting setup for any language with any linter. There's nothing specific to neostandard, ESLint v9, or JavaScript.

## Where it helps, where it hurts

**Best-case scenario**: An agent has never heard of neostandard and needs to quickly get ESLint v9 running with a Standard-like rule set. The skill provides the exact install commands and the minimal config file faster than searching npm or reading neostandard's README. If the referenced rule files are available and well-written, loading them in sequence gives progressively deeper coverage. For the specific case of "I want standard linting on ESLint v9 and don't want to think about configuration," this skill gets the job done in 30 seconds.

**Worst-case scenario**: Literally anything beyond the happy path. TypeScript? The skill mentions TypeScript in its description but provides zero TypeScript-specific configuration — no `typescript-eslint` parser setup, no TS-specific rules. Monorepo? No guidance. Custom rule overrides? The skill says "add any project-specific rule overrides on top" but never shows how `neostandard()` returns a config array you'd spread or merge. Existing `.eslintrc` to migrate? Pointed to a referenced file that may not exist. CI integration? Pointed to a referenced file. The skill collapses to a 3-line npm install + 1-line config whenever the agent needs anything beyond the default neostandard ruleset on a simple JavaScript project.

The most common real-world scenario — adding linting to an existing project that already has some ESLint configuration, possibly conflicting — gets zero coverage. The skill assumes a clean-slate project.

## What it quietly assumes

It assumes ESLint v9, specifically. If `eslint@10` ships with breaking changes to the flat config API, this skill is instantly stale in a way that won't be obvious until `npx eslint .` fails.

It assumes the agent knows what "flat config" means and why it matters. The skill never explains that ESLint v9 deprecated `.eslintrc` files or what the migration path looks like — that's delegated to a reference file.

It assumes `neostandard()` returns exactly what the project needs with no customization. For a substantial portion of real projects, this is false — you need to add ignores, override specific rules, configure globals, or add parser options for JSX/TypeScript. The skill doesn't show how to merge custom config with the neostandard baseline.

It assumes the project is a standard npm package with `package.json`. Workspaces, pnpm, yarn PnP — no coverage.

These assumptions hold for a brand-new, single-package, JavaScript-only project started by someone who wants zero-config linting. That's a real use case, but it's narrow. The skill overpromises by listing TypeScript, migration, and CI in its description when the SKILL.md body covers none of them.

## What could go wrong

Shell execution: `npm install --save-dev eslint@9 neostandard` and `npx eslint .`. The `npx eslint .` command lints the entire project and may produce hundreds of errors on an existing codebase. The skill says to "verify the config works" but an agent might interpret a flood of lint errors as a config failure and try to debug the wrong problem.

`npx eslint . --fix` (mentioned in CI guidance) auto-modifies source files. The skill correctly says to use `--fix` only locally, but this is advisory, not enforced. An agent that runs `--fix` in CI could auto-commit reformatted code that changes semantics — for example, `eslint --fix` can rewrite `const` to `let` or remove what it thinks are unused variables that are actually used through dynamic access patterns.

Filesystem writes are limited to creating `eslint.config.js` — low risk.

No credential access or network writes.

## Bottom line

This is a quickstart snippet, not a skill. If the five referenced rule files contain substantial migration, TypeScript, and CI guidance, the combined package might be useful. But the SKILL.md alone is a pamphlet. In a tight catalog of 100 skills, this doesn't earn a spot — it's too thin and delegates its entire value proposition to unreachable references. A proper ESLint v9 + neostandard skill would need to cover custom rule configuration, TypeScript integration, migration from legacy configs, monorepo patterns, CI setup, and troubleshooting — all within the SKILL.md, not in external files that may or may not load.

## Confidence: high

The source is only 2.6KB and I read every word. There isn't enough content to be uncertain about — the skill's thinness is the judgment.
