---
schema_version: 1
skill_id: skl_godot-signals-groups-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-signals-groups-skill-md_bb9129f8
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.484Z"
---

# Godot Signals Groups

## Core Purpose
Guides agents through Godot's signal and group communication systems — signal declaration and connection patterns, group-based broadcasting, custom signal design, and decoupled communication between nodes.

## Trigger Semantics
Load when an agent wires up event-based communication between Godot nodes, creates custom signals for cross-scene events, uses groups for broadcase messaging (enemy group notifications), or decouples game systems through signal-based architecture.

## Capability Breakdown
Covers built-in signal connection (editor and code), custom signal declaration with parameters, signal connection types (one-shot, deferred), group membership and messaging (notify_group), signal-to-method binding patterns, and autoload/singleton event bus patterns for global communication.

## Workflow Role
Implementation — applied throughout development for decoupled inter-node communication.

## Inputs / Outputs
Inputs: event types that need cross-node communication. Outputs: signal declarations, group registrations, event bus implementations.

## Tool and Permission Profile
Standard code editing in Godot.

## Compatibility Notes
Complements godot-nodes-scenes for scene communication foundations. Used by all other Godot skills for event-driven patterns.

## Conflict Notes
No conflicts. Signals and groups are the standard communication mechanism in Godot.

## Dedupe Notes
Engine-specific to Godot. No duplicate.

## Evaluation Hooks
Verify that the skill covers Godot 4's signal connection syntax (@signal, signal.connect()) and that group performance considerations are addressed.

## Evidence and Confidence
medium — based on source metadata and Godot signal/group knowledge. Full content review recommended.
