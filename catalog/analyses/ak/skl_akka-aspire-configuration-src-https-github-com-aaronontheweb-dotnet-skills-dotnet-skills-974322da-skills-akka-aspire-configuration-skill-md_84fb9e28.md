---
schema_version: 1
skill_id: skl_akka-aspire-configuration-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-akka-aspire-configuration-skill-md_84fb9e28
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.473Z"
---

# Akka Aspire Configuration

## Core Purpose
Guides agents through integrating Akka.NET with .NET Aspire configuration — wiring Akka actor systems into Aspire's distributed application model, connecting to Aspire-hosted infrastructure like databases, queues, and service discovery.

## Trigger Semantics
Load when an agent configures Akka.NET inside a .NET Aspire orchestrator project, connects Akka Persistence to Aspire-managed storage, or sets up Akka Cluster with Aspire service discovery.

## Capability Breakdown
Covers Aspire resource wiring for Akka.NET, Akka.Persistence journal/snapshot store connection strings via Aspire, Akka.Cluster bootstrap through Aspire service discovery, and health check registration for actor systems.

## Workflow Role
Implementation — used when standing up an Akka.NET backend within an Aspire distributed application, bridging actor system configuration with Aspire's declarative hosting model.

## Inputs / Outputs
Inputs: Aspire project configuration, Akka.NET HOCON config templates. Outputs: configured Akka actor system bootstrapped inside Aspire, connected to Aspire-managed infrastructure resources.

## Tool and Permission Profile
Standard file read/write and .NET CLI tools. Requires access to edit Aspire AppHost Program.cs and Akka.NET application config.

## Compatibility Notes
Complements aspire-hosting and akka-persistence. Works well with aspire-service-discovery for cluster formation and aspire-dashboard for observability.

## Conflict Notes
Unlikely to conflict — highly specific to the Aspire+Akka integration seam. Avoid overlap with generic aspirate-orchestration that doesn't cover Akka specifics.

## Dedupe Notes
Distinct from generic akka-cluster-configuration by its Aspire focus. No duplicate within the catalog.

## Evaluation Hooks
Verify that generated Aspire config correctly registers Akka persistence stores, that cluster seed nodes resolve via Aspire service discovery, and that health checks report correctly in the Aspire dashboard.

## Evidence and Confidence
medium — based on source record metadata and domain knowledge of Akka.NET and .NET Aspire integration patterns. Full content review recommended for production confidence.
