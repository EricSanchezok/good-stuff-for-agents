# Maintenance Permission Boundaries

Maintenance repository workflows may:

- read and write repository-local catalog, index, docs, and report artifacts;
- fetch public content for already approved active or preview sources;
- run deterministic helpers under `.synergy/skill/**/scripts/`;
- inspect Git status, diff, branch, upstream, and `HEAD` read-only.

They must not:

- stage, commit, push, run hooks, or infer a push target;
- use destructive Git operations or rewrite history;
- write secrets or modify global Synergy/system configuration;
- perform semantic growth, curation, or external identity actions;
- install global packages;
- mirror raw third-party content without license permission.

A separately trusted controller may commit and push only after current explicit user or scheduler authorization, independent diff review, trusted gates, exact tree/parent binding, and ordinary Git safety checks.