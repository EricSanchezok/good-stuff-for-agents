---
schema_version: 1
skill_id: skl_unity-physics-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-unity-unity-physics-skill-md_c690a290
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:57:29.899Z"
---

# Unity Physics

## Core Purpose
Guides agents through Unity's physics systems (PhysX for 3D, Box2D for 2D) — Rigidbody and Collider components, physics materials, joints, raycasting, and optimization.

## Trigger Semantics
Load when an agent implements physics interactions, configures Rigidbody and Collider components, uses joints, or performs raycast/overlap queries.

## Capability Breakdown
Covers Rigidbody configuration, collider types, physics materials, joint setup, physics queries (Raycast, SphereCast, OverlapSphere), collision matrix and layer filtering, and continuous collision detection.

## Workflow Role
Implementation — applied when setting up physical interactions between game objects.

## Inputs / Outputs
Inputs: collision and physics behavior specs. Outputs: Rigidbody/collider configs, joint setups, physics scripts.

## Tool and Permission Profile
Unity editor (Physics settings). Standard script editing.

## Compatibility Notes
Complements physics-tuning for general principles and unity-2d for 2D-specific concerns.

## Conflict Notes
No conflicts.

## Dedupe Notes
Engine-specific to Unity physics. No duplicate.

## Evaluation Hooks
Verify the skill covers both 2D and 3D physics components and performance guidance.

## Evidence and Confidence
medium — based on source metadata and Unity physics knowledge. Full content review recommended.
