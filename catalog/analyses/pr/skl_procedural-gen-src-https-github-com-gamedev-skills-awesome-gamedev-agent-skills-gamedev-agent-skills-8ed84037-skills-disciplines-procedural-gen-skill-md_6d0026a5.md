---
schema_version: 1
skill_id: skl_procedural-gen-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-disciplines-procedural-gen-skill-md_6d0026a5
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:53:22.544Z"
---

# Procedural Gen

## Core Purpose
Guides agents through procedural content generation for games — noise-based terrain generation, dungeon generation algorithms (BSP, cellular automata), loot/stat distribution, and seed-based deterministic generation.

## Trigger Semantics
Load when an agent generates game content procedurally (levels, terrain, loot, items), implements noise algorithms for terrain, designs dungeon room layout generation, or creates seed-based generation with reproducible results.

## Capability Breakdown
Covers noise algorithms (Perlin, Simplex, Voronoi) for terrain and texture generation, dungeon generation algorithms (BSP, random walk, cellular automata), loot table and item stat distribution, seed management for deterministic and multiplayer-sync'd generation, and architectural rule-based building generation.

## Workflow Role
Implementation — applied when creating systems that generate game content algorithmically.

## Inputs / Outputs
Inputs: generation rules, seed values, content constraints. Outputs: generated level layouts, terrain heightmaps, item/loot distributions.

## Tool and Permission Profile
Standard code editing. May use noise library packages.

## Compatibility Notes
Complements level-design for proc-gen level integration and godot-tilemap or unity-tilemap-2d for tile-based generation output.

## Conflict Notes
No conflicts. Procedural generation is additive to authored content.

## Dedupe Notes
Unique in the catalog — no other skill covers game procedural generation comprehensively.

## Evaluation Hooks
Verify that the skill covers seed reproducibility and that generation algorithms are documented with performance characteristics.

## Evidence and Confidence
medium — based on source metadata and procedural generation knowledge. Full content review recommended.
