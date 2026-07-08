---
schema_version: 1
skill_id: skl_csharp-concurrency-patterns-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-csharp-concurrency-patterns-skill-md_da6ff298
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.840Z"
---

# Csharp Concurrency Patterns

## Core Purpose
Guides agents through C# concurrency and parallelism patterns — covering async/await best practices, Task Parallel Library (TPL), Parallel LINQ (PLINQ), synchronization primitives, dataflow (TplDataflow), and concurrent collections.

## Trigger Semantics
Load when an agent implements concurrent operations in C#, selects synchronization strategies, designs async APIs, tunes parallel loops, or reviews thread safety in shared-memory scenarios.

## Capability Breakdown
Covers async/await fundamentals and customization (ValueTask, ConfigureAwait, AsyncLocal), Task creation and composition (WhenAll, WhenAny, ContinueWith), Parallel.For/ForEach tuning, ReaderWriterLock and SemaphoreSlim selection, ConcurrentDictionary and other concurrent collections, and TPL Dataflow blocks.

## Workflow Role
Implementation — applied when designing and implementing concurrent code paths, or reviewing existing code for thread safety.

## Inputs / Outputs
Inputs: sequential code that needs concurrent execution. Outputs: concurrent implementation with appropriate synchronization, async signatures, and parallel constructs.

## Tool and Permission Profile
Standard code editing tools.

## Compatibility Notes
Complements csharp-api-design for async API surface design and csharp-type-design-performance for thread-safe type design. Works with open-telemetry-dotnet for async diagnostic context propagation.

## Conflict Notes
No direct conflicts. The scope is complementary to r3-reactive-extensions which covers the R3 reactive programming model rather than core TPL patterns.

## Dedupe Notes
Distinct from r3-reactive-extensions — this covers foundational TPL/async patterns while R3 covers reactive/observable programming. Both may be relevant in the same project for different layers.

## Evaluation Hooks
Verify async guidance matches current .NET recommendations (ConfigureAwait(false) for library code), check Task vs ValueTask usage is appropriate, and assess guidance on synchronization context handling.

## Evidence and Confidence
medium — based on source metadata and .NET concurrency expertise. Full content review recommended.
