# webapp-testing

> Ready to use

## Summary

A thin Playwright wrapper for testing local web applications. It provides a decision tree for choosing between static and dynamic page strategies, a server lifecycle helper script (`with_server.py`), and a reconnaissance-then-action pattern for dynamic apps where you inspect the rendered DOM before interacting. That's the whole value proposition, and it's genuinely small — the core content fits on a single screen.

## Source

- Source: Anthropic Agent Skills
- License: Apache-2.0 (verified)

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

Pick this skill when an agent needs to do a quick smoke test of a local web app and you want to avoid the "how do I start the server / wait for it to be ready / clean up after" friction. Skip it for anything involving authentication, complex state, test suites, or non-trivial assertions. It's a competent but minimal skill — you could replace it with a 20-line shell script wrapping `playwright` and get roughly the same result. The decision tree and the server helper are the only things you'd lose.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
