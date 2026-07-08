---
schema_version: 1
skill_id: skl_aspire-configuration-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-aspire-configuration-skill-md_1b9d7f5c
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.626Z"
---

# Aspire Configuration

## Core Purpose
Teaches how to configure .NET Aspire applications — managing app settings, connection strings, environment variables, and configuration cascading across the distributed application model.

## Trigger Semantics
Load when an agent configures an Aspire AppHost, sets resource-specific environment variables, manages connection strings for Aspire-hosted services, or works with Aspire's configuration schema.

## Capability Breakdown
Covers AppHost project configuration, resource-specific config injection, connection string management for databases/caches/queues, environment variable propagation to child processes, and launch profile configuration.

## Workflow Role
Implementation — used during the setup and wiring phase of .NET Aspire distributed applications.

## Inputs / Outputs
Inputs: Aspire project file structure, resource dependencies. Outputs: configured AppHost project, connection string mappings, environment variable configurations.

## Tool and Permission Profile
Standard file editing, .NET CLI (dotnet run for Aspire).

## Compatibility Notes
Complements aspire-orchestration, aspire-service-discovery, and aspire-hosting. Works with open-telemetry-dotnet for telemetry configuration.

## Conflict Notes
No conflicts expected. Config concerns may overlap with aspire-hosting — treat as complementary rather than overlapping.

## Dedupe Notes
Distinct from generic .NET configuration skills by its Aspire-specific focus. No duplicate in catalog.

## Evaluation Hooks
Verify that generated Aspire configuration loads and cascades correctly in the AppHost project, that connection strings reach the correct resources, and that environment variables propagate as expected.

## Evidence and Confidence
medium — based on source metadata and .NET Aspire configuration patterns. Full content review recommended.
