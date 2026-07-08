---
schema_version: 1
skill_id: skl_slopwatch-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-slopwatch-skill-md_053326ed
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.762Z"
---

# Slopwatch

## Core Purpose
Guides agents through using Slopwatch — a .NET profiling tool for identifying and eliminating performance slop, including allocation tracking, CPU profiling, and diagnostic tool integration.

## Trigger Semantics
Load when an agent profiles .NET application performance, identifies allocation hotspots, uses dotnet-trace or PerfView for diagnostics, or searches for performance optimization opportunities in .NET code.

## Capability Breakdown
Covers Slopwatch tool usage for performance profiling, allocation and CPU hot path identification, integration with .NET diagnostics tooling (dotnet-trace, dotnet-counters, dotnet-dump), performance regression detection strategies, and profiling-based optimization workflow.

## Workflow Role
Review — applied during performance investigation cycles to identify and quantify optimization opportunities.

## Inputs / Outputs
Inputs: running .NET application. Outputs: performance profile data, identified hotspots, optimization recommendations.

## Tool and Permission Profile
Slopwatch/performance tooling (dotnet-trace, PerfView). May need elevated permissions for ETW/perf counters.

## Compatibility Notes
Complements csharp-type-design-performance for type-level fixes and database-performance for data access optimization. Works with dotnet-metrics for ongoing monitoring.

## Conflict Notes
No conflicts. Profiling tools are complementary to each other and to optimization skills.

## Dedupe Notes
Unique in the catalog — no other skill covers this specific .NET profiling tool. Related to but distinct from general performance optimization skills.

## Evaluation Hooks
Verify that the skill covers up-to-date tooling, that it addresses both allocation and CPU profiling, and that it provides actionable remediation patterns.

## Evidence and Confidence
medium — based on source metadata and .NET profiling expertise. Full content review recommended.
