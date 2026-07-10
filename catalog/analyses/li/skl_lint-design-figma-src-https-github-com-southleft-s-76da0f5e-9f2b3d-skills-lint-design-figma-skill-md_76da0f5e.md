---
schema_version: 1
skill_id: skl_lint-design-figma-src-https-github-com-southleft-s-76da0f5e-9f2b3d-skills-lint-design-figma-skill-md_76da0f5e
source_hash: sha256:1b3cd1116d5ecea40e1d9ab533f0004f064f83f8
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T14:00:00Z"
---

# Lint Design for Figma

A design-side audit tool that walks a Figma node tree and reports WCAG 2.2 accessibility violations alongside design-system quality issues — in a single pass, against the actual design (real colors, real auto-layout, actual variant names), not generated code. It runs 14 WCAG rules plus 6 design-system/layout rules through the Figma Plugin API, producing findings tagged by severity (critical/warning/info) and WCAG level (A/AA/AAA/best-practice).

## Why it matters

This skill fills a genuine gap. The native Figma MCP tools (`get_design_context`, `get_metadata`) read designs for code generation but have zero linting capability. There's no built-in "is this button accessible / does this frame use design tokens?" check in Figma. This skill provides that check, and it does it against the real design data rather than generated code — so it catches issues like semi-transparent fills (contrast on these is flagged `approximate: true`) that code-side linters would miss or get wrong.

The design-system rules (hardcoded colors, missing text styles, detached components) are the real differentiator. Most accessibility linters check contrast ratios and call it done. This skill also asks: are you using the design system at all, or are you hardcoding hex values? That's a workflow-quality check that no built-in Figma tool provides.

The contrast math is handled correctly — sRGB linearization + relative luminance — which is more accurate than naive color-distance approaches. The ancestor-walking for background inference is pragmatic: it finds the nearest solid fill ancestor, defaults to white, and honestly flags semi-transparent fills as approximate. That's better than false precision.

However, the skill is entirely dependent on a companion script (`scripts/lint-design.js`) and a rule catalog (`references/lint-rules.md`) that I cannot inspect. The SKILL.md describes the architecture well but the quality of the actual linting — which WCAG rules are implemented, how thorough the checks are, what constitutes "design-system" linting — lives in those files. Without reading them, the skill's claim of "faithful port of 14 WCAG 2.2 rules" is unverifiable.

## Where it helps, where it hurts

**Best-case scenario:** A design team is preparing for dev handoff. The designer runs lint-design on a screen or component set to catch contrast failures, undersized touch targets, missing focus indicators, hardcoded colors (instead of design tokens), and detached components — all before a single line of code is written. The results are grouped by rule with node IDs, so the designer can jump directly to each offending element in Figma. This catches issues at the cheapest possible stage (design) rather than in code review or QA. The skill pays for itself if it prevents even one accessibility regression from reaching production.

**Worst-case / failure scenario:** The designer runs the full ruleset on an entire page with `MAX_DEPTH: 10` and `MAX_FINDINGS: 100`. The page has deeply nested auto-layout components and thousands of nodes. The walk hits the depth or findings cap and `truncated` is set, but the agent doesn't notice or communicate this. The team believes the page is clean when in reality half the tree was never inspected. Alternatively, the designer runs only `wcag-contrast` (a single rule) and assumes they've covered accessibility — missing the fact that contrast is just one of 20 total rules. The selective-rule feature saves time but creates a false-clean risk if the user doesn't understand what they're skipping.

## What it quietly assumes

- **Figma Plugin API access for the `figma-use` skill.** Like all southleft Figma skills, this chains off `figma-use` for the execution environment. If `figma-use` isn't loaded or its rules aren't followed, the scripts fail. This assumption holds for Figma plugin-capable environments but fails for agents operating outside that context. The skill doesn't degrade gracefully here — it just won't run.

- **The designer knows what WCAG level they need.** The skill flags issues by WCAG level but doesn't explain what A/AA/AAA/best-practice means in practical terms. A junior designer running this skill will see findings at all levels without understanding which ones are legally required (AA typically) and which are aspirational (AAA). The skill assigns severity but the relationship between severity and WCAG level isn't explained in the SKILL.md.

- **The linting rules match the actual implementation.** The rule catalog is in `references/lint-rules.md` — a file I can't inspect. The SKILL.md mentions "WCAG-honest severity" but this is a claim, not evidence. If the rule implementations are incomplete or have bugs, the skill produces false confidence. This is a common failure mode for linting tools: they report what they can detect, not what matters.

- **Colors in the design match rendered output.** The skill reads fill colors from the Figma node tree and computes contrast from them. If there are blend modes, layer effects, or opacity interactions that Figma's Plugin API represents differently from the visual output, the contrast math could be misleading. The skill has some mitigation (`approximate: true` for semi-transparent fills) but doesn't address all rendering edge cases.

- **The design file is well-structured.** The background-inference algorithm walks ancestors for the nearest solid fill. This works for flat or shallow hierarchies but can produce wrong backgrounds in complex overlapping layouts where the visual background isn't the nearest filled ancestor.

## What could go wrong

- **False negatives from depth/findings truncation.** This is the most dangerous risk. If `truncated` is set and the agent doesn't check, the user gets an incomplete audit with no warning. The skill mentions `truncated` in the workflow notes but the fix-then-re-lint step assumes the user noticed. A workflow that doesn't explicitly check `truncated` after each run will miss issues.

- **Contrast misclassifications.** The approximate contrast flag for semi-transparent fills is honest but still varies by platform. What renders as AA-passing on one display might fail on another. The skill can't account for display gamma, ambient lighting, or platform font rendering differences that affect perceived contrast.

- **No auto-fix capability.** The skill explicitly says "Findings are descriptive, not auto-fixed. Confirm intent before bulk-editing a design." This is good practice but means the skill creates work — it identifies problems but doesn't solve them. A user who expects an automated fix pipeline will be disappointed.

- **No destructive operations.** The skill only reads Figma node data — it doesn't modify files. The user does not need to be present during execution. The worst actual outcome is a misleading audit that builds false confidence.

## Bottom line

This is one of the more valuable skills in the southleft Figma collection because it covers a gap that Figma's own tools don't. The combination of accessibility AND design-system linting in a single pass is genuinely useful for pre-handoff QA. But the value is entirely contingent on the quality of the rule implementations and the agent's discipline in checking truncation flags. Pick this if you need design-side WCAG and design-system auditing before code is written. Skip it if you need code-side a11y testing (use `scan-code-accessibility-figma` instead) or deep per-component scorecards (use `audit-accessibility-figma`). It earns a catalog spot for filling a real gap, but the confidence ceiling is set by the opaque rule implementations I couldn't verify.

## Confidence: medium

The SKILL.md is well-structured and clear about its architecture, but the actual value lives in files I didn't read: `scripts/lint-design.js` (the core engine) and `references/lint-rules.md` (the rule catalog). Without inspecting these, I can describe the intended behavior confidently but cannot verify that the 14 WCAG rules are complete, correct, or well-implemented. The contrast-math claim (sRGB linearization) is credible but unverified.
