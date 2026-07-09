# Source Activation Policy

Use this policy before activating a source during autonomous growth.

## Core Boundary

Activation is not endorsement and not quality scoring.

You are not deciding whether the source is good, important, broad enough, deep enough, or pack-worthy. You are deciding whether it is safe and useful to track as an active or preview source so downstream sync and extraction can preserve evidence.

A source can be niche, unfamiliar, small, or only plausibly useful and still be valid to activate or preview if it is safe and syncable. Its real value is judged later by extraction, normalization, and deep analysis.

## Routine Autonomous Activation Is Allowed When

All conditions must be true:

- source is public;
- source URL is supported by current sync tooling;
- source has clear license evidence or an acceptable public documentation reuse posture;
- source contains plausible skill-like artifacts or high-quality agent workflow/SOP content;
- no duplicate active or preview source exists;
- source does not require credentials, private access, or external identity action;
- source does not appear to contain sensitive material;
- activation is reversible by changing status.

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

Those are discovery, extraction, analysis, and curation questions — not activation questions.

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

`activate-source-candidates.mjs` only writes reviewed activation drafts. It must not choose which sources pass this policy. You choose and document the safety/syncability decision before calling it.