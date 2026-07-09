# Autonomous Source Activation

Use this policy when `catalog-growth-ops` or `catalog-curation` prepares reviewed source activation drafts.

## Core Boundary

Activation is not endorsement and not quality scoring.

You are not deciding whether the source is good, important, or pack-worthy. You are deciding whether it is safe and useful to track as an active/preview source so downstream sync/extraction can preserve evidence.

A source can be niche, unfamiliar, small, or only plausibly useful and still be valid to activate or preview if it is safe and syncable. Its real value is judged later by extraction, normalization, and deep analysis.

## Routine Autonomous Activation

You may activate or preview a source without asking the user when all conditions are true:

- the source is public;
- the source is supported by current sync tooling;
- license evidence or reuse posture is clear enough to record;
- the source contains plausible skill-like artifacts or high-quality agent SOP/workflow content;
- no duplicate active or preview source exists;
- no credentials, private access, or external identity action is needed;
- no sensitive material is apparent;
- the action is reversible by status change.

## Use `active` When

Use `active` when:

- public access is stable;
- license/reuse posture is clear enough for catalog metadata and artifact inspection;
- sync tooling can represent the source;
- no sensitive, private, or credentialed material is apparent;
- the source has enough stable structure for normal sync/extraction.

`active` still does not mean the catalog endorses the source's skill quality. It only means the source is safe and mature enough to track normally.

## Use `preview` When

Use `preview` when:

- the source is safe and public;
- it contains plausible skill-like content;
- downstream extraction or analysis is needed before quality is known;
- the source may be small, niche, semi-structured, or newly discovered;
- you do not yet want to imply mature catalog confidence.

Preview is the preferred status for broad discovery sources whose safety is clear but whose semantic value still needs evidence.

## Do Not Block For Content Taste

Do not reject or block activation because:

- the domain is unfamiliar;
- the skill content looks niche;
- the source has only 1-3 candidate skills;
- the source is not an official or popular repository;
- you personally doubt the downstream value;
- the source is semi-structured rather than a clean SKILL.md collection.

Those are analysis and curation questions, not activation questions.

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
