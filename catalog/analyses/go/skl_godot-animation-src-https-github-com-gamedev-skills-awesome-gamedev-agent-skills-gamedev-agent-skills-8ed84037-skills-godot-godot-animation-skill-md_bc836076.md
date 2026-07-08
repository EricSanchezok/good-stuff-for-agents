---
schema_version: 1
skill_id: skl_godot-animation-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-animation-skill-md_bc836076
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.180Z"
---

# Godot Animation

## Core Purpose
Guides agents through the Godot animation system — AnimationPlayer nodes, animation trees, blend spaces, state machines, tween-based animation, and animation event/function call integration.

## Trigger Semantics
Load when an agent implements animations in Godot, creates animation state machines, blends between animations (walk to run), uses AnimationPlayer for complex sequences, or integrates animation events with game logic.

## Capability Breakdown
Covers AnimationPlayer setup and keyframe animation, AnimationTree for blending (blend spaces, one-shot, state machines), animation state machine design for character locomotion, Tween usage for simple transitions, animation method tracks for game logic callbacks, and animation root motion for 3D characters.

## Workflow Role
Implementation — applied when bringing game characters and objects to life through animated movement and state transitions.

## Inputs / Outputs
Inputs: character rig/animation assets, desired state transitions. Outputs: animation controllers, blend spaces, state machine definitions.

## Tool and Permission Profile
Godot editor (Animation panel), standard script editing for animation control.

## Compatibility Notes
Complements godot-2d-movement and godot-3d-essentials for movement-animation integration. Works with godot-export for animation asset management.

## Conflict Notes
No conflicts with other Godot skills.

## Dedupe Notes
Engine-specific to Godot. No duplicate. Complements general animation concepts from disciplines.

## Evaluation Hooks
Verify that the skill covers Godot 4's AnimationTree and AnimationPlayer APIs and that state machine examples cover common character states (idle, walk, run, jump).

## Evidence and Confidence
medium — based on source metadata and Godot animation knowledge. Full content review recommended.
