# Sync Strategies

## Git source

1. Check remote ref first.
2. If unchanged, append source state and stop.
3. If changed, fetch only required paths when practical.
4. Compute digest for fetched artifacts.
5. Preserve retrieval evidence for every artifact that may become a skill candidate.

## HTTP source

1. Check ETag / Last-Modified when available.
2. Fetch only if freshness metadata changed.
3. Store digest and provenance.
4. Preserve the retrieval URL, timestamp, and content identity needed to re-read the exact artifact later.

## Artifact Evidence Preservation

For every artifact that may become a skill candidate, preserve:

- source-relative path;
- content digest;
- retrieval location (local blob path, snapshot entry, or upstream URL/ref);
- enough provenance to re-read the exact content later.

The digest proves identity; the retrieval location enables deep analysis. Both are required. A digest without recoverable content is not enough for analysis.

Do not replace artifact evidence with a source-level summary. Summaries are useful for reports, but downstream extraction and analysis need the original artifact or a recoverable pointer to it.

## Retry policy

Retry transient failures three times with exponential backoff. Persistent source failure is reported but does not corrupt the catalog.
