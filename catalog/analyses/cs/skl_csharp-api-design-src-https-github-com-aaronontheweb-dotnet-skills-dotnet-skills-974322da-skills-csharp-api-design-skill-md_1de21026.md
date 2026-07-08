---
schema_version: 1
skill_id: skl_csharp-api-design-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-csharp-api-design-skill-md_1de21026
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.780Z"
---

# Csharp Api Design

## Core Purpose
Guides agents through designing clean, discoverable, and idiomatic C# APIs — covering method signatures, parameter patterns, interface design, async patterns, exception handling, and XML documentation conventions.

## Trigger Semantics
Load when an agent designs public API surfaces for .NET libraries, reviews method signatures for usability, chooses between overloads and optional parameters, or designs fluent builder APIs.

## Capability Breakdown
Covers method signature design principles, parameter object refactoring, async API patterns (Task vs ValueTask), interface segregation, factory vs constructor patterns, XML doc conventions for IntelliSense, and backwards compatibility considerations.

## Workflow Role
Design and Review — applied during library and API surface design, ensuring .NET APIs follow framework design guidelines and community conventions.

## Inputs / Outputs
Inputs: class/method designs, interface contracts. Outputs: reviewed API surface with recommendations for naming, parameter ordering, return types, and documentation.

## Tool and Permission Profile
Standard code reading and editing tools.

## Compatibility Notes
Complements csharp-coding-standards for broader coding conventions and serialization for API serialization concerns. Pairs with dotnet-unit-testing to ensure API testability.

## Conflict Notes
No direct conflicts. May overlap with csharp-coding-standards on method naming conventions — treat as complementary depth vs breadth.

## Dedupe Notes
Related to but narrower in focus than csharp-coding-standards. No exact duplicate in catalog.

## Evaluation Hooks
Assess whether API design guidance follows .NET Framework Design Guidelines (Microsoft), verify async patterns use ValueTask appropriately, and check guidance on XML doc generation.

## Evidence and Confidence
medium — based on source metadata and .NET API design best practices. Full content review recommended.
