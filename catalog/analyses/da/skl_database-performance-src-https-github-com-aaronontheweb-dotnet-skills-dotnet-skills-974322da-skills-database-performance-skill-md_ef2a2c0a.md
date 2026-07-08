---
schema_version: 1
skill_id: skl_database-performance-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-database-performance-skill-md_ef2a2c0a
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.899Z"
---

# Database Performance

## Core Purpose
Guides agents through .NET database performance optimization — covering ADO.NET and ORM query tuning, connection pooling, command batching, index navigation hints, read/write separation strategies, and database-level performance monitoring.

## Trigger Semantics
Load when an agent optimizes slow database queries in .NET applications, tunes Entity Framework Core or Dapper for performance, configures connection pooling, or implements query monitoring.

## Capability Breakdown
Covers ADO.NET/Dapper query optimization, EF Core query plan analysis and AsNoTracking/AsSplitQuery usage, connection string tuning (pool size, lifetime), command and batch size configuration, read replica routing, and database-level performance monitoring integration.

## Workflow Role
Implementation and Review — applied when diagnosing and fixing database performance issues or proactively tuning data access layers.

## Inputs / Outputs
Inputs: LINQ queries, raw SQL, ORM configuration. Outputs: optimized queries, connection pool settings, indexing recommendations, monitoring setup.

## Tool and Permission Profile
Standard code editing, SQL query tools. DB admin access may be needed for index/view changes.

## Compatibility Notes
Complements efcore-patterns for EF Core-specific optimization and dotnet-metrics for performance instrumentation. Works with open-telemetry-dotnet for query tracing.

## Conflict Notes
No direct conflicts. Database advice is additive across ORM layers.

## Dedupe Notes
Related to but broader than efcore-patterns which focuses specifically on EF Core. No duplicate in catalog.

## Evaluation Hooks
Verify that optimization recommendations respect database provider capabilities (SQL Server vs PostgreSQL vs SQLite), that N+1 query detection is covered, and that monitoring setup integrates with existing observability.

## Evidence and Confidence
medium — based on source metadata and .NET database performance patterns. Full content review recommended.
