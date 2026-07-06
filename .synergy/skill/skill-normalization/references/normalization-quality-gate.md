# Normalization Quality Gate

A normalized skill record must have:

- stable canonical ID;
- source provenance;
- current version ID;
- status;
- capabilities arrays, even if empty;
- input/output arrays, even if empty;
- tool/risk objects;
- analysis path placeholder;
- timestamps.

Records missing required fields fail validation and must not be published.
