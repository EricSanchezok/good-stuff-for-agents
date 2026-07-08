---
schema_version: 1
skill_id: skl_physics-tuning-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-disciplines-physics-tuning-skill-md_e89e790f
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:53:22.512Z"
---

# Physics Tuning

## Core Purpose
Guides agents through tuning game physics — rigid body parameters, collision detection modes, physics material configuration, constraint/joint tuning, and performance optimization for physics simulations.

## Trigger Semantics
Load when an agent tunes physics interactions in a game, adjusts collision detection accuracy vs performance, configures physics materials (friction, bounciness), sets up joints and constraints, or debugs unexpected physics behavior.

## Capability Breakdown
Covers rigid body type selection (dynamic, kinematic, static), collision detection modes (discrete, continuous, CCD), physics material configuration (friction, restitution, density), joint and constraint setup (hinge, spring, fixed), physics timestep tuning (fixed vs variable), and layer-based collision filtering for performance.

## Workflow Role
Implementation/Tuning — applied when setting up physics interactions and tuning them for desired gameplay feel.

## Inputs / Outputs
Inputs: collision shapes, mass values, desired physical behavior. Outputs: tuned physics configuration, collision layer setup, constraint configuration.

## Tool and Permission Profile
Standard code editing, game engine physics tools.

## Compatibility Notes
Complements godot-physics, unity-physics, and unreal-physics for engine-specific physics APIs. Works with game-feel for physics-driven feel.

## Conflict Notes
No conflicts. Physics tuning principles complement engine-specific physics skills.

## Dedupe Notes
Distinct from engine-specific physics skills by its tuning-focus. No duplicate.

## Evaluation Hooks
Verify that the skill covers both 2D and 3D physics tuning and that it addresses common physics bugs (tunneling, jitter).

## Evidence and Confidence
medium — based on source metadata and game physics knowledge. Full content review recommended.
