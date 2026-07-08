---
description: "Run the full Skill Intelligence Catalog scheduled operation"
agent: "synergy"
---

Load the `nightly-catalog-ops` project skill and follow its total controller SOP. This runs maintenance preflight, autonomous growth, final validation/publishing checks, run report, and authorized commit/push. Do not duplicate phase SOPs — delegate to owner skills.

Definition of done for a full nightly run:

- maintenance preflight passes;
- autonomous growth advances every applicable phase with available inputs;
- every source, skill, relation, pack, index, or public page touched by the run reaches a terminal state for this run;
- terminal states follow the shared Terminal State Model in `.synergy/skill/shared-references/integration-contract.md`: no-op, written/updated and validated, evaluated, promotion-ready, promoted/published, deprecated/removed under policy, or blocked with owner and reason;
- pack lifecycle work reaches an appropriate terminal state: passed packs are promoted and rendered publicly when policy allows, needs-work/rejected packs retain evaluation reasons, stale or impacted published packs are repaired/re-evaluated/re-published or explicitly blocked, and no-op packs explain why no action was needed;
- final maintenance and publishing gates pass;
- public README/docs read like friendly human-facing catalog pages, not generated record dumps; if rendering exposes placeholders, raw internal labels, or mechanical tables where guidance is needed, fix `catalog-publishing` before finalizing;
- authorized commit and push complete.

Do not stop at a phase handoff when the next owner skill is available and no blocker exists. Load the owner skill and continue until the touched item has a terminal state.

Deterministic completion gates:

- Run `nightly:full-check` before committing.
- Run `nightly:report:write` to produce the machine-readable summary and Markdown report, then validate with `nightly:report:check` and `nightly:states:check`.
- Finalize git with `nightly:git -- --dry-run --authorized` to inspect, then `nightly:git -- --commit --push --authorized` to finalize. Never hand-roll `git add && git commit && git push`.
