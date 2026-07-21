# figma-swiftui

> Ready to use

## Summary

A bidirectional translation router between Figma designs and SwiftUI code. The SKILL.md itself is a thin dispatcher — it picks a direction (design→code or code→design) and routes to one of two reference files. The shared context section contains six grounding principles that apply regardless of direction, and these six points are where the real design judgment lives.

## Source

- Source: Figma MCP Skills
- License: LicenseRef-Figma-Developer-Terms (verified)

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

Pick this skill when doing Figma↔SwiftUI translation work, because its six shared principles encode genuine iOS platform knowledge that prevents the most common translation failures (pixel-positioning, hardcoded colors, broken icons). Skip it if you need pixel-perfect fidelity, if you're not on iOS, or if the reference files turn out to be thin — the SKILL.md body is too small to stand on its own. The biggest benefit is preventing naive transliteration of Figma output into broken SwiftUI. The biggest risk is that the semantic mapping rules are applied blindly to designs that don't follow iOS conventions.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
