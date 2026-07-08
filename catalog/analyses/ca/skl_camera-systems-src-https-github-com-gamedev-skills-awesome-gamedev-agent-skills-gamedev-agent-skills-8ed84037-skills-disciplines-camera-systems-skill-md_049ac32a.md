---
schema_version: 1
skill_id: skl_camera-systems-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-disciplines-camera-systems-skill-md_049ac32a
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:53:22.267Z"
---

# Camera Systems

## Core Purpose
Guides agents through designing and implementing game camera systems — camera modes (third-person, first-person, fixed, cinematic), camera follow algorithms, collision handling, viewport management, and camera transitions.

## Trigger Semantics
Load when an agent implements camera behavior in a game, designs camera follow logic, handles camera collision (obstacle avoidance), manages camera transitions between states, or configures split-screen/multi-viewport setups.

## Capability Breakdown
Covers camera modes and their implementation (third-person orbit, first-person, top-down, side-scrolling), smooth follow algorithms (lerp, spring-based), camera collision and obstruction handling, viewport management for split-screen, camera shakes and effects, and virtual camera system patterns.

## Workflow Role
Implementation — applied during gameplay programming when setting up the player's view of the game world.

## Inputs / Outputs
Inputs: game genre requirements, camera mode specifications, world collision data. Outputs: camera controller implementation, follow algorithms, collision handling code.

## Tool and Permission Profile
Standard code editing, game engine integration.

## Compatibility Notes
Complements godot-2d-movement, godot-3d-essentials, and unity engine skills. Works with game-feel for camera-based game feel (camera shake, FOV changes).

## Conflict Notes
No conflicts. Camera system design is independent of other gameplay systems.

## Dedupe Notes
Unique in the catalog — no other skill covers camera system design comprehensively. May overlap partially with engine-specific camera handling.

## Evaluation Hooks
Verify that camera follow algorithms handle edge cases (target fast movement, world boundaries) and that the skill covers both 2D and 3D camera considerations.

## Evidence and Confidence
medium — based on source metadata and game camera design knowledge. Full content review recommended.
