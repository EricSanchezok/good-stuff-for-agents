# Source Activation Policy

Use this policy before activating a source during autonomous growth.

## Routine Autonomous Activation Is Allowed When

All conditions must be true:

- source is public;
- source URL is a GitHub repository supported by current sync tooling;
- source has clear license evidence or an acceptable public documentation reuse posture;
- source contains parseable skill-like artifacts or high-quality agent workflow/SOP content;
- no duplicate active or preview source exists;
- source does not require credentials, private access, or external identity action;
- source does not appear to contain sensitive material;
- activation is reversible by changing status.

## Use `preview` When

Use `preview` instead of `active` when the source looks useful and safe but needs more evidence, broader analysis, or confidence from downstream extraction.

## Block For Human/User Curation When

Block activation when:

- license is unclear, restrictive, or contradictory;
- source is private or requires credentials;
- source appears to contain secrets, private data, or sensitive material;
- activation would imply endorsement beyond catalog provenance;
- duplicate merge/delete decisions are needed;
- legal or policy uncertainty exists;
- current sync tooling cannot represent the source and no safe fallback exists.

## Helper Boundary

`activate-source-candidates.mjs` only writes reviewed activation drafts. It must not choose which sources pass this policy. You choose and document the decision before calling it.
