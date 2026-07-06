# Push Policy

Automation may push ordinary updates after successful validation and commit when configured to do so.

Rules:

- never force push;
- never push with failing validation or unresolved generated docs drift;
- never push secrets or local-only config;
- stop on remote rejection and report the blocker;
- do not create release tags unless explicitly configured.

If the repository is not initialized as git or has no remote, nightly should report the state and skip push.
