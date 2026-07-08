---
schema_version: 1
skill_id: skl_love2d-core-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-other-engines-love2d-core-skill-md_3be3e110
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:58:25.794Z"
---

# Love2d Core

## Core Purpose
Guides agents through LÖVE (Love2D) game development in Lua — love callbacks (load, update, draw), graphics primitives, image and text rendering, input handling, and audio playback.

## Trigger Semantics
Load when an agent creates a 2D game with LÖVE, manages the game lifecycle callbacks, draws graphics primitives or images, or handles input events.

## Capability Breakdown
Covers love callbacks (love.load, love.update, love.draw, love.keypressed), graphics module (love.graphics) for primitives, images, and text, input handling (keyboard, mouse, joystick), audio playback (love.audio), and physics via love.physics (Box2D wrapper).

## Workflow Role
Implementation — applied when building 2D games in Lua with LÖVE.

## Inputs / Outputs
Inputs: game design specs. Outputs: main.lua, game callbacks, drawing code.

## Tool and Permission Profile
Standard code editing, LÖVE engine installed.

## Compatibility Notes
Complements Lua language skills. Lightweight engine for rapid game prototyping.

## Conflict Notes
No conflicts.

## Dedupe Notes
Engine-specific to LÖVE/Love2D. No duplicate.

## Evaluation Hooks
Verify the skill covers love2d 11.x callback API and love.graphics drawing patterns.

## Evidence and Confidence
medium — based on source metadata and LÖVE knowledge. Full content review recommended.
