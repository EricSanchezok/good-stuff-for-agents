---
schema_version: 1
skill_id: skl_godot-3d-essentials-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-3d-essentials-skill-md_40361774
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.150Z"
---

# Godot 3d Essentials

## Core Purpose
Guides agents through 3D development fundamentals in Godot — 3D node structure, camera setup, lighting, 3D physics (CharacterBody3D), and basic 3D rendering pipeline configuration.

## Trigger Semantics
Load when an agent sets up a 3D scene in Godot, configures 3D cameras and lighting, implements 3D player movement with CharacterBody3D, or manages 3D world rendering settings.

## Capability Breakdown
Covers 3D scene tree structure (Node3D), 3D camera setup (Camera3D, follow/examine modes), lighting types (DirectionalLight3D, OmniLight3D, SpotLight3D), 3D physics with CharacterBody3D and move_and_slide, WorldEnvironment node configuration (sky, ambient light), and basic 3D rendering settings (MSAA, HDR, tonemapping).

## Workflow Role
Implementation — applied when starting any 3D Godot project, establishing the foundational 3D scene and camera setup.

## Inputs / Outputs
Inputs: 3D scene requirements, camera behavior specs. Outputs: 3D scene configuration, camera controller, lighting setup, 3D player controller.

## Tool and Permission Profile
Standard code editing in Godot (GDScript or C#). Godot editor for 3D scene setup.

## Compatibility Notes
Complements godot-physics for 3D physics and godot-nodes-scenes for scene organization. Works with godot-animation for 3D animation.

## Conflict Notes
No conflicts with other Godot skills — this is the foundational 3D skill others build on.

## Dedupe Notes
Engine-specific to Godot 3D. No duplicate. Complements godot-2d-movement which covers 2D.

## Evaluation Hooks
Verify that the skill targets Godot 4 API (forward+ or mobile renderer) and that camera controller patterns suit different game types.

## Evidence and Confidence
medium — based on source metadata and Godot 3D knowledge. Full content review recommended.
