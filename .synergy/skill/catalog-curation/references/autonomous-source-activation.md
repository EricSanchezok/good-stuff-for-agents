# Autonomous Source Activation

Use this policy when `catalog-growth-ops` or `catalog-curation` prepares reviewed source activation drafts.

## Routine Autonomous Activation

You may activate or preview a source without asking the user when all conditions are true:

- the source is public;
- the source is a GitHub repository supported by current sync tooling;
- license evidence is clear enough to record;
- the source contains parseable skill-like artifacts or high-quality agent SOP/workflow content;
- no duplicate active or preview source exists;
- no credentials, private access, or external identity action is needed;
- no sensitive material is apparent;
- the action is reversible by status change.

Use `active` when evidence is strong. Use `preview` when the source appears safe and useful but downstream extraction or analysis should build confidence.

## Human/User Curation Required

Block and request human-owned curation when:

- license evidence is missing, unclear, restrictive, or contradictory;
- private or credentialed access is required;
- sensitive material may be present;
- activation could imply endorsement beyond catalog provenance;
- duplicate merge, delete, or irreversible decisions are needed;
- legal or policy uncertainty exists;
- current sync tooling cannot safely represent the source.

## Helper Boundary

`activate-source-candidates.mjs` only writes reviewed drafts. You must decide and document policy compliance before calling it.
