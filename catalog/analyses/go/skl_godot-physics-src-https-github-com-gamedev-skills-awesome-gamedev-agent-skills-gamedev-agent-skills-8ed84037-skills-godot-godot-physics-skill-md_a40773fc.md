---
schema_version: 1
skill_id: skl_godot-physics-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-physics-skill-md_a40773fc
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.393Z"
---

# Godot Physics

## Core Purpose
Guides agents through Godot's physics system — RigidBody2D/3D, Area2D/3D, collision shapes and layers, physics materials, and physics query methods (raycasting, overlap tests).

## Trigger Semantics
Load when an agent implements physics interactions in Godot, sets up collision detection and layers, performs raycasts or overlap queries, or configures physics materials for different surface types.

## Capability Breakdown
Covers physics body types (CharacterBody2D/3D, RigidBody2D/3D, StaticBody2D/3D, Area2D/3D), collision layers and masks for filtering, collision shape types, physics material properties (friction, bounce), physics query methods (intersect_ray, intersect_shape), and signals for area/body enter/exit detection.

## Workflow Role
Implementation — applied when setting up physical interactions between game objects.

## Inputs / Outputs
Inputs: collision design specs, physics behavior requirements. Outputs: physics body setup, collision layer configuration, query scripts.

## Tool and Permission Profile
Standard code editing in Godot, Godot editor for collision shapes.

## Compatibility Notes
Complements godot-2d-movement and godot-3d-essentials for movement physics integration. Works with physics-tuning for fine-tuning physics parameters.

## Conflict Notes
May overlap with godot-2d-movement's physics aspects — this skill is the broader physics system reference.

## Dedupe Notes
Engine-specific to Godot physics. No duplicate.

## Evaluation Hooks
Verify that the skill covers Godot 4's physics server and collision layer system and that it addresses both 2D and 3D physics.

## Evidence and Confidence
medium — based on source metadata and Godot physics knowledge. Full content review recommended.
