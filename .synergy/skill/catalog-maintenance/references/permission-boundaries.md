# Permission Boundaries

Nightly automation may:

- read and write repository-local catalog/docs/report files;
- fetch public source metadata and content permitted by source policy;
- run deterministic scripts under `.synergy/skill/**/scripts/`;
- run non-destructive git status/diff/add/commit/push when configured.

Nightly automation must not:

- use destructive git operations;
- force push;
- write secrets;
- modify global Synergy or system configuration;
- send emails, messages, social posts, or other external identity actions;
- install global packages;
- mirror raw third-party content unless license policy permits it.

When a needed action crosses these boundaries, stop and require human curation or explicit approval.
