---
schema_version: 1
skill_id: skl_fps-shooter-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-genres-fps-shooter-skill-md_dd2a7dcc
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:59:39.261Z"
---

# Fps Shooter

## Core Purpose
Guides agents through first-person shooter development — player controller (walk, sprint, aim-down-sights), weapon systems (fire, reload, recoil patterns), damage and health systems, and enemy combat AI.

## Trigger Semantics
Load when an agent builds an FPS game, implements weapon mechanics, designs hit-scan or projectile combat, or creates enemy combat AI.

## Capability Breakdown
Covers FPS player controller setup (movement speed, head bob, FOV effects), weapon systems (fire rate, magazine, reload, recoil recovery), hit-scan vs projectile weapon calculation, damage and health system (armor, headshot multiplier, damage falloff), weapon switching and inventory, and enemy combat AI (cover, flanking, shooting patterns).

## Workflow Role
Implementation — applied when building shooter gameplay mechanics.

## Inputs / Outputs
Inputs: weapon stats, player movement specs. Outputs: weapon system, damage handler, player controller.

## Tool and Permission Profile
Standard game engine tools, 3D asset pipeline.

## Compatibility Notes
Complements camera-systems for FPS camera implementation and game-ai for enemy behavior. Works with godot-3d-essentials, unity-2d/-3d, or unreal-cpp-gameplay.

## Conflict Notes
No conflicts.

## Dedupe Notes
Genre-specific — no other FPS skill in the catalog.

## Evaluation Hooks
Verify the skill covers both hitscan and projectile weapon patterns and recoil/recovery mechanics.

## Evidence and Confidence
medium — based on source metadata and FPS game design knowledge. Full content review recommended.
