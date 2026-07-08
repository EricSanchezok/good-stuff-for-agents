---
schema_version: 1
skill_id: skl_microsoft-extensions-configuration-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-microsoft-extensions-configuration-skill-md_a509ff93
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.427Z"
---

# Microsoft Extensions Configuration

## Core Purpose
Provides guidance on the Microsoft.Extensions.Configuration system — covering configuration providers (JSON, environment variables, command-line, key-per-file), hierarchical binding, options pattern, and custom configuration providers.

## Trigger Semantics
Load when an agent implements the options pattern in .NET, selects configuration providers for different environments, configures strong-typed settings binding, or builds custom configuration sources.

## Capability Breakdown
Covers IConfigurationBuilder setup, provider ordering and override behavior, JSON file configuration (appsettings.json), environment variable mapping (nested keys with : or __ separators), command-line and user-secrets configuration, IOptions/IOptionsSnapshot/IOptionsMonitor patterns, and custom configuration provider implementation.

## Workflow Role
Implementation — applied when setting up application configuration for any .NET project.

## Inputs / Outputs
Inputs: configuration schema, environment requirements. Outputs: configured IConfiguration root, settings classes, provider stack.

## Tool and Permission Profile
Standard code editing. References Microsoft.Extensions.Configuration NuGet packages.

## Compatibility Notes
Complements microsoft-extensions-dependency-injection for DI Integration and dotnet-generic-host for host building. Foundation for all .NET application configuration.

## Conflict Notes
No conflicts. Configuration is a foundational concern other skills build upon.

## Dedupe Notes
The primary .NET configuration skill in the catalog. No duplicate. More systematic than ad-hoc configuration coverage in generic .NET skills.

## Evaluation Hooks
Verify that configuration binding handles nested objects correctly, that environment variables override JSON correctly per .NET convention, and that IOptions validation triggers on app startup.

## Evidence and Confidence
medium — based on source metadata and .NET configuration expertise. Full content review recommended.
