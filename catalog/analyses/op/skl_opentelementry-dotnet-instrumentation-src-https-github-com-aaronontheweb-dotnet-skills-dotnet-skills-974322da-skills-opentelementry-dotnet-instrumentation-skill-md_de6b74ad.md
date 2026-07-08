---
schema_version: 1
skill_id: skl_opentelementry-dotnet-instrumentation-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-opentelementry-dotnet-instrumentation-skill-md_de6b74ad
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.518Z"
---

# Opentelementry Dotnet Instrumentation

## Core Purpose
Teaches how to instrument .NET applications with OpenTelemetry — adding traces, metrics, and logs via the .NET OpenTelemetry SDK, configuring exporters and processors, and instrumenting ASP.NET Core, gRPC, EF Core, and HttpClient automatically.

## Trigger Semantics
Load when an agent adds distributed tracing to a .NET application, configures OpenTelemetry exporters (OTLP, Jaeger, Zipkin), instruments HTTP/gRPC traffic, or sets up custom activity sources and meters.

## Capability Breakdown
Covers OpenTelemetry .NET SDK setup (AddOpenTelemetry), instrumentation libraries for ASP.NET Core, HttpClient, EF Core, and gRPC, manual instrumentation via ActivitySource and Meter, exporter configuration (OTLP, Console, Prometheus), sampler selection, and resource attribute configuration.

## Workflow Role
Implementation — applied during observability setup for .NET services, often as part of the service defaults or startup configuration.

## Inputs / Outputs
Inputs: application entry point, service dependencies. Outputs: configured OpenTelemetry pipeline, custom instrumentations, exporter setup.

## Tool and Permission Profile
Standard code editing, dotnet CLI. References OpenTelemetry .NET NuGet packages.

## Compatibility Notes
Complements opentelemetry-collector for backend pipeline, aspire-service-defaults for Aspire OTEL integration, and dotnet-metrics for custom metrics. Foundation for .NET observability.

## Conflict Notes
May overlap with aspire-service-defaults on OTEL configuration — this skill is the more general .NET OTEL instrumentation, while that skill covers Aspire's opinionated defaults.

## Dedupe Notes
The primary .NET OpenTelemetry instrumentation skill. More detailed than general OTEL coverage in open-telemetry-dotnet, which may be broader or more collector-focused.

## Evaluation Hooks
Verify that the skill targets the latest OpenTelemetry .NET stable packages, that auto-instrumentation lists are correct for the application type, and that sampler guidance matches data volume requirements.

## Evidence and Confidence
medium — based on source metadata and OpenTelemetry .NET expertise. Full content review recommended.
