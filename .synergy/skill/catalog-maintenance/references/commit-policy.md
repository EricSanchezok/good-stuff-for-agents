# Trusted-Controller Commit Policy

`catalog-maintenance` never creates commits. When maintenance produces meaningful repository-local changes, it reports the exact changed paths and verification evidence.

A separately trusted controller may commit only after:

1. current explicit user or scheduler authorization;
2. strict validation and required public checks from trusted code;
3. review of staged and unstaged bytes;
4. exclusion of unrelated changes, secrets, temporary files, and prohibited paths;
5. exact binding of intended blobs, index, tree, branch, and parent `HEAD`.

Every repository commit includes:

```text
Co-authored-by: synergy-agent <299070056+synergy-agent@users.noreply.github.com>
```

No meaningful changes means no commit. Never amend, rewrite history, skip hooks, or force a Git operation unless the user explicitly requests it and repository policy permits it.