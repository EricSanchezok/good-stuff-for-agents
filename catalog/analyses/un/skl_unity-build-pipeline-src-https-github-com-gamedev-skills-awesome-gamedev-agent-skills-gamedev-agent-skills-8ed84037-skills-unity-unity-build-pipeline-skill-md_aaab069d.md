---
schema_version: 1
skill_id: skl_unity-build-pipeline-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-unity-unity-build-pipeline-skill-md_aaab069d
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:57:29.788Z"
---

# Unity Build Pipeline

## Core Purpose
Guides agents through Unity's build pipeline — build target configuration, player settings, Addressables integration, asset bundle management, and automated builds via command line or CI.

## Trigger Semantics
Load when an agent configures Unity build settings, sets up Addressables for content management, optimizes builds with asset bundles, or automates Unity builds in CI/CD.

## Capability Breakdown
Covers Build Settings per platform, Addressables groups and remote content delivery, Asset Bundle creation and loading, Sprite Atlas and texture packing, scripting define symbols per build target, and command-line build methods for CI integration.

## Workflow Role
Deployment — applied when packaging a Unity project for distribution.

## Inputs / Outputs
Inputs: Unity project files, platform targets. Outputs: platform builds, Addressables configuration, build scripts.

## Tool and Permission Profile
Unity editor (Build Settings), Unity CLI. Platform SDKs as needed.

## Compatibility Notes
Complements unity-scriptableobjects and unity-csharp-scripting for build-compatible project organization.

## Conflict Notes
No conflicts.

## Dedupe Notes
Engine-specific to Unity builds. No duplicate.

## Evaluation Hooks
Verify the skill covers Addressables and that build optimization guidance is platform-appropriate.

## Evidence and Confidence
medium — based on source metadata and Unity build knowledge. Full content review recommended.
