---
schema_version: 1
skill_id: skl_godot-2d-movement-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-2d-movement-skill-md_ec0d2e78
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.118Z"
---

# Godot 2d Movement

## Core Purpose
Guides agents through implementing 2D player movement in Godot — CharacterBody2D setup, velocity-based movement, acceleration/deceleration, jump physics, and platform-specific movement types (top-down, platformer, flying).

## Trigger Semantics
Load when an agent implements player character movement in a 2D Godot game, configures CharacterBody2D physics, tunes movement feel (acceleration, friction, gravity), or handles movement state transitions (grounded, airborne, dashing).

## Capability Breakdown
Covers CharacterBody2D and move_and_slide/move_and_collide usage, velocity-based movement with acceleration and friction curves, jump physics (variable jump height, coyote time, jump buffering), directional movement for top-down games, and slope handling for platformer games.

## Workflow Role
Implementation — applied early in 2D game development when establishing player controller behavior.

## Inputs / Outputs
Inputs: movement design specs (speed, jump height, acceleration). Outputs: CharacterBody2D-based movement controller, movement parameter tuning.

## Tool and Permission Profile
Standard code editing in Godot (GDScript or C#).

## Compatibility Notes
Complements godot-gdscript for input action handling and godot-physics for physics integration. Works with godot-animation for movement animation blending.

## Conflict Notes
May overlap partially with godot-physics on movement physics — this skill focuses on player-controlled movement specifically.

## Dedupe Notes
Engine-specific — no other skill covers Godot 2D movement. No duplicate.

## Evaluation Hooks
Verify that the skill covers coyote time and jump buffering (standard for platformer feel) and that it works with Godot 4's CharacterBody2D API.

## Evidence and Confidence
medium — based on source metadata and Godot 2D development knowledge. Full content review recommended.
