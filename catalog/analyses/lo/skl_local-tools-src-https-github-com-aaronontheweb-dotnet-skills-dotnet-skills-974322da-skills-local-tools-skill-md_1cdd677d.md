---
schema_version: 1
skill_id: skl_local-tools-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-local-tools-skill-md_1cdd677d
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.363Z"
---

# Local Tools

## Core Purpose
Guides agents through .NET local tools — installing, managing, and running tools via dotnet tool manifests, version pinning per project, and sharing tool configurations across teams through source control.

## Trigger Semantics
Load when an agent sets up a .NET project with project-scoped CLI tools, installs/updates dotnet-local tools, creates a dotnet-tools.json manifest, or configures tool version consistency across CI and dev environments.

## Capability Breakdown
Covers dotnet tool manifest creation (dotnet new tool-manifest), local tool installation and restoration, tool version pinning, CI restoration (dotnet tool restore), scoped vs global tool selection, and troubleshooting common tool resolution issues.

## Workflow Role
Setup — applied during project initialization to establish consistent tooling across team and CI environments.

## Inputs / Outputs
Inputs: tool requirements (name, version, commands). Outputs: dotnet-tools.json manifest, restored local tools, CI tool restore step.

## Tool and Permission Profile
dotnet CLI (tool commands). No elevated permissions.

## Compatibility Notes
Complements project-structure for overall project scaffolding. Pairs with package-management for complementary NuGet package management.

## Conflict Notes
No conflicts. Tool management is an independent concern.

## Dedupe Notes
Unique in the catalog — no other skill covers .NET local tools specifically.

## Evaluation Hooks
Verify that the manifest uses correct schema, that CI restores tools correctly, and that tool version resolution works across different .NET SDK versions.

## Evidence and Confidence
medium — based on source metadata and .NET tool conventions. Full content review recommended.
