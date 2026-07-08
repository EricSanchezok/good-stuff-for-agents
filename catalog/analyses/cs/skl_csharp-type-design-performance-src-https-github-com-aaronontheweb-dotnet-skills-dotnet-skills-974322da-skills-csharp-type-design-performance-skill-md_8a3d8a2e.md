---
schema_version: 1
skill_id: skl_csharp-type-design-performance-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-csharp-type-design-performance-skill-md_8a3d8a2e
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.870Z"
---

# Csharp Type Design Performance

## Core Purpose
Guides agents through performance-conscious C# type design — covering struct vs class decisions, memory layout, allocation avoidance, Span<T>/Memory<T> usage, ref struct patterns, and boxing prevention.

## Trigger Semantics
Load when an agent optimizes .NET code for performance, decides between class and struct, uses Span<T> for slice operations, implements reusable arrays via ArrayPool, or avoids allocations in hot paths.

## Capability Breakdown
Covers value type vs reference type tradeoffs, readonly struct and ref struct patterns, Span<T>/ReadOnlySpan<T> usage for zero-allocation slicing, ArrayPool<T> and MemoryPool<T> for buffer reuse, object pooling patterns, in/ref/out parameter optimization, and GC pressure analysis.

## Workflow Role
Implementation and Review — applied during performance-sensitive code authoring or profiling-driven optimization cycles.

## Inputs / Outputs
Inputs: baseline C# types and hot code paths. Outputs: optimized type design with reduced allocations, Span-based alternatives, and memory pool integration.

## Tool and Permission Profile
Standard code editing, profiling tools (dotnet-trace, BenchmarkDotNet) for validation.

## Compatibility Notes
Complements csharp-concurrency-patterns for thread-safe performant code and serialization for type serialization efficiency. Works with dotnet-metrics for performance measurement.

## Conflict Notes
No conflicts — performance optimization advice is additive, not contradictory.

## Dedupe Notes
Distinct from general performance optimization skills by its .NET/C# type-system focus. No duplicate in catalog.

## Evaluation Hooks
Verify type design guidance aligns with .NET performance best practices (Microsoft Performance Guidelines), that Span<T> usage follows safety constraints, and that allocation-avoidance patterns are correctly applied.

## Evidence and Confidence
medium — based on source metadata and .NET performance expertise. Full content review recommended.
