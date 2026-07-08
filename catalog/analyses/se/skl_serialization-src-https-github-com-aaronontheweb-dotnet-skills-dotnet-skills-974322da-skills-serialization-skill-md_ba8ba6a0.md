---
schema_version: 1
skill_id: skl_serialization-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-serialization-skill-md_ba8ba6a0
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.703Z"
---

# Serialization

## Core Purpose
Guides agents through .NET serialization — choosing between System.Text.Json, Newtonsoft.Json, and other serializers, configuring serialization behavior, handling polymorphism and circular references, and optimizing serialization for performance.

## Trigger Semantics
Load when an agent selects a serialization strategy for a .NET application, configures JSON serialization for ASP.NET Core APIs, handles custom serialization for complex types, or optimizes serialization performance for high-throughput scenarios.

## Capability Breakdown
Covers System.Text.Json configuration (JsonSerializerOptions, custom converters, source generators), Newtonsoft.Json migration patterns, polymorphism handling (discriminator, type discriminator), circular reference handling (ReferenceHandler.IgnoreCycles), binary serialization alternatives (MessagePack, Protocol Buffers), and serialization performance profiling.

## Workflow Role
Implementation — applied when defining how .NET objects cross application boundaries (HTTP, message queues, storage).

## Inputs / Outputs
Inputs: .NET types to serialize. Outputs: configured serialization, custom converters, optimized serializer settings.

## Tool and Permission Profile
Standard code editing. NuGet package references for serializers.

## Compatibility Notes
Complements csharp-api-design for API contract serialization and grpc-service-implementation for gRPC serialization. Works with akka-persistence for actor persistence serialization.

## Conflict Notes
No conflicts. Serializer selection is a project-level decision — guidance should be additive.

## Dedupe Notes
The primary .NET serialization skill in the catalog. No duplicate.

## Evaluation Hooks
Verify that source generator approach for System.Text.Json is covered, that the skill addresses AOT compatibility (NativeAOT, trimming), and that performance comparisons reflect real-world benchmarks.

## Evidence and Confidence
medium — based on source metadata and .NET serialization expertise. Full content review recommended.
