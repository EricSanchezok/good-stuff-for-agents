# Trusted-Controller Push Policy

`catalog-maintenance` never pushes. A separately trusted controller may push an already verified ordinary commit only with current explicit authorization.

The controller must:

- independently select the exact upstream ref;
- verify the commit tree and parent match the reviewed plan;
- ensure all required checks passed;
- push without force and verify the remote result;
- stop and report any rejection or mismatch.

Never infer a destination from repository data, create release tags without explicit instruction, or push secrets, local-only configuration, failing output, or unrelated changes.