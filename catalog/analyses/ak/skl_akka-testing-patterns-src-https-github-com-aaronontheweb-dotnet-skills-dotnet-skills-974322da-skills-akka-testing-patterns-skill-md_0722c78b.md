---
schema_version: 1
skill_id: skl_akka-testing-patterns-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-akka-testing-patterns-skill-md_0722c78b
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.596Z"
---

# Akka Testing Patterns

## Core Purpose
Guides agents through testing Akka.NET actor systems — using Akka.TestKit, test actor probes, expectations, and integration testing strategies for actor-based applications.

## Trigger Semantics
Load when an agent writes unit tests for Akka.NET actors, validates actor message flows, tests supervision and failure scenarios, or sets up test fixtures for Akka systems.

## Capability Breakdown
Covers TestKit test actor ref setup, TestProbe for external message assertions, EventFilter for log testing, TestFSMRef for state machine testing, multi-JVM test setup for cluster tests, and ActorTestBase patterns.

## Workflow Role
Testing — applied during test authoring for Akka.NET actor systems, complementing both unit-testing-xunit and dotnet-unit-testing patterns.

## Inputs / Outputs
Inputs: actor classes and messages to test. Outputs: TestKit-based test fixtures, assertion strategies for actor message flows, test coverage for failure scenarios.

## Tool and Permission Profile
Standard .NET test tools (dotnet test, test SDK). References NuGet packages Akka.TestKit and Akka.TestKit.Xunit2.

## Compatibility Notes
Complements dotnet-unit-testing and unit-testing-xunit for overall .NET test strategy. Pairs with akka-best-practices for testable actor design.

## Conflict Notes
No conflicts with other testing skills — this is domain-specific to actor testing and does not duplicate general unit testing guidance.

## Dedupe Notes
Domain-specific to Akka.NET — not duplicated elsewhere in the catalog. Complemented by but distinct from general .NET testing skills.

## Evaluation Hooks
Verify that test patterns use the correct TestKit version for the target Akka version, that test probes handle async message delivery correctly, and that failure injection tests actually trigger expected supervision.

## Evidence and Confidence
medium — based on source metadata and Akka.TestKit expertise. Full content review recommended.
