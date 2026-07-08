---
schema_version: 1
skill_id: skl_testcontainers-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-testcontainers-skill-md_c07708e9
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.822Z"
---

# Testcontainers

## Core Purpose
Guides agents through using Testcontainers for .NET integration testing — spinning up Docker containers (databases, message queues, browsers) in test fixtures, managing container lifecycles, and writing integration tests against real dependencies.

## Trigger Semantics
Load when an agent writes integration tests that depend on external services, sets up Docker-based test infrastructure for .NET tests, or replaces mocking with real dependency testing.

## Capability Breakdown
Covers Testcontainers .NET library setup, container lifecycle management (IAsyncLifetime), supported containers (PostgreSQL, SQL Server, Redis, Kafka, RabbitMQ), network configuration between containers, reuse mode for test speed, and integration with DbContext/schema migration on container startup.

## Workflow Role
Testing — applied during integration test authoring where real dependencies improve test fidelity.

## Inputs / Outputs
Inputs: dependency types required for testing. Outputs: testcontainers-based test fixtures, connection string configurations, container lifecycle hooks.

## Tool and Permission Profile
.NET test tools, Docker runtime. References Testcontainers NuGet packages.

## Compatibility Notes
Complements aspire-integration-testing for Aspire-specific container testing and dotnet-unit-testing for overall test strategy. Works with effcore-patterns for EF Core container testing.

## Conflict Notes
No conflicts. Complementary to aspire-integration-testing — Testcontainers is more general, Aspire testing is more opinionated.

## Dedupe Notes
Distinct from aspire-integration-testing which uses Aspire's built-in hosting rather than Testcontainers library. No duplicate.

## Evaluation Hooks
Verify that the skill covers the current Testcontainers API (v3+), that container cleanup and disposal are handled, and that reuse mode trade-offs are explained.

## Evidence and Confidence
medium — based on source metadata and Testcontainers for .NET expertise. Full content review recommended.
