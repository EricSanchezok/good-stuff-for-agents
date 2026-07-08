---
schema_version: 1
skill_id: skl_godot-resources-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-resources-skill-md_ef774b02
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.422Z"
---

# Godot Resources

## Core Purpose
Guides agents through Godot's resource system — creating custom Resource types, data-driven design with resources, resource preloading and caching, built-in resource types (Curve, Gradient, Noise), and resource file serialization.

## Trigger Semantics
Load when an agent creates custom Resource classes for data-driven design in Godot, preloads or caches resource files, uses built-in resource types for procedural content, or serializes game data as .tres/.res files.

## Capability Breakdown
Covers Resource base class and custom resource creation, data-driven game object design (stats, loot tables), resource loading methods (preload, load, ResourceLoader), built-in resource types (Curve, Gradient, FastNoiseLite), resource caching and sharing between scenes, and resource file format (.tres vs .res).

## Workflow Role
Implementation — applied when designing data-driven game systems that separate data from logic.

## Inputs / Outputs
Inputs: data schema for game content. Outputs: custom Resource classes, resource files (.tres/.res), loading/caching code.

## Tool and Permission Profile
Godot editor, standard script editing.

## Compatibility Notes
Complements godot-nodes-scenes for scene-data binding. Works with godot-export for resource optimization.

## Conflict Notes
No conflicts. Resource system is foundational to Godot development.

## Dedupe Notes
Engine-specific to Godot resources. No duplicate.

## Evaluation Hooks
Verify that the skill covers Godot 4's @export_resource and ResourceFormatLoader and that custom resource patterns work with the inspector.

## Evidence and Confidence
medium — based on source metadata and Godot resource system knowledge. Full content review recommended.
