---
schema_version: 1
skill_id: skl_r3-reactive-extensions-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-r3-reactive-extensions-skill-md_e3a25229
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.674Z"
---

# R3 Reactive Extensions

## Core Purpose
Guides agents through using the R3 reactive extensions library for .NET (the modern successor to Rx.NET/System.Reactive) — observable sequences, LINQ operators, scheduling, and reactive programming patterns for event streams and asynchronous data flows.

## Trigger Semantics
Load when an agent implements reactive event processing in .NET, chooses between Rx.NET/R3 and IAsyncEnumerable for streaming data, converts .NET events to reactive observables, or composes complex event processing pipelines.

## Capability Breakdown
Covers IObservable/T/Observer creation, Rx LINQ operators (Select, Where, Merge, CombineLatest, Switch), error handling patterns via OnErrorResumeNext/Catch/Retry, scheduling and concurrency control, hot vs cold observables, Subject types and their lifecycle, and integration with IAsyncEnumerable and async/await.

## Workflow Role
Implementation — applied when building event-driven or stream-processing components in .NET applications.

## Inputs / Outputs
Inputs: event sources, async data streams, UI events. Outputs: composed observable pipelines, reactive event processing code.

## Tool and Permission Profile
Standard code editing. References R3 NuGet packages.

## Compatibility Notes
Complements csharp-concurrency-patterns for async/await integration. Works with open-telemetry-dotnet for reactive pipeline monitoring.

## Conflict Notes
No direct conflicts. Complements rather than conflicts with csharp-concurrency-patterns — reactive and task-based patterns serve different use cases.

## Dedupe Notes
Distinct from csharp-concurrency-patterns which covers TPL/async. No duplicate in catalog.

## Evaluation Hooks
Verify that the skill uses R3-specific APIs (not legacy System.Reactive), that operator guidance matches R3 semantics, and that it covers scheduler configuration for testability.

## Evidence and Confidence
medium — based on source metadata and reactive programming knowledge. Full content review recommended.
