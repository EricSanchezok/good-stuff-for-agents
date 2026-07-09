---
schema_version: 1
skill_id: skl_figma-use-src-https-github-com-figma-mcp-server-gu-f9d6a4e8-kills-dde79ddd-skills-figma-use-skill-md_f9d6a4e8
source_hash: sha256:7b77cb45f1e77263e072ae542f655a1f4f40fc72
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T02:16:00+08:00"
---

# figma-use

A comprehensive operational manual for executing JavaScript against Figma files through the `use_figma` MCP tool. It's not a reference — it's a practitioner's guide organized around preventing real-world mistakes: 17 critical rules, a page-switching protocol, an incremental build workflow, a pre-flight checklist, and an error-recovery decision tree. The meta-message is "the Figma Plugin API is full of footguns, and I've catalogued every one I've stepped on."

## Why it matters

This skill distinguishes itself by being aggressively anti-footgun. Every rule addresses a specific failure mode that someone actually hit: `figma.notify()` throws "not implemented" (Rule 3), colors are 0–1 not 0–255 (Rule 6), the sync page setter doesn't work (Rule 9), fonts must be loaded before touching text (Rule 8), `layoutSizingHorizontal/Vertical` value restrictions depend on structural context (Rule 12). These aren't best practices — they're survival knowledge. Any Figma Plugin API developer eventually learns each one through debugging. This skill front-loads them all.

The page-switching protocol (Section 2) is the most architecturally interesting piece. The rule "page context resets between `use_figma` calls" and the parallel fan-out pattern for multi-page work are genuinely non-obvious constraints imposed by the MCP server's execution model, not the Figma API itself. The skill recognizes this as a platform-specific concern and treats it as a hard constraint — "one script must switch pages at most once" — which is exactly the right level of prescriptiveness.

The incremental workflow (Section 6) is solid: inspect first, build skeleton with placeholders, fill sections incrementally, validate after each step. The `node.placeholder` API (shimmer overlay) is clever UX — it gives the user visual feedback that work is in progress during multi-step builds.

However, the skill is reference-heavy. The real substance is in the 17 rules and the workflow. The rest — the 13-reference documentation library, the exhaustive query selector syntax, the editor mode matrix — is scaffolding around those core rules.

## Where it helps, where it hurts

**Best case**: You need to programmatically create or modify a complex Figma file — building a component library, generating screens from tokens, restructuring a design system. You've never written Figma Plugin API code before. You load this skill, follow the incremental workflow, and avoid literally every common pitfall because the pre-flight checklist catches them before you even hit "run." You use `createAutoLayout()` instead of building frames manually, `node.query()` instead of verbose `findAll` loops, and `await node.screenshot()` for inline verification. Each `use_figma` call is small, validated, and builds on the previous. You finish with a working design that matches conventions already in the file.

**Worst case**: You need to read Figma data, not write it. The skill is overwhelmingly write-focused — the "inspect first" pattern exists, but the skill's identity is "how to safely mutate a Figma file." If you just want to query node structures, extract variables, or generate screenshots, 80% of the rules are noise. The skill also struggles with FigJam and Slides files — it acknowledges they have different node type availability and different API surfaces, but the coverage is a short compatibility matrix. If your task involves Sticky nodes, Connectors, or CodeBlocks, you'll be in undocumented territory. Another failure mode: you need to do a single quick edit (rename 50 layers) and the incremental workflow overhead (inspect → skeleton → fill → validate → screenshot → validate) feels absurdly heavy for a batch rename. The skill has no "fast path" for simple operations.

## What it quietly assumes

- **The `use_figma` MCP tool exists and this skill is the authoritative guide for it.** The skill title says "you MUST invoke this skill BEFORE every `use_figma` tool call." This is a hard coupling to a specific MCP server's execution model. If the server changes its behavior (e.g., page context persistence, font preloading), some rules become stale.
- **The agent loads reference files on demand.** The skill's body is already long, and it delegates to 13 reference files. This is good progressive disclosure in theory, but it assumes the agent will correctly decide which reference to load and when. An agent that loads all references at once will blow its context window.
- **Inter is preloaded in most environments.** Rule 8 mentions this in passing. If an environment doesn't preload Inter, the font-loading recipe becomes mandatory for every text operation, not just for non-Inter fonts.
- **The Figma file has a design system or at least conventions to match.** Section 9 ("Discover Conventions Before Creating") assumes there are existing conventions worth matching. For greenfield files, this section is dead weight.
- **MCP tools may appear as deferred tools requiring batch loading.** The skill mentions `ToolSearch` with `select:` syntax as a specific optimization. If the Figma MCP tools are always loaded eagerly, this advice is noise. If they're deferred but the agent doesn't understand `select:` syntax, there's a gap.

These assumptions hold well for the primary use case (programmatic Figma content creation via `use_figma`). When they break — e.g., in a greenfield file with no conventions — the skill degrades gracefully because the rules and workflow are still independently useful.

## What could go wrong

The most severe risk is destructive operations without guardrails. The skill teaches how to create, modify, and delete nodes in Figma files, including production design files. There's no "dry run" mode, no undo guidance, and no warning about working on the wrong page or the wrong file. If an agent misidentifies a node ID, it could modify or delete a component that's used across dozens of screens. The incremental workflow with screenshots provides visual verification, but verification happens after the fact — the damage is done the moment the script executes.

The font-loading requirement (Rule 8) is a particularly nasty failure mode because it produces silent partial failures: the script runs, nodes get created, but text content is missing or corrupted. The skill warns about this prominently, which is good, but the consequence of forgetting is invisible rather than a clear error.

On the execution environment side, the `use_figma` tool itself is the single point of failure. If it's down, rate-limited, or experiencing performance issues, every workflow that depends on this skill stops. The skill provides no offline fallback or alternative approach.

User presence is ambiguous: the skill encourages taking screenshots for the user to see progress, and the placeholder shimmer pattern is explicitly designed for user-facing visual feedback. But the operations themselves don't require user presence.

## Bottom line

Pick this skill if you're doing any programmatic Figma work through the `use_figma` MCP tool — it's the definitive operations manual and the rules alone will save you hours of debugging. Skip it if you're only reading Figma data or working in FigJam/Slides where the API coverage is thin. The single biggest benefit is the catalogued failure modes: every rule addresses a real bug someone already hit. The single biggest risk is that it enables destructive operations without guardrails — you can delete production design system components as easily as you can create them. In a tight 100-skill catalog, this earns a spot because it's the gateway skill for an entire MCP tool ecosystem; without it, every `use_figma` call is a gamble.

## Confidence: medium

The SKILL.md source is genuinely long (~350 lines of substantive rules) and I read it thoroughly, but the skill delegates heavily to 13 reference files (gotchas, common-patterns, component-patterns, variable-patterns, text-style-patterns, effect-style-patterns, plugin-api-patterns, api-reference, validation-and-recovery, plugin-api-standalone.index.md, plugin-api-standalone.d.ts, working-with-design-systems/wwds.md) that I could not read. My judgments about the core rules and workflow are well-grounded; my sense of how deep or shallow the reference ecosystem is could be wrong if those files are exceptionally rich or unusually sparse.
