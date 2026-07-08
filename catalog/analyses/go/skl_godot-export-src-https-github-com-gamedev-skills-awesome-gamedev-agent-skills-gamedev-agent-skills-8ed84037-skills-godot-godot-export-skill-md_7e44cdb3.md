---
schema_version: 1
skill_id: skl_godot-export-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-export-skill-md_7e44cdb3
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.271Z"
---

# Godot Export

## Core Purpose
Guides agents through exporting Godot projects for distribution — export preset configuration, platform-specific settings (Windows, macOS, Linux, Android, iOS, Web), asset optimization, and build pipeline automation.

## Trigger Semantics
Load when an agent exports a Godot project for release, configures export presets for different platforms, optimizes assets for specific targets, or sets up automated Godot builds.

## Capability Breakdown
Covers export preset creation and configuration per platform, platform-specific settings (icons, orientation, permissions), asset optimization for target platforms (texture compression, audio format), export template management and version matching, command-line export for CI/CD, and troubleshooting common export issues.

## Workflow Role
Deployment — applied at the end of the development cycle when packaging the game for distribution.

## Inputs / Outputs
Inputs: project files, export platform targets. Outputs: export presets, platform-specific builds, optimized assets.

## Tool and Permission Profile
Godot editor (export panel), Godot CLI (headless export). Platform SDKs may be needed (Android SDK, Xcode).

## Compatibility Notes
Complements godot-project-structure for build-friendly project organization. Works with any completed Godot project.

## Conflict Notes
No conflicts. Export is the final step — independent of other Godot skills.

## Dedupe Notes
Engine-specific to Godot. No duplicate.

## Evaluation Hooks
Verify that the skill covers Godot 4's export system and that it addresses platform-specific certificate/signing requirements.

## Evidence and Confidence
medium — based on source metadata and Godot export knowledge. Full content review recommended.
