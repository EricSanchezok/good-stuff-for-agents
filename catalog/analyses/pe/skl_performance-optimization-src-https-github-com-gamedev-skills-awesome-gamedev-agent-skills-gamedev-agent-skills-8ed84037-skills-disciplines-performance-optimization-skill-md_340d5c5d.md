---
schema_version: 1
skill_id: skl_performance-optimization-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-disciplines-performance-optimization-skill-md_340d5c5d
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:53:22.480Z"
---

# Performance Optimization

## Core Purpose
Guides agents through game performance optimization — CPU/GPU profiling, draw call reduction, LOD (Level of Detail) systems, occlusion culling, memory management, and platform-specific performance targets.

## Trigger Semantics
Load when an agent profiles game performance, optimizes rendering (draw calls, shader complexity), implements LOD systems, sets up occlusion culling, or optimizes for a specific platform target (console, mobile, VR).

## Capability Breakdown
Covers profiling tools and methodology (frame budget, GPU/CPU traces), draw call batching and instancing, LOD implementation and cross-fading, occlusion culling strategies, memory budgeting for textures and assets, platform-specific optimization (mobile battery, console ESRAM), and shader complexity analysis.

## Workflow Role
Review/Optimization — applied during performance tuning phases after core gameplay is functional.

## Inputs / Outputs
Inputs: performance profiles, platform targets, frame budget constraints. Outputs: optimization recommendations, LOD configurations, culling setups.

## Tool and Permission Profile
Profiling tools (RenderDoc, GPU profilers, engine profilers). Standard code editing.

## Compatibility Notes
Complements shader-programming for shader optimization and procedural-gen for content optimization. Engine-agnostic.

## Conflict Notes
No conflicts. Performance optimization is additive and applies to all systems.

## Dedupe Notes
Distinct from similar-named skills from other sources by its game-specific focus on rendering, LOD, and culling rather than web performance.

## Evaluation Hooks
Verify that the skill covers both CPU-bound and GPU-bound optimization and that mobile optimization guidance addresses thermal throttling.

## Evidence and Confidence
medium — based on source metadata and game performance optimization knowledge. Full content review recommended.
