---
schema_version: 1
skill_id: skl_unreal-packaging-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-unreal-unreal-packaging-skill-md_ee767ddc
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:57:30.125Z"
---

# Unreal Packaging

## Core Purpose
Guides agents through packaging Unreal projects — project packaging settings, platform-specific configs, cook and build process, and content chunking.

## Trigger Semantics
Load when an agent packages an Unreal project for release, configures platform settings, or sets up content chunking.

## Capability Breakdown
Covers Project Packaging settings, platform-specific configurations, cook and build pipeline, content chunking, DLC/patch workflow, and commandlet automation.

## Workflow Role
Deployment — applied when packaging for distribution.

## Inputs / Outputs
Inputs: project files, platform targets. Outputs: platform builds, content chunks.

## Tool and Permission Profile
Unreal Editor, commandlets. Platform SDKs required.

## Compatibility Notes
Complements unreal-cpp-gameplay and unreal-blueprints for packaging-aware code.

## Conflict Notes
No conflicts.

## Dedupe Notes
Engine-specific to Unreal packaging. No duplicate.

## Evaluation Hooks
Verify the skill covers UE5 packaging and platform-specific signing/certification.

## Evidence and Confidence
medium — based on source metadata and Unreal packaging knowledge. Full content review recommended.
