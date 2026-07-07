# Git Automation Policy

Use this policy before committing or pushing from `nightly-catalog-ops`.

## Allowed When Authorized

The total controller may commit and push ordinary repository-local catalog work when the user or approved scheduled automation explicitly authorizes it.

Allowed content:

- catalog records and indexes;
- public README/docs generated from catalog data;
- internal reports;
- project skill/config changes when the task is implementation work.

## Required Checks

Before committing:

1. run strict validation;
2. run public render, drift, and link checks when public pages are touched;
3. inspect git status and diff;
4. exclude unrelated user changes;
5. ensure no secrets or temp files are included;
6. use the required co-author footer from `AGENTS.md`.

## Forbidden

- force push;
- destructive git operations;
- history rewriting unless explicitly requested and safe;
- committing unrelated user changes;
- committing secrets;
- external identity actions such as messages, emails, or posts.

No meaningful changes means no commit.
