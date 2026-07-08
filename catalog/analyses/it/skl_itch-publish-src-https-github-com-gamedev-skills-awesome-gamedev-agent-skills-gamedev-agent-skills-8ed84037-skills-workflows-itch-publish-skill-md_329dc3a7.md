---
schema_version: 1
skill_id: skl_itch-publish-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-workflows-itch-publish-skill-md_329dc3a7
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:59:39.510Z"
---

# Itch Publish

## Core Purpose
Guides agents through publishing games on itch.io — page creation, build file upload, pricing and commission setup, HTML/WebGL embedding, and itch.io API integration.

## Trigger Semantics
Load when an agent publishes a game on itch.io, creates a game page, uploads builds, or configures payment and commission settings.

## Capability Breakdown
Covers itch.io game page creation (description, tags, screenshots), build file upload and versioning, HTML/WebGL embedding for browser play, pricing and revenue commission setup, itch.io API for automated uploads (butler CLI), and game jam submission workflow.

## Workflow Role
Deployment — applied when releasing a game on itch.io for distribution.

## Inputs / Outputs
Inputs: game build files, store page content. Outputs: published itch.io game page, uploaded builds.

## Tool and Permission Profile
Itch.io account. Butler CLI for automated uploads. Standard web browser for page editing.

## Compatibility Notes
Complements game-jam for jam-specific itch.io submission and godot-export or unity-build-pipeline for platform builds.

## Conflict Notes
No conflicts.

## Dedupe Notes
Unique in the catalog — no other itch.io publishing skill.

## Evaluation Hooks
Verify the skill covers butler CLI usage and HTML5 embed configuration.

## Evidence and Confidence
medium — based on source metadata and itch.io publishing knowledge. Full content review recommended.
