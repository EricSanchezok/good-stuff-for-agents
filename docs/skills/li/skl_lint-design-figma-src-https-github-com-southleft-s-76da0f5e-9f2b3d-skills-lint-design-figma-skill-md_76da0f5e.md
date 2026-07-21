# lint-design-figma

> Ready to use

## Summary

A design-side audit tool that walks a Figma node tree and reports WCAG 2.2 accessibility violations alongside design-system quality issues — in a single pass, against the actual design (real colors, real auto-layout, actual variant names), not generated code. It runs 14 WCAG rules plus 6 design-system/layout rules through the Figma Plugin API, producing findings tagged by severity (critical/warning/info) and WCAG level (A/AA/AAA/best-practice).

## Source

- Source: Skills for Figma (Southleft)
- License: MIT (verified)

## Capabilities

- Domains: —
- Task types: —
- Best stage: —
- Capabilities: —

## Best Used For / Not For

Use when the trigger semantics and task stage match the job. Do not use when required tools, permissions, license, or confidence do not fit the current run.

## Inputs / Outputs

- Inputs: —
- Outputs: —
- Handoff outputs: —

## Related Packs

No published packs use this skill yet.

## Related Skills

No related skills are public yet.

## Public Analysis Summary

This is one of the more valuable skills in the southleft Figma collection because it covers a gap that Figma's own tools don't. The combination of accessibility AND design-system linting in a single pass is genuinely useful for pre-handoff QA. But the value is entirely contingent on the quality of the rule implementations and the agent's discipline in checking truncation flags. Pick this if you need design-side WCAG and design-system auditing before code is written. Skip it if you need code-side a11y testing (use `scan-code-accessibility-figma` instead) or deep per-component scorecards (use `audit-accessibility-figma`).

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
