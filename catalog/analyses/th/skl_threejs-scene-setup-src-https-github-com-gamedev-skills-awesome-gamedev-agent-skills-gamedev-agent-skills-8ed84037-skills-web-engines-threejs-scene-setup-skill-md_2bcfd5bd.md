---
schema_version: 1
skill_id: skl_threejs-scene-setup-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-web-engines-threejs-scene-setup-skill-md_2bcfd5bd
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:58:25.655Z"
---

# Threejs Scene Setup

## Core Purpose
Guides agents through Three.js scene fundamentals — Scene, Camera (Perspective, Orthographic), Renderer (WebGLRenderer), geometry creation, and basic lighting setup for 3D web graphics.

## Trigger Semantics
Load when an agent creates a Three.js 3D scene, configures cameras and renderers, places basic geometry, or sets up scene lighting.

## Capability Breakdown
Covers Scene, Camera (PerspectiveCamera, OrthographicCamera), WebGLRenderer setup and pixel ratio, BufferGeometry creation, MeshBasicMaterial/MeshStandardMaterial, lighting types (AmbientLight, DirectionalLight, PointLight), and OrbitControls for scene navigation.

## Workflow Role
Implementation — applied when starting any Three.js 3D web project.

## Inputs / Outputs
Inputs: 3D scene requirements. Outputs: Three.js scene, camera, renderer, basic objects.

## Tool and Permission Profile
Standard code editing, npm for three.js package.

## Compatibility Notes
Complements threejs-materials-lighting and threejs-gltf-loading for more advanced rendering and asset loading.

## Conflict Notes
No conflicts with other Three.js skills.

## Dedupe Notes
Engine-specific to Three.js. No duplicate. This is the foundational scene setup skill.

## Evaluation Hooks
Verify the skill covers Three.js r150+ API and renderer optimization.

## Evidence and Confidence
medium — based on source metadata and Three.js knowledge. Full content review recommended.
