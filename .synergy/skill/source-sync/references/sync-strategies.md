# Sync Strategies

## Git source

1. Check remote ref first.
2. If unchanged, append source state and stop.
3. If changed, fetch only required paths when practical.
4. Compute digest for fetched artifacts.

## HTTP source

1. Check ETag / Last-Modified when available.
2. Fetch only if freshness metadata changed.
3. Store digest and provenance.

## Retry policy

Retry transient failures three times with exponential backoff. Persistent source failure is reported but does not corrupt the catalog.
