---
schema_version: 1
skill_id: skl_steam-publish-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-workflows-steam-publish-skill-md_c2d6357e
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:59:39.482Z"
---

# Steam Publish

## Core Purpose
Guides agents through publishing a game on Steam — Steamworks SDK integration, Steam depot configuration, build branching, SteamPipe upload process, store page setup, and achievement/leaderboard API integration.

## Trigger Semantics
Load when an agent prepares a game for Steam release, integrates Steamworks SDK, configures depots and build pipelines, or sets up Steam features (achievements, cloud saves, multiplayer).

## Capability Breakdown
Covers Steamworks SDK integration (Steam.NET or C API), app and depot configuration, SteamPipe build upload and branching, store page setup (description, screenshots, trailers), Steam features (achievements, stats, leaderboards, cloud saves, networking), and pricing/release date management.

## Workflow Role
Deployment — applied during the final release phase for Steam distribution.

## Inputs / Outputs
Inputs: game build, store page assets. Outputs: Steamworks integration, depot config, uploaded build, store page.

## Tool and Permission Profile
Steamworks partner account, SteamPipe CLI tools. Standard code editing.

## Compatibility Notes
Complements marketplace-publishing (from dotnet-skills) for general publishing patterns and godot-export or unreal-packaging for engine-specific builds.

## Conflict Notes
No conflicts.

## Dedupe Notes
Unique in the catalog — no other Steam publishing skill.

## Evaluation Hooks
Verify the skill covers SteamPipe build upload workflow and Steam depots branching strategy.

## Evidence and Confidence
medium — based on source metadata and Steam publishing knowledge. Full content review recommended.
