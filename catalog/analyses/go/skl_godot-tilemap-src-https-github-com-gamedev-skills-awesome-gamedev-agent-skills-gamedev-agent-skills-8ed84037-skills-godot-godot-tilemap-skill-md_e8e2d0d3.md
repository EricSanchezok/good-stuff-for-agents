---
schema_version: 1
skill_id: skl_godot-tilemap-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-tilemap-skill-md_e8e2d0d3
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.515Z"
---

# Godot Tilemap

## Core Purpose
Guides agents through Godot's TileMap and TileSet system — tilemap layer creation, tileset configuration, terrain-based auto-tiling, custom tile data, and tilemap rendering optimization.

## Trigger Semantics
Load when an agent creates 2D tile-based levels in Godot, configures TileSet resources with tile physics and navigation, implements auto-tiling for terrain blending, or adds custom data to tiles for gameplay logic.

## Capability Breakdown
Covers TileMap node setup and layer management, TileSet resource configuration (tiles, terrains, navigation layers), terrain-based auto-tiling patterns, custom tile data (Animation, probability, scenes), tile collision and physics layers, and tilemap rendering optimization (layering, occlusion).

## Workflow Role
Implementation — applied during 2D level creation when using tile-based level design.

## Inputs / Outputs
Inputs: tile sprite assets, terrain type definitions. Outputs: TileSet resources, TileMap layer configurations, tile-based level layout.

## Tool and Permission Profile
Godot editor (TileMap editor tools).

## Compatibility Notes
Complements godot-2d-movement for tile-based level traversal and procedural-gen for tile-based procedural generation. Works with godot-physics for tile collision.

## Conflict Notes
No conflicts with other Godot skills.

## Dedupe Notes
Engine-specific to Godot tilemaps. No duplicate. Complements unity-tilemap-2d from the Unity ecosystem.

## Evaluation Hooks
Verify that the skill covers Godot 4's TileMap/TileSet system (not Godot 3) and that terrain-based auto-tiling is explained with practical examples.

## Evidence and Confidence
medium — based on source metadata and Godot tilemap knowledge. Full content review recommended.
