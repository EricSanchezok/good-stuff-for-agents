# Failure Handling

## Non-Fatal Failures

A transient source failure is non-fatal if the catalog remains valid and publishing can safely use prior state. Record it in source state and reports. After 3 consecutive failures, surface it in `reports/source-health.md`.

## Fatal Failures

Exit with code 2 and do not publish or commit when:

- strict validation fails;
- migration fails;
- a canonical write is incomplete;
- docs drift remains after render;
- link check fails for generated internal links;
- unsafe git state is detected;
- automation would require a prohibited external identity action.

Never continue into publishing with invalid catalog state.
