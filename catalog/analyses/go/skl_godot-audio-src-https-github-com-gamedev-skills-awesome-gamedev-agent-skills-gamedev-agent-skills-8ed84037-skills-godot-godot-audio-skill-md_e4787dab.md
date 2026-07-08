---
schema_version: 1
skill_id: skl_godot-audio-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-audio-skill-md_e4787dab
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.211Z"
---

# Godot Audio

## Core Purpose
Guides agents through implementing audio in Godot — AudioStreamPlayer2D/3D usage, audio buses and effects, sound playback triggering, audio streaming, and spatial audio configuration.

## Trigger Semantics
Load when an agent adds sound effects or music to a Godot project, configures the audio bus layout with effects (reverb, EQ), implements spatial (3D) audio, or manages audio resource loading and streaming.

## Capability Breakdown
Covers AudioStreamPlayer2D and AudioStreamPlayer3D usage, audio bus layout configuration with effects (ReverbBus, FilterBus), sound triggering from code or animation events, audio resource management (preloading vs streaming), spatial audio positioning and attenuation, and audio mixer and volume control bus setup.

## Workflow Role
Implementation — applied when integrating audio assets into a Godot project, from SFX triggers to background music management.

## Inputs / Outputs
Inputs: audio asset files (OGG, WAV, MP3), spatial placement info. Outputs: audio player nodes, bus configuration, sound trigger implementation.

## Tool and Permission Profile
Godot editor, standard script editing.

## Compatibility Notes
Complements audio-design for audio asset strategy and game-feel for audio-driven feel. Pairs with godot-export for audio asset optimization.

## Conflict Notes
No conflicts with other Godot skills.

## Dedupe Notes
Engine-specific to Godot audio. No duplicate. Complements the general audio-design discipline skill.

## Evaluation Hooks
Verify that audio bus setup works with Godot 4's audio system and that spatial audio configuration matches the 2D/3D scene type.

## Evidence and Confidence
medium — based on source metadata and Godot audio knowledge. Full content review recommended.
