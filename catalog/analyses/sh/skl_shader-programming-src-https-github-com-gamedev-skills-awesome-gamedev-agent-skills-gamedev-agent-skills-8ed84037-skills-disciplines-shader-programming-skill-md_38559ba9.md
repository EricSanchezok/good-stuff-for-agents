---
schema_version: 1
skill_id: skl_shader-programming-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-disciplines-shader-programming-skill-md_38559ba9
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:53:22.606Z"
---

# Shader Programming

## Core Purpose
Guides agents through writing shaders for game rendering — vertex and fragment shaders, post-processing effects, lighting models, GPU instancing, and shader optimization for different rendering pipelines.

## Trigger Semantics
Load when an agent writes custom shaders for game visuals, implements post-processing effects, creates custom lighting models, or optimizes shader performance for target platforms.

## Capability Breakdown
Covers shader pipeline stages (vertex, fragment, compute, geometry), common shading models (Lambert, Blinn-Phong, PBR), post-processing effects (bloom, SSAO, color grading), GPU instancing and indirect drawing, shader optimization (ALUs, texture samples, bandwidth), and shading language portability (HLSL, GLSL, ShaderLab).

## Workflow Role
Implementation — applied when creating custom visual effects and rendering behaviors beyond what the engine provides out of the box.

## Inputs / Outputs
Inputs: visual effect requirements, target platform capabilities. Outputs: shader code, material configurations, rendering pipeline setup.

## Tool and Permission Profile
Standard code editing, shader development tools (RenderDoc, ShaderToy).

## Compatibility Notes
Complements godot-shaders, unreal-niagara for engine-specific shader syntax. Works with performance-optimization for shader optimization.

## Conflict Notes
No conflicts. Shader programming complements engine-specific shading skills.

## Dedupe Notes
Distinct from engine-specific shader skills by its general shader programming focus. No duplicate.

## Evaluation Hooks
Verify that the skill covers both forward and deferred rendering pipeline considerations and that optimization guidance is platform-specific.

## Evidence and Confidence
medium — based on source metadata and shader programming knowledge. Full content review recommended.
