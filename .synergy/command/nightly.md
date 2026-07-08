---
description: "Run the full Skill Intelligence Catalog scheduled operation"
agent: "synergy"
---

Load the `nightly-catalog-ops` project skill and follow its total controller SOP. This runs maintenance preflight, autonomous growth, final validation/publishing checks, run report, and authorized commit/push. Do not duplicate phase SOPs — delegate to owner skills.

Definition of done for a full nightly run:

- maintenance preflight passes;
- autonomous growth advances every applicable phase with available inputs;
- new or changed skill records have analyses when analysis inputs are available;
- relation review runs after analyses exist;
- if candidate packs are created or changed, `catalog-evaluation` runs in the same nightly and writes evaluation output;
- unevaluated candidate packs are allowed only when each one has a concrete blocker recorded in the final report;
- final maintenance and publishing gates pass;
- authorized commit and push complete.

Do not stop at a phase handoff when the next owner skill is available and no blocker exists. Load the owner skill and continue.
