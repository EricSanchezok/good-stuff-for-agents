# Commit Policy

Nightly automation may commit only meaningful repository-local changes: catalog records, generated indexes, generated README/docs, and reports.

Before committing:

1. run strict validation;
2. render docs;
3. pass drift and link checks;
4. inspect git status and diff;
5. ensure no secrets, temp files, or prohibited paths are included.

Every commit message must include:

```txt
Co-authored-by: synergy-agent <299070056+synergy-agent@users.noreply.github.com>
```

No meaningful changes means no commit. Do not amend or rewrite history unless explicitly instructed by a human and safe under the repo policy.
