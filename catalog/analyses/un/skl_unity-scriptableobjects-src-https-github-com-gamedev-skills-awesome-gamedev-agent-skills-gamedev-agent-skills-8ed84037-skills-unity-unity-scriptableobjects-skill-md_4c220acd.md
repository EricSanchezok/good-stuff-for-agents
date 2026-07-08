---
schema_version: 1
skill_id: skl_unity-scriptableobjects-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-unity-unity-scriptableobjects-skill-md_4c220acd
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:57:29.927Z"
---

# Unity Scriptableobjects

## Core Purpose
Guides agents through Unity's ScriptableObject system — creating data-driven assets, game data containers (item databases, stat definitions), event channels, and editor-friendly content authoring.

## Trigger Semantics
Load when an agent uses ScriptableObjects for data-driven design, creates reusable game data assets, or implements event channels.

## Capability Breakdown
Covers ScriptableObject base class, CreateAssetMenu attribute, data containers, event channel patterns, singleton ScriptableObjects for config, and cross-scene data persistence.

## Workflow Role
Design/Implementation — applied when separating game data from logic.

## Inputs / Outputs
Inputs: data schema for game content. Outputs: ScriptableObject assets, data containers, event channels.

## Tool and Permission Profile
Unity editor. Standard script editing.

## Compatibility Notes
Complements unity-csharp-scripting for class writing and unity-build-pipeline for asset serialization.

## Conflict Notes
No conflicts.

## Dedupe Notes
Engine-specific to Unity ScriptableObjects. No duplicate. Conceptually similar to godot-resources but Unity-specific.

## Evaluation Hooks
Verify the skill covers CreateAssetMenu and demonstrates practical patterns like event channels.

## Evidence and Confidence
medium — based on source metadata and Unity ScriptableObject knowledge. Full content review recommended.
