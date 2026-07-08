---
schema_version: 1
skill_id: skl_marketplace-publishing-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-marketplace-publishing-skill-md_40b2207f
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.395Z"
---

# Marketplace Publishing

## Core Purpose
Guides agents through publishing .NET projects to Microsoft Visual Studio Marketplace or NuGet.org — covering package creation, extension packaging, versioning, release pipelines, and marketplace metadata configuration.

## Trigger Semantics
Load when an agent prepares a .NET library or VS extension for public release, packages a NuGet package or VSIX extension, configures .nuspec or .csproj package metadata, or sets up NuGet.org/VS Marketplace CI publishing.

## Capability Breakdown
Covers NuGet package creation (dotnet pack), .nuspec metadata, semantic versioning strategy, VSIX packaging for VS extensions, NuGet.org API key and push configuration, symbol server publishing (snupkg), and release pipeline automation for GitHub Actions.

## Workflow Role
Deployment — applied at the end of the development cycle when releasing .NET packages and extensions.

## Inputs / Outputs
Inputs: .NET project files, version numbers. Outputs: NuGet packages (.nupkg), VSIX files, NuGet.org publisher config, CI/CD release pipeline.

## Tool and Permission Profile
dotnet CLI, NuGet CLI, vsix packaging tools. Requires NuGet.org API key or VS Marketplace publisher credentials.

## Compatibility Notes
Complements ci-cd-and-automation for release automation and package-management for dependency strategy. Works with any publishable .NET project.

## Conflict Notes
No conflicts. Publishing is a standalone deployment activity.

## Dedupe Notes
Unique in the catalog — no other skill covers .NET marketplace publishing. Related to but distinct from general ci-cd-and-automation.

## Evaluation Hooks
Verify that the skill covers NuGet package signing, that .nuspec fields match marketplace requirements, and that it addresses common publishing errors (API key, version conflicts).

## Evidence and Confidence
medium — based on source metadata and NuGet/VS publishing knowledge. Full content review recommended.
