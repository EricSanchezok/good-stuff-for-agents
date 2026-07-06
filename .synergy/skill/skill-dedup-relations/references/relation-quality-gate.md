# Relation Quality Gate

Before writing relation edges:

- subject and object must be valid catalog IDs or explicit domain/tool identifiers;
- predicate must be one of the allowed relation types;
- weight must be a number from 0 to 1;
- evidence must be specific enough for review;
- source must identify the producer (`skill-dedup-relations`, `catalog-curation`, or a run ID);
- fuzzy duplicates must remain pending candidates until human curation.

Reject or downgrade relations with vague evidence such as "looks similar". Prefer fewer high-quality edges over dense noisy graphs.
