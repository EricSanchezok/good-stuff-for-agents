---
schema_version: 1
skill_id: skl_threejs-gltf-loading-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-web-engines-threejs-gltf-loading-skill-md_914bbac2
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:58:25.711Z"
---

# Threejs Gltf Loading

## Core Purpose
Guides agents through loading and using GLTF/GLB 3D models in Three.js — GLTFLoader usage, model animation playback, material overrides, and optimization for web delivery.

## Trigger Semantics
Load when an agent loads 3D models from GLTF/GLB files into Three.js, plays model animations, or optimizes model loading performance.

## Capability Breakdown
Covers GLTFLoader import and model parsing, scene graph traversal after load, animation clips and AnimationMixer for playback, material overrides and replacements, DRACOLoader for compressed geometry, and model LOD and loading optimization.

## Workflow Role
Implementation — applied when integrating 3D assets into Three.js scenes.

## Inputs / Outputs
Inputs: GLTF/GLB model files. Outputs: loaded Three.js objects, animation controllers, optimized loading code.

## Tool and Permission Profile
Standard code editing, npm for three.js and DRACOLoader packages.

## Compatibility Notes
Complements threejs-scene-setup and threejs-materials-lighting for complete 3D asset pipeline.

## Conflict Notes
No conflicts.

## Dedupe Notes
Engine-specific to Three.js GLTF loading. No duplicate.

## Evaluation Hooks
Verify the skill covers GLTFLoader usage and Draco decompression setup.

## Evidence and Confidence
medium — based on source metadata and Three.js GLTF knowledge. Full content review recommended.
