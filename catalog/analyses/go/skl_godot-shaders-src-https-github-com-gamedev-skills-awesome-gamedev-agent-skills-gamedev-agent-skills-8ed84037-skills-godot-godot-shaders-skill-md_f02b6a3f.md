---
schema_version: 1
skill_id: skl_godot-shaders-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-shaders-skill-md_f02b6a3f
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.453Z"
---

# Godot Shaders

## Core Purpose
Guides agents through writing shaders in Godot using the Godot Shading Language — shader types (canvas_item, spatial, particles), built-in uniforms, shader parameter customization, and common game shader effects.

## Trigger Semantics
Load when an agent writes custom shaders in Godot, applies shader effects to 2D sprites or 3D materials, creates particle shaders, or customizes shader parameters from code.

## Capability Breakdown
Covers shader type selection (canvas_item for 2D, spatial for 3D, particles), Godot Shading Language syntax (GLSL-like), built-in vertex and fragment functions, shader parameter exported variables, common 2D shader effects (dissolve, outline, wave), 3D shader effects (custom lighting, PBR modification), and particle shader customization.

## Workflow Role
Implementation — applied when creating custom visual effects beyond Godot's built-in material system.

## Inputs / Outputs
Inputs: visual effect requirements. Outputs: shader code (.gdshader), ShaderMaterial configurations.

## Tool and Permission Profile
Standard code editing, Godot editor (ShaderMaterial inspector).

## Compatibility Notes
Complements shader-programming for general shader concepts and godot-animation for shader parameter animation. Works with godot-3d-essentials for 3D shader application.

## Conflict Notes
No conflicts. This is the Godot-specific shader skill — complementary to general shader-programming.

## Dedupe Notes
Engine-specific to Godot shaders. No duplicate. Complements the general shader-programming discipline skill.

## Evaluation Hooks
Verify that the skill covers Godot 4's shader system and shader language changes from Godot 3.

## Evidence and Confidence
medium — based on source metadata and Godot shader knowledge. Full content review recommended.
