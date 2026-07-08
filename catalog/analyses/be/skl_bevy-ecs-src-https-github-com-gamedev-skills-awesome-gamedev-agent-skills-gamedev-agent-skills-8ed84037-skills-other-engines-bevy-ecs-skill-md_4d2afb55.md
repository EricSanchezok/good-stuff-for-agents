---
schema_version: 1
skill_id: skl_bevy-ecs-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-other-engines-bevy-ecs-skill-md_4d2afb55
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:58:25.739Z"
---

# Bevy Ecs

## Core Purpose
Guides agents through the Bevy game engine and its ECS (Entity Component System) architecture — system creation, component and resource management, queries, and Bevy's plugin-based structure.

## Trigger Semantics
Load when an agent creates a game with the Bevy engine, designs ECS components and systems, configures Bevy plugins, or uses Bevy's built-in systems (rendering, input, audio).

## Capability Breakdown
Covers Bevy App building and plugin setup, Component and Resource definitions, System functions and query parameters (Query, Res, Commands), system ordering and scheduling, Bevy built-in plugins (bevy_pbr, bevy_ui, bevy_audio), and spawning/manipulating entities.

## Workflow Role
Implementation — applied when building games with the Bevy engine in Rust.

## Inputs / Outputs
Inputs: game design specs. Outputs: ECS components, systems, plugins, Bevy app configuration.

## Tool and Permission Profile
Standard code editing, Rust toolchain (cargo).

## Compatibility Notes
Complements the Rust ecosystem. May be used alongside Rust-specific skills.

## Conflict Notes
No conflicts.

## Dedupe Notes
Engine-specific to Bevy. No duplicate.

## Evaluation Hooks
Verify the skill covers Bevy 0.12+ ECS API and system ordering patterns.

## Evidence and Confidence
medium — based on source metadata and Bevy ECS knowledge. Full content review recommended.
