# Source Deletion Policy

If a source disappears, becomes private, or no longer contains a known skill:

- Do not delete records.
- Mark source or affected skills as `removed` or `broken` with reason and timestamp.
- Stop using removed skills for new pack synthesis.
- Mark published packs using removed skills as `stale` through `catalog-data detect-impact` or equivalent status update.
- Keep docs pages with removed/deprecated banners until superseded.
