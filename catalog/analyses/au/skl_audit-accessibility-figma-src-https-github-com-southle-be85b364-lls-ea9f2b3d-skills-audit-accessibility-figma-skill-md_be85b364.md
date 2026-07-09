---
schema_version: 1
skill_id: skl_audit-accessibility-figma-src-https-github-com-southle-be85b364-lls-ea9f2b3d-skills-audit-accessibility-figma-skill-md_be85b364
source_hash: sha256:3e0d3bb3a7b1f6750d2dd1df5e4c0cd80a17c7f5
analysis_version: 1
confidence: high
updated_at: "2026-07-10T02:15:00+08:00"
---

# audit-accessibility-figma — per-component a11y scorecard

This skill takes a single Figma component or component set, classifies it as interactive or presentational based on its name and variant axes, and scores it across six accessibility dimensions on a 0–100 scale with a weighted overall score. It checks state coverage (default, hover, focus, disabled, error, active, loading), focus-indicator quality, non-color state differentiation, target size, annotation completeness, and runs three types of color-blind simulation (protanopia, deuteranopia, tritanopia). The output is a scorecard with prioritized, WCAG SC-named recommendations sorted by urgency.

## Why it matters

Most accessibility tooling operates on rendered code — run an axe-core scan over HTML, get violations, fix them. This skill operates on the design artifact itself, before any code exists. That is rare and valuable, because fixing a missing focus state in Figma costs minutes; fixing it after it is baked into twenty component instances in production costs days. The interactive-vs-presentational auto-detection is the most thoughtful feature here: a badge component is not penalized for lacking a focus indicator, but a button is. This prevents the kind of dumb false positives that erode trust in automated accessibility tools.

The skill is also honest about its scope. It repeatedly points you to its sibling `lint-design-figma` for broad tree sweeps and `scan-code-accessibility-figma` for code-side checks. This is a skill designed to live in a family, and the boundary-crossing is clear enough that an agent should know which to call.

## Where it helps, where it hurts

**Best-case scenario:** A designer has just built a new button component set with eight variants across three interaction states. Before publishing it to the team library, they run this audit. It returns a 62/100 with three high-priority findings: the focus state has 2.1:1 contrast against the default background, the disabled state is only differentiated by opacity (invisible to color-blind users), and there is no loading state defined. The designer fixes all three in Figma, re-audits, gets 94/100, and publishes. Six months later, when the component has been used in forty screens, nobody has to retroactively add a focus ring to forty instances.

**Worst-case scenario:** The component is a complex input group — a text field with an icon, a label, a helper text, and an error message, all wrapped in a component set with twelve variant axes. The auto-detection classifies it as interactive (correct) and runs the full state-coverage check, but the variant axes include layout-only parameters like "size" and "label position" that inflate the expected variant count. The coverage score drops to 20/100 because the script expects 96 variants but the designer only created the 8 that matter. The recommendations are noise — "add all missing variant combinations" — and the designer dismisses the tool as broken.

## What it quietly assumes

The interactive-vs-presentational auto-detection is the central assumption and also the biggest risk. The SKILL.md says it uses "component name and variant axes," but it does not specify the detection rules. A component named `IconBadge` with a `state` variant axis might be classified as interactive (because of the axis name) when it is purely decorative. Conversely, a component named `Card` with no obvious interaction axes might be classified as presentational when it contains tappable regions. The classification drives both which categories are scored and their weights — a misclassification cascades through the entire scorecard.

The variant-coverage calculation for presentational components ("actual variants ÷ expected combinations") assumes all variant axes are independent and equally meaningful, which is rarely true in practice. A component set with five axes where two are tightly coupled (e.g., "size" and "padding" always change together) will have the expected combination count inflated by the Cartesian product of axes that should not be multiplied.

The color-blind simulation uses Brettel/Viénot dichromat matrices, which is a respectable approach but, like all dichromat simulations, is an approximation. It will flag problems that exist and miss some that actual users would experience.

## What could go wrong

The skill is read-only — it cannot mutate the Figma file. The worst real-world outcome is the agent trusting the scorecard uncritically and applying fixes based on misclassified or overcounted findings. A designer deletes valid component variants because the coverage score said so, adds unnecessary states to a presentational element, or wastes hours chasing a contrast problem that the color-blind sim flagged but would not actually cause user difficulty.

The `use_figma` script runs atomically — if it fails, it fails completely with no partial results. This is safer than producing a half-complete scorecard, but it means debugging requires re-running the full audit each time.

The user should be present to interpret the scorecard, especially the interactive/presentational classification. An agent should not auto-apply audit recommendations without human confirmation that the classification was correct.

## Bottom line

This is a genuinely useful skill for a specific workflow moment: vetting a single component before it enters a shared library. The interactive-vs-presentational auto-detection and color-blind simulation set it apart from generic accessibility checkers. In a catalog of Figma skills, it earns a spot as the deep-dive counterpart to `lint-design-figma`'s broad sweep — they are complementary tools, not competitors. The biggest risk is the auto-classification cascading errors through the scorecard; the biggest benefit is catching missing interaction states and non-color differentiation issues at the design stage.

## Confidence: high

The SKILL.md is precise about what the skill does, how it classifies components, and where to go for related but different tasks. The only areas I cannot fully assess are the accuracy of the detection heuristics and the color-blind simulation matrices, but the skill's explicit disclosure of the detection mechanism (component name + variant axes) gives the reader enough information to be skeptical in the right places.
