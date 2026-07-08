---
schema_version: 1
skill_id: skl_roblox-luau-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-other-engines-roblox-luau-skill-md_d9d9d808
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:58:25.822Z"
---

# Roblox Luau

## Core Purpose
Guides agents through Roblox game development with Luau — Script/ModuleScript objects, Roblox service APIs (RunService, TweenService, CollectionService), instance management, and Roblox-specific Lua patterns.

## Trigger Semantics
Load when an agent creates a Roblox game, writes Luau scripts, uses Roblox services, or manages game instances.

## Capability Breakdown
Covers Script vs LocalScript vs ModuleScript differences, Roblox Instance management (Instance.new, parenting), common services (RunService for game loop, TweenService for animation, CollectionService for tagging), RemoteEvent/RemoteFunction for client-server networking, and DataStore for persistence.

## Workflow Role
Implementation — applied when building games on the Roblox platform.

## Inputs / Outputs
Inputs: game design specs. Outputs: Luau scripts, service integrations, instance hierarchies.

## Tool and Permission Profile
Roblox Studio (built-in script editor).

## Compatibility Notes
Complements roblox-datastores for data persistence. Works within the Roblox ecosystem only.

## Conflict Notes
No conflicts.

## Dedupe Notes
Engine-specific to Roblox/Luau. No duplicate.

## Evaluation Hooks
Verify the skill covers Roblox Luau-specific API and FilteringEnabled patterns.

## Evidence and Confidence
medium — based on source metadata and Roblox development knowledge. Full content review recommended.
