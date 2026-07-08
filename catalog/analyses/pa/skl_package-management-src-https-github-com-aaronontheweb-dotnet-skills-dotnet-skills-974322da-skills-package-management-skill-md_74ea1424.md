---
schema_version: 1
skill_id: skl_package-management-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-package-management-skill-md_74ea1424
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.548Z"
---

# Package Management

## Core Purpose
Guides agents through .NET package management with NuGet — configuring NuGet sources, managing package versions, resolving dependency conflicts, locking dependencies, and best practices for package consumption in enterprise and open-source projects.

## Trigger Semantics
Load when an agent configures NuGet sources (private feeds, proxies), resolves version conflicts, sets up package version consistency (Central Package Management), migrates from packages.config to PackageReference, or manages transitive dependency versions.

## Capability Breakdown
Covers nuget.config configuration (sources, proxies, API keys), PackageReference vs packages.config, Central Package Management (Directory.Packages.props), floating version resolution (Version ranges), private feed setup (Azure Artifacts, GitHub Packages, MyGet), dotnet restore troubleshooting, and lock file (packages.lock.json) for deterministic builds.

## Workflow Role
Setup — applied during project initialization and ongoing dependency management across a .NET solution.

## Inputs / Outputs
Inputs: dependency requirements, NuGet source URLs, version constraints. Outputs: configured nuget.config, Directory.Packages.props, locked dependency versions.

## Tool and Permission Profile
dotnet CLI (restore, add package, nuget), file editing for nuget.config. May need feed credentials.

## Compatibility Notes
Complements local-tools for local tool manifests and marketplace-publishing for publishing. Foundation for any multi-project .NET solution.

## Conflict Notes
No conflicts. Package management is a foundational concern.

## Dedupe Notes
The primary .NET package management skill in the catalog. No duplicate.

## Evaluation Hooks
Verify that Central Package Management is covered with correct props file format, that the skill addresses both public and private feed scenarios, and that lock files are explained with CI implications.

## Evidence and Confidence
medium — based on source metadata and NuGet expertise. Full content review recommended.
