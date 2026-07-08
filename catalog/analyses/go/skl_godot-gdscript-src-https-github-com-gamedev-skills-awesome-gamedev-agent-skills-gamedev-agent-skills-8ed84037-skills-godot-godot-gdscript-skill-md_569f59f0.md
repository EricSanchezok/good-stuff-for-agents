---
schema_version: 1
skill_id: skl_godot-gdscript-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-gdscript-skill-md_569f59f0
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.301Z"
---

# Godot Gdscript

## Core Purpose
Guides agents through writing GDScript in Godot — GDScript syntax and idioms, built-in type annotations, signal handling, coroutines (await), and GDScript-specific best practices for game development.

## Trigger Semantics
Load when an agent writes new GDScript code in Godot, learns GDScript patterns and idioms, types GDScript with annotations, or needs guidance on GDScript-specific features like signals and awaits.

## Capability Breakdown
Covers GDScript syntax fundamentals (variables, functions, control flow), type annotations and static typing, signal declaration and connection, coroutines with await and async, inner classes and enums, GDScript-specific utilities (@export, @onready, @tool), and performance considerations for GDScript vs C#.

## Workflow Role
Implementation — the primary coding skill for Godot projects using GDScript, applied throughout development.

## Inputs / Outputs
Inputs: game logic specifications. Outputs: GDScript implementations, typed node references, signal-based event patterns.

## Tool and Permission Profile
Godot editor with built-in GDScript editor.

## Compatibility Notes
Complements all other Godot skills as the language layer they build upon. Works alongside godot-csharp for mixed-language projects.

## Conflict Notes
No conflicts with godot-csharp — they are alternative languages. Choose per project requirements.

## Dedupe Notes
The primary GDScript language skill. No duplicate. Related to but distinct from godot-csharp.

## Evaluation Hooks
Verify that the skill uses Godot 4 GDScript syntax (not Godot 3) and that it covers static typing best practices.

## Evidence and Confidence
medium — based on source metadata and Godot GDScript knowledge. Full content review recommended.
