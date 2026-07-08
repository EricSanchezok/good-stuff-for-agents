---
schema_version: 1
skill_id: skl_aspire-integration-testing-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-aspire-integration-testing-skill-md_2aaa7e8d
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.657Z"
---

# Aspire Integration Testing

## Core Purpose
Guides agents through integration testing with .NET Aspire — using Aspire's testing library (Aspire.Hosting.Testing) to write end-to-end tests against the full distributed application, including test resource lifecycle management.

## Trigger Semantics
Load when an agent writes integration tests for an Aspire distributed application, creates test fixtures that start Aspire resources (databases, caches, APIs), or validates end-to-end behavior across multiple services.

## Capability Breakdown
Covers DistributedApplication testing fixture setup, resource health wait strategies, HTTP and gRPC endpoint testing against launched resources, test isolation patterns, and container cleanup.

## Workflow Role
Testing — applied after Aspire application implementation, ensuring the full distributed app stack integrates correctly before deployment.

## Inputs / Outputs
Inputs: Aspire AppHost project, resource configuration. Outputs: integration test fixtures, resource health check assertions, end-to-end test cases.

## Tool and Permission Profile
.NET test tooling, Docker runtime (for containerized resources), Aspire.Hosting.Testing NuGet package.

## Compatibility Notes
Complements dotnet-unit-testing and unit-testing-xunit for unit-level tests. Works with aspire-dashboard for test observability and testcontainers for non-Aspire container management.

## Conflict Notes
No conflicts. Integration testing at this level does not duplicate unit-level testing skills.

## Dedupe Notes
Distinct from generic integration testing skills by its Aspire-specific fixture model. No duplicate in catalog.

## Evaluation Hooks
Verify that test fixtures correctly await resource readiness before asserting, that cleanup disposes resources properly, and that tests run without Docker permission issues.

## Evidence and Confidence
medium — based on source metadata and Aspire testing patterns. Full content review recommended.
