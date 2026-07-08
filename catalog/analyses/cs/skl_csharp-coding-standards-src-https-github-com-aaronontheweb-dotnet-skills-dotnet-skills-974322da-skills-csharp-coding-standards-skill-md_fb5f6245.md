---
schema_version: 1
skill_id: skl_csharp-coding-standards-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-csharp-coding-standards-skill-md_fb5f6245
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.810Z"
---

# Csharp Coding Standards

## Core Purpose
Provides comprehensive C# coding standards guidance — naming conventions, formatting rules, code analysis (ROSlyn analyzers), EditorConfig configuration, and team-level convention enforcement.

## Trigger Semantics
Load when an agent establishes coding standards for a .NET project, configures .editorconfig and .roslynatorconfig, applies style analyzers, or reviews C# code for convention violations.

## Capability Breakdown
Covers naming conventions for types/members/variables, file layout and organization, .editorconfig configuration for style rules, Roslyn analyzer setup (Microsoft.CodeAnalysis and third-party), XML doc generation requirements, and rule severity configuration.

## Workflow Role
Design and Review — applied during project initialization to establish standards and during code review to enforce them.

## Inputs / Outputs
Inputs: project requirements for coding conventions. Outputs: .editorconfig file, analyzer package references, rule set customizations, and documented conventions.

## Tool and Permission Profile
Standard file editing, dotnet CLI for analyzer package references.

## Compatibility Notes
Complements csharp-api-design for API-specific conventions and csharp-type-design-performance for type-level guidance. Foundation for team-wide consistency.

## Conflict Notes
No conflicts — this is the foundational skill that sets conventions all other C# skills build on.

## Dedupe Notes
This is the primary coding standards skill for C# in the catalog. May overlap with csharp-api-design on API-specific rules but covers broader concerns.

## Evaluation Hooks
Verify that generated .editorconfig conforms to the .NET coding convention schema, that analyzer package versions are current, and that severity levels match the team's quality bar.

## Evidence and Confidence
medium — based on source metadata and .NET coding conventions. Full content review recommended.
