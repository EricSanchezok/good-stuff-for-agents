# library-variables-figma

> Ready to use

## Summary

A focused utility that lets an agent browse and import design tokens from subscribed Figma team libraries into the current file. It's a thin wrapper around two Figma Plugin API scripts — one for discovery (`list-library-variables.js`) and one for import (`import-library-variable.js`) — with a short text workflow that connects them. The scope is deliberately narrow: this skill only touches library-published variables; local variables are explicitly routed to `export-tokens-figma` or `manage-variables-figma`.

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

Pick this if you need to consume design tokens from a shared Figma library and already know which libraries you subscribe to. Skip it if your workflow involves setting up subscriptions from scratch or working with local variables — those are different skills in the same collection. The biggest benefit is the clear two-phase workflow (discover then import); the biggest risk is dead-ending on the manual subscription gate.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
