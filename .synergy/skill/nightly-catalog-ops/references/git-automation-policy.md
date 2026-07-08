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

Before committing, run the deterministic nightly git finalizer:

```bash
npm --prefix .synergy run nightly:git -- --dry-run --authorized
```

This script runs required gates (validation, index, render, drift, links, boundary, report state checks), inspects git status, excludes forbidden paths (secrets, temp files, unauthorized directories), rejects committed reports containing `Push: Pending` or `Commits: Pending`, and applies the required co-author footer.

To commit and push:

```bash
npm --prefix .synergy run nightly:git -- --commit --push --authorized --message "nightly: catalog run summary"
```

**Do not hand-roll `git add && git commit && git push` for nightly runs.** Use the finalizer.

## Forbidden

- force push;
- destructive git operations;
- history rewriting unless explicitly requested and safe;
- committing unrelated user changes;
- committing secrets;
- external identity actions such as messages, emails, or posts.

No meaningful changes means no commit.
