---
schema_version: 1
skill_id: skl_input-systems-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-disciplines-input-systems-skill-md_f39a37ef
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:53:22.419Z"
---

# Input Systems

## Core Purpose
Guides agents through implementing game input systems — handling keyboard, mouse, gamepad, and touch input, input action mapping, input buffering and rebinding, and multi-platform input abstraction.

## Trigger Semantics
Load when an agent implements player input handling in a game, configures action mappings, supports multiple input devices, implements controller vibration or gyro, or builds a rebindable input system.

## Capability Breakdown
Covers input abstraction layers (actions vs raw input), action mapping and rebinding, gamepad support (dead zones, vibration, trigger threshold), touch/gesture input patterns, input buffering for fighting/action games, and platform-specific input considerations (Switch, mobile, PC).

## Workflow Role
Implementation — applied early in development when establishing how players interact with the game.

## Inputs / Outputs
Inputs: input device types to support, action definitions. Outputs: input system implementation, action mappings, input event pipeline.

## Tool and Permission Profile
Standard code editing, game engine input system tools.

## Compatibility Notes
Complements godot-input, unity-input-system, and unreal-enhanced-input for engine-specific implementation. Works with game-feel for responsive input feel.

## Conflict Notes
No conflicts. Input system design principles complement engine-specific input skills.

## Dedupe Notes
Distinct from engine-specific input skills by its design-principle focus. No duplicate.

## Evaluation Hooks
Verify that the skill covers input event buffering and polling trade-offs and that it addresses latency/response time considerations.

## Evidence and Confidence
medium — based on source metadata and game input system knowledge. Full content review recommended.
