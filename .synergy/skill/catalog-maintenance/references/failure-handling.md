# Failure Handling

## Non-Fatal Failures

A transient source failure is non-fatal if the catalog remains valid and publishing can safely use prior state. Record it in source state and reports. After 3 consecutive failures, surface it in `reports/source-health.md`.

A strict validation failure may be retried only when all of these are true:

- the damage is structural rather than semantic;
- the intended record is recoverable from complete catalog evidence or a reviewed draft;
- a narrow catalog-data helper can repair it atomically without guessing meaning;
- no more than 2 repair attempts have been made.

After repair, rerun strict validation before sync, indexing, rendering, publishing, or git work.

## Fatal Failures

Exit with code 2 and do not publish or commit when:

- strict validation still fails after the bounded structural repair path;
- repair would require inferring missing semantic fields;
- migration fails;
- a canonical write is incomplete;
- docs drift remains after render repair;
- link check fails for generated internal links after repair;
- unsafe git state is detected;
- automation would require a prohibited external identity action.

Never continue into publishing with invalid catalog state.
