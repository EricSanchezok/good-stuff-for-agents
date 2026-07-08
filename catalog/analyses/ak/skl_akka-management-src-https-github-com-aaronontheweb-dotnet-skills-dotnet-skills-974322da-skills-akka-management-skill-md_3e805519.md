---
schema_version: 1
skill_id: skl_akka-management-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-akka-management-skill-md_3e805519
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.565Z"
---

# Akka Management

## Core Purpose
Covers Akka.Management — the cluster management and monitoring subsystem for Akka.NET, including HTTP API endpoints, cluster membership inspection, Akka.Management.Cluster.Bootstrap for dynamic cluster formation, and health check endpoints.

## Trigger Semantics
Load when an agent configures Akka cluster bootstrapping in cloud environments, enables HTTP management endpoints for actor systems, integrates Akka cluster with Kubernetes, or sets up health checks and readiness probes.

## Capability Breakdown
Covers Akka.Management HTTP API setup, Akka.Cluster.Bootstrap configuration for auto-joining, Kubernetes integration via Akka.Management.Cluster.Bootstrap.Discovery.KubernetesApi, health check endpoint registration (Akka.HealthCheck), and management endpoint security.

## Workflow Role
Implementation/Deployment — applied during operational setup of Akka.NET clusters, especially for containerized and Kubernetes deployments.

## Inputs / Outputs
Inputs: cluster configuration, Kubernetes service discovery settings, health check expectations. Outputs: configured management endpoints, cluster bootstrap strategy, health check registrations.

## Tool and Permission Profile
Standard file editing plus access to Kubernetes/K8s YAML if used. May require configuration of network ports and environment variables.

## Compatibility Notes
Complements akka-cluster-configuration for cluster formation and akka-aspire-configuration when running inside Aspire. Works with open-telemetry-dotnet for monitoring.

## Conflict Notes
Likely no conflicts. Cluster bootstrap configuration may overlap with akka-cluster-configuration — coordinate on seed node strategy.

## Dedupe Notes
Distinct from generic akka-cluster-configuration by its focus on the management HTTP API and cluster bootstrap provider. No duplicate in catalog.

## Evaluation Hooks
Verify that bootstrap configuration selects correct discovery mechanism for the target environment (Kubernetes, AWS ECS, etc.), that health checks reflect real actor system health, and that management endpoints are properly secured.

## Evidence and Confidence
medium — based on source metadata and Akka management ecosystem knowledge. Full content review recommended.
