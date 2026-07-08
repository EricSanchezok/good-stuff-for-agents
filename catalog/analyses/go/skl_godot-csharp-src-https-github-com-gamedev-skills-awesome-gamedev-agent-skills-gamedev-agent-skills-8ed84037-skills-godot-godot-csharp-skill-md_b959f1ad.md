---
schema_version: 1
skill_id: skl_godot-csharp-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-csharp-skill-md_b959f1ad
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.241Z"
---

# Godot Csharp

## Core Purpose
Guides agents through using C# with Godot — C# project setup in Godot, Godot C# API differences from GDScript, node access patterns, signal handling in C#, and C#-specific performance considerations.

## Trigger Semantics
Load when an agent sets up a C# Godot project, migrates from GDScript to C#, accesses Godot nodes from C#, implements signals and event patterns in C#, or optimizes C# script performance in Godot.

## Capability Breakdown
Covers C# project setup (.csproj configuration), Godot class inheritance (GodotObject, Node, Node2D), C# node access patterns (GetNode with generics), signal declaration and connection in C#, C# async patterns with Godot (ToSignal, Await), and C# performance considerations (struct vs class, allocation avoidance).

## Workflow Role
Implementation — applied when a project chooses C# over GDScript for Godot development.

## Inputs / Outputs
Inputs: game logic requirements. Outputs: C# Godot scripts, node hierarchy access code, signal implementations.

## Tool and Permission Profile
Standard code editing, Godot with .NET enabled, .NET SDK.

## Compatibility Notes
Complements godot-gdscript for understanding what C# replaces and godot-project-structure for solution organization.

## Conflict Notes
No conflicts with godot-gdscript — they are alternative languages for the same engine.

## Dedupe Notes
Distinct from godot-gdscript which covers the GDScript path. No duplicate.

## Evaluation Hooks
Verify that the skill targets Godot 4 C# API (not Godot 3) and that it covers .NET version requirements.

## Evidence and Confidence
medium — based on source metadata and Godot C# knowledge. Full content review recommended.
