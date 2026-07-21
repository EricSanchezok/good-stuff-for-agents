# code-review

> Ready to use

## Summary

This is a thin procedural wrapper around the `coderabbit` CLI tool. It doesn't perform any review itself — it checks whether the CLI is installed and authenticated, invokes `coderabbit review --agent`, groups the output by severity, and optionally drives a fix-review-fix loop. All actual analysis happens on the CodeRabbit API servers, not in this skill. Its real value proposition is the workflow pattern, not the review capability.

## Source

- Source: CodeRabbit Skills
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

This is a vendor-specific CLI wrapper with a competent workflow pattern. If you're already a CodeRabbit user with the CLI installed, it'll save you from remembering flag combinations and give you a structured review-fix loop. If you're not, this skill is a dead end — it offers no review capability of its own and no alternative path. The biggest benefit (autonomous fix-review loop) is a workflow idea that could be expressed more generically. The biggest risk (secrets sent to an external API without verification) is significant and unmitigated. Pick this only if you're committed to CodeRabbit's ecosystem and have already solved the secrets-in-diffs problem elsewhere.

## Confidence and Limitations

- Quality score: —
- Confidence: unknown
- Risk surfaces: —
