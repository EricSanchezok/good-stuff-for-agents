---
schema_version: 1
skill_id: skl_microsoft-extensions-dependency-injection-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-microsoft-extensions-dependency-injection-skill-md_b9e25eb7
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.458Z"
---

# Microsoft Extensions Dependency Injection

## Core Purpose
Guides agents through the Microsoft.Extensions.DependencyInjection (DI) container — service registration, lifetime management, container configuration, and advanced DI patterns like decorator, factory, and keyed services.

## Trigger Semantics
Load when an agent configures DI in a .NET application, chooses service lifetimes (Singleton/Scoped/Transient), registers types with the IServiceCollection, implements factory patterns, or configures DI containers beyond the default.

## Capability Breakdown
Covers service registration methods (AddSingleton/Scoped/Transient), service lifetime selection and captive dependency detection, constructor injection resolution, registration conventions (Scanning), open generic registration, TryAdd pattern for library registrations, keyed services (.NET 8+), and decorator registration via third-party containers.

## Workflow Role
Implementation — applied during application composition, configuring how components are wired together.

## Inputs / Outputs
Inputs: service interfaces and implementations. Outputs: configured IServiceCollection, DI registration code, and container validation.

## Tool and Permission Profile
Standard code editing. References Microsoft.Extensions.DependencyInjection NuGet packages.

## Compatibility Notes
Complements microsoft-extensions-configuration for settings injection and dotnet-generic-host for hosting. Foundation for all DI-using .NET projects.

## Conflict Notes
No direct conflicts. Third-party container guidance complements rather than conflicts with default DI patterns.

## Dedupe Notes
The primary .NET DI skill in the catalog. No duplicate. More comprehensive than DI coverage in generic dotnet-generic-host or individual framework skills.

## Evaluation Hooks
Verify that lifetime guidance is correct for the application type (web vs background service vs desktop), that captive dependency detection is covered, and that validation patterns (ValidateOnStart) are included.

## Evidence and Confidence
medium — based on source metadata and .NET DI best practices. Full content review recommended.
