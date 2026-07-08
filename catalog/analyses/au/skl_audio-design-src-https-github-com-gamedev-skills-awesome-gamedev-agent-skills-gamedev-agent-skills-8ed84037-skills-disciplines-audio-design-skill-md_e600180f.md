---
schema_version: 1
skill_id: skl_audio-design-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-disciplines-audio-design-skill-md_e600180f
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:53:22.236Z"
---

# Audio Design

## Core Purpose
Guides agents through game audio design — sound effects creation, music integration, spatial audio, audio middleware usage (Wwise, FMOD), adaptive audio systems, and audio performance optimization for games.

## Trigger Semantics
Load when an agent designs the audio pipeline for a game, selects audio middleware, implements spatial audio (3D positional sound), creates sound banks, or optimizes audio memory usage.

## Capability Breakdown
Covers audio engine selection and integration, sound effect layering and variation, music systems (horizontal/vertical re-sequencing), spatial audio and HRTF, audio middleware (Wwise, FMOD) integration, audio memory budgeting and streaming, and adaptive audio for gameplay events.

## Workflow Role
Design/Implementation — applied during game development when establishing the audio architecture and integrating audio assets into the game engine.

## Inputs / Outputs
Inputs: game design requirements for audio events, sound asset specifications, platform constraints. Outputs: audio system architecture, middleware integration code, sound bank configuration, spatial audio setup.

## Tool and Permission Profile
Standard file editing, audio middleware tools (Wwise, FMOD), game engine integration. May require audio asset authoring tools.

## Compatibility Notes
Complements godot-audio or engine-specific audio skills. Works with game-feel for audio-driven game feel (hit sounds, feedback).

## Conflict Notes
No conflicts — audio design is a standalone discipline.

## Dedupe Notes
Distinct from engine-specific audio skills which focus on engine API usage rather than audio design principles. No duplicate.

## Evaluation Hooks
Verify that audio middleware integration patterns match the target game engine API, and that spatial audio guidance respects platform limitations (mobile vs desktop).

## Evidence and Confidence
medium — based on source metadata and game audio design knowledge. Full content review recommended.
