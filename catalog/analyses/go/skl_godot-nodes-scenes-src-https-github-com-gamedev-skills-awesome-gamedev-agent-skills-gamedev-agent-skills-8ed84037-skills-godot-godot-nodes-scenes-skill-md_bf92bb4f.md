---
schema_version: 1
skill_id: skl_godot-nodes-scenes-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-nodes-scenes-skill-md_bf92bb4f
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.361Z"
---

# Godot Nodes Scenes

## Core Purpose
Guides agents through Godot's scene system — node hierarchy design, scene composition with instancing (PackedScene), scene communication via signals and groups, and best practices for organizing game content into scenes.

## Trigger Semantics
Load when an agent designs Godot scene hierarchies, instantiates scenes at runtime, communicates between nodes using signals or groups, or refactors a flat node tree into well-encapsulated scenes.

## Capability Breakdown
Covers node types and their roles (Node2D, Control, Node3D), scene file structure (.tscn), PackedScene loading and instancing, signal wiring (editor and code), group membership for broadcast communication, scene inheritance and composition patterns, and owner/path references.

## Workflow Role
Design/Implementation — the foundational Godot skill for organizing game content into scenes and managing their relationships.

## Inputs / Outputs
Inputs: game content breakdown (levels, UI, characters). Outputs: scene hierarchy, PackedScene references, signal/group communication wiring.

## Tool and Permission Profile
Godot editor, standard script editing.

## Compatibility Notes
Complements all other Godot skills as the fundamental scene composition layer. Works with godot-resources for data-driven scene design.

## Conflict Notes
No conflicts with other Godot skills — this is foundational.

## Dedupe Notes
Engine-specific to Godot's scene system. No duplicate.

## Evaluation Hooks
Verify that the skill covers Godot 4's scene system (unique names, @export_node_path) and that it demonstrates proper scene encapsulation patterns.

## Evidence and Confidence
medium — based on source metadata and Godot scene system knowledge. Full content review recommended.
