---
schema_version: 1
skill_id: skl_efcore-patterns-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-efcore-patterns-skill-md_62c161ac
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.961Z"
---

# Efcore Patterns

## Core Purpose
Guides agents through Entity Framework Core patterns — covering DbContext lifecycle, relationship mapping, query optimization, migrations, change tracking, and common application patterns like the Repository and Unit of Work.

## Trigger Semantics
Load when an agent designs data access with EF Core, configures entity relationships and mappings, writes LINQ queries, manages migrations in CI/CD, or selects between EF Core features for performance.

## Capability Breakdown
Covers DbContext lifetime registration (scoped vs transient), Fluent API vs data annotations, relationship configuration (one-to-many, many-to-many), query splitting (AsSplitQuery), eager/explicit/lazy loading, value conversions, owned entity types, migration management, and performance patterns (compiled queries, batch size).

## Workflow Role
Implementation — applied during data access layer design for .NET applications using EF Core as the ORM.

## Inputs / Outputs
Inputs: domain model classes, database schema requirements. Outputs: EF Core DbContext configuration, entity type configurations, migration strategy, query optimization recommendations.

## Tool and Permission Profile
Standard code editing, dotnet CLI (dotnet ef for migrations). Requires EF Core NuGet package references.

## Compatibility Notes
Complements database-performance for query tuning and csharp-type-design-performance for entity type design. Works with dotnet-unit-testing for testing data access patterns.

## Conflict Notes
No direct conflicts. May overlap with database-performance on query optimization — treat as complementary (this focuses on EF Core, that covers broader DB concerns).

## Dedupe Notes
The primary EF Core skill in the catalog. No duplicate. Related to but distinct from the broader database-performance skill.

## Evaluation Hooks
Verify that EF Core version targeting aligns with the project's .NET version, that migration patterns handle both development and production scenarios, and that performance guidance reflects current EF Core best practices.

## Evidence and Confidence
medium — based on source metadata and EF Core expertise. Full content review recommended.
