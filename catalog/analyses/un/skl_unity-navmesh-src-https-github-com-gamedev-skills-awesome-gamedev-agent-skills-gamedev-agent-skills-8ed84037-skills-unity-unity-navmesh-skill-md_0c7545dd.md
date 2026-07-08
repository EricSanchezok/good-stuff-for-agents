---
schema_version: 1
skill_id: skl_unity-navmesh-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-unity-unity-navmesh-skill-md_0c7545dd
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:57:29.871Z"
---

# Unity Navmesh

## Core Purpose
Guides agents through Unity's NavMesh system for AI pathfinding — NavMesh baking, NavMeshAgent configuration, obstacle avoidance, off-mesh links, and dynamic updates.

## Trigger Semantics
Load when an agent implements AI pathfinding in Unity, bakes NavMesh, configures NavMeshAgent parameters, or sets up off-mesh links.

## Capability Breakdown
Covers NavMesh surface baking, NavMeshAgent configuration, obstacle avoidance, OffMeshLink components, NavMeshModifier for area costing, and dynamic NavMesh updates.

## Workflow Role
Implementation — applied when adding navigation to AI characters.

## Inputs / Outputs
Inputs: level geometry, AI movement requirements. Outputs: baked NavMesh, agent configurations, navigation scripts.

## Tool and Permission Profile
Unity editor (Navigation window). Standard script editing.

## Compatibility Notes
Complements game-ai for higher-level AI behavior and unity-physics for collision-avoidance.

## Conflict Notes
No conflicts.

## Dedupe Notes
Engine-specific to Unity NavMesh. No duplicate.

## Evaluation Hooks
Verify the skill covers both static and dynamic obstacle scenarios.

## Evidence and Confidence
medium — based on source metadata and Unity NavMesh knowledge. Full content review recommended.
