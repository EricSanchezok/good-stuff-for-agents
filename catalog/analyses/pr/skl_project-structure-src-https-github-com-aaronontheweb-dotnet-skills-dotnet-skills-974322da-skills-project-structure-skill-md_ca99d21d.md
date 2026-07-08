---
schema_version: 1
skill_id: skl_project-structure-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-project-structure-skill-md_ca99d21d
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.644Z"
---

# Project Structure

## Core Purpose
Provides guidance on organizing .NET solution structures — project grouping, folder conventions, namespace alignment, solution file management, multi-project architecture patterns, and standardizing project configurations for team consistency.

## Trigger Semantics
Load when an agent creates a new .NET solution, organizes multi-project structures, namespaces projects for discoverability, or sets up a mono-repo layout with shared build infrastructure.

## Capability Breakdown
Covers solution folder organization, project naming and namespace conventions, src/test directory separation, .NET project SDK selection (Microsoft.NET.Sdk.Web vs Sdk), Directory.Build.props for shared project properties, and common solution structures for layered/clean architecture.

## Workflow Role
Design — applied during project initialization to establish a consistent and maintainable project layout.

## Inputs / Outputs
Inputs: application architecture decisions (layered, clean, modular monolith). Outputs: solution file with organized projects, Directory.Build.props, project folders.

## Tool and Permission Profile
dotnet CLI (new, sln), standard file editing.

## Compatibility Notes
Complements csharp-coding-standards for conventions consistency and package-management for dependency organization. Foundation for any multi-project .NET solution.

## Conflict Notes
No conflicts. Project structure choices are organizational and additive.

## Dedupe Notes
The primary .NET project structure skill in the catalog. No duplicate.

## Evaluation Hooks
Verify that the skill covers both solution file (.sln) and modern solution filter (.slnx), that Directory.Build.props examples are correct, and that it addresses both small and large solution strategies.

## Evidence and Confidence
medium — based on source metadata and .NET project organization patterns. Full content review recommended.
