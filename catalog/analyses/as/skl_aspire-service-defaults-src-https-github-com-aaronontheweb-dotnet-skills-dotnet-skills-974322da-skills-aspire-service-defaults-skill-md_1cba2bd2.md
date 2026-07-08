---
schema_version: 1
skill_id: skl_aspire-service-defaults-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-aspire-service-defaults-skill-md_1cba2bd2
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.719Z"
---

# Aspire Service Defaults

## Core Purpose
Guides agents through the Aspire service defaults project pattern — setting up shared configuration for telemetry (OpenTelemetry), health checks, service discovery, and resilience defaults that apply across all projects in an Aspire distributed application.

## Trigger Semantics
Load when an agent sets up an Aspire solution from scratch, creates the shared ServiceDefaults project, configures OpenTelemetry for all services, or adds health check endpoints and resilience pipelines to the application.

## Capability Breakdown
Covers ServiceDefaults project creation, AddServiceDefaults extension method wiring, OpenTelemetry exporter setup (OTLP, console), AddDefaultHealthChecks registration, resilience via AddDefaultResiliencePipeline, and service discovery client configuration.

## Workflow Role
Implementation — applied during initial project scaffolding to establish consistent cross-cutting concerns across all Aspire services.

## Inputs / Outputs
Inputs: Aspire solution structure. Outputs: configured ServiceDefaults project with telemetry, health checks, and resilience defaults wired into all consuming projects.

## Tool and Permission Profile
Standard .NET CLI (dotnet new, dotnet add reference).

## Compatibility Notes
Complements open-telemetry-dotnet for detailed OpenTelemetry configuration and aspire-service-discovery for service endpoint resolution. Foundation for any Aspire solution.

## Conflict Notes
No conflicts. This is the baseline infrastructure — other skills build on top of it.

## Dedupe Notes
Related to but distinct from open-telemetry-dotnet which covers general OTEL config. No duplicate in catalog.

## Evaluation Hooks
Verify that AddServiceDefaults compiles and configures all three concerns (telemetry, health, resilience), that health check endpoints respond, and that OpenTelemetry spans are exported correctly.

## Evidence and Confidence
medium — based on source metadata and Aspire service defaults best practices. Full content review recommended.
