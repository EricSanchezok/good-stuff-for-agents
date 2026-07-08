---
schema_version: 1
skill_id: skl_save-systems-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-disciplines-save-systems-skill-md_6658f024
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:53:22.574Z"
---

# Save Systems

## Core Purpose
Guides agents through implementing game save/load systems — save data serialization, auto-save and checkpoint strategies, save file management, cross-platform save handling, and corruption-resistant save design.

## Trigger Semantics
Load when an agent implements save/load functionality in a game, designs save data structures, manages multiple save slots, implements checkpoint or auto-save logic, or handles save data migration across game versions.

## Capability Breakdown
Covers save data serialization strategies (JSON, binary, protocol buffers), save file management (multiple slots, metadata), checkpoint vs auto-save patterns, corruption protection (atomic writes, checksums, backups), cross-platform save handling (Steam Cloud, iCloud, platform APIs), and save data versioning and migration.

## Workflow Role
Implementation — applied during game development when creating the persistent data storage for player progress.

## Inputs / Outputs
Inputs: game state schema, save trigger points (checkpoints, save rooms). Outputs: save system implementation, serialization code, save file management logic.

## Tool and Permission Profile
Standard code editing, platform-specific save APIs.

## Compatibility Notes
Complements godot-resources for engine-specific implementation. Works with any game genre that needs persistence.

## Conflict Notes
No conflicts. Save systems are independent of other gameplay systems.

## Dedupe Notes
Distinct from engine-specific save skills by its general-purpose save system design focus. No duplicate.

## Evaluation Hooks
Verify that the skill covers corruption prevention (atomic writes, checksums) and that save migration from old formats works.

## Evidence and Confidence
medium — based on source metadata and game save system knowledge. Full content review recommended.
