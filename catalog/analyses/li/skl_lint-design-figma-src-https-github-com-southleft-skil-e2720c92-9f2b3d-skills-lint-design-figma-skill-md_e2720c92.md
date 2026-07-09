---
schema_version: 1
skill_id: skl_lint-design-figma-src-https-github-com-southleft-skil-e2720c92-9f2b3d-skills-lint-design-figma-skill-md_e2720c92
source_hash: sha256:eb4aff5e4be11ae8b4c53180e5fa0f58f768aac6
analysis_version: 1
confidence: high
updated_at: "2026-07-10T02:15:00+08:00"
---

# lint-design-figma — WCAG 2.2 + design-system lint over a node tree

This skill walks a Figma node tree (a frame, a page, or the entire document) and reports accessibility and design-quality problems as categorized findings — each tagged with severity, WCAG level, and the offending node ID. It runs entirely inside Figma's Plugin API sandbox via `use_figma`, so it inspects the real design geometry and color values rather than any generated code representation. Twenty rules ship out of the box: fourteen WCAG 2.2 checks plus six design-system checks covering hardcoded colors, missing text styles, detached components, and layout issues.

## Why it matters

The native Figma MCP tools (`get_design_context`, `get_metadata`) are built to feed design data into code generators. They have zero built-in linting — there is no "does this button have contrast issues?" capability anywhere in the MCP. This skill fills a genuine gap. It is also the first Figma lint skill I have seen that bundles design-system quality rules alongside accessibility rules in a single pass, which makes practical sense: you are already walking the tree, so you might as well flag the hardcoded hex color and the low-contrast text in one run.

The SKILL.md itself is unusually good at setting expectations. It tells you exactly why `severity` is labelled `best-practice` for text-size/line-height rules rather than a hard WCAG failure, it explains the background-inference strategy for semi-transparent fills, and it names the truncation behavior explicitly. These are the kinds of details that separate a skill written by someone who has actually used it from one that is a conceptual sketch.

## Where it helps, where it hurts

**Best-case scenario:** A design team is about to hand off a screen to development. Before the handoff, the designer runs `lint-design-figma` on the frame with `RULES: ['all']`, gets back 30 findings sorted by severity, and spends an hour fixing the criticals — a button at 20px with 3:1 contrast, a focus indicator that is invisible on dark backgrounds, three hardcoded colors that should be token references. The handoff goes smoothly because the design-side issues were caught before they became code-side bugs.

**Worst-case scenario:** The agent runs the lint on a deeply nested, hundred-layer Figma file with `MAX_DEPTH: 10` and `MAX_FINDINGS: 100` defaults. The walk hits the depth cap inside a complex auto-layout stack and stops before reaching critical interactive elements nested deep in the tree. The lint returns 15 findings, none of which are the genuine accessibility problems lurking at depth 12. The truncation flag is set, but the agent doesn't notice it, reports "15 minor issues found," and the team ships with undetected contrast failures.

## What it quietly assumes

The skill assumes the Figma node tree is shallow enough that the default `MAX_DEPTH` of 10 reaches everything that matters. In a real production file with deeply nested auto-layout frames, component instances inside component instances, and multi-level overlays, depth 10 can be surprisingly limiting. The skill tells you truncation happened but does not tell you what you missed — you have to decide whether to increase the depth, narrow the scope, or trust that nothing important was skipped.

It also assumes the agent running it understands `use_figma` well enough to edit the `const` inputs at the top of the script correctly. The SKILL.md repeatedly says "edit the `const` inputs at the top first" — if the agent mangles the NODE_ID format or forgets to quote strings inside the inlined script, the entire lint fails atomically with no partial results.

The background-inference strategy (walk ancestors for nearest solid fill, default to white) is a sensible heuristic but it will misclassify contrast on elements that sit over gradients, images, or complex layered backgrounds. The skill flags these as `approximate: true`, which is honest, but an agent that only reads the severity field might treat an approximate finding as definitive.

## What could go wrong

The `use_figma` script is read-only, so the worst failure is a false negative — the lint runs, finds nothing critical, and the team assumes the design is clean when it is not. The depth truncation and background approximation are the two biggest vectors for this. A subtler risk: the lint script processes color values as 0–1 floats, so if the agent accidentally passes hex values or 0–255 RGB values (easy to do when editing the script inputs), the contrast math will be silently wrong.

The skill is read-only and non-destructive — no files written, no Figma mutations. But it produces findings that drive design changes. A false positive (e.g., flagging a decorative element as needing 4.5:1 contrast) can waste designer time fixing something that was never broken. The user does not need to be present for the lint to run, but they should triage the findings before any bulk changes are applied to the design.

## Bottom line

This skill fills a real gap in the Figma MCP ecosystem — design-side linting — and the combination of WCAG 2.2 and design-system rules in a single pass is a practical design choice. In a catalog of Figma skills, it earns a spot alongside its sibling `audit-accessibility-figma` (deep per-component) because the two skills complement each other: one for broad sweeps, one for deep dives. The biggest risk is the depth-limit truncation hiding real problems from the report; the biggest benefit is catching contrast and hardcoded-color issues at the design stage when they are cheapest to fix.

## Confidence: high

The SKILL.md is explicit about its behavior, its limitations (depth, findings cap, truncation, background approximation), and the rationale behind its severity classifications. The only thing I cannot verify without running it is whether the twenty rules map correctly to their claimed WCAG criteria, but the skill's self-awareness about edge cases suggests the author has tested it.
