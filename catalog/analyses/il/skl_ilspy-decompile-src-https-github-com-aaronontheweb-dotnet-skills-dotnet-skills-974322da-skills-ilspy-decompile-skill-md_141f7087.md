---
schema_version: 1
skill_id: skl_ilspy-decompile-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-ilspy-decompile-skill-md_141f7087
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.993Z"
---

# Ilspy Decompile

## Core Purpose
Guides agents through using ILSpy for decompiling .NET assemblies — reverse-engineering compiled DLLs into C# source, inspecting IL code, analyzing third-party libraries without source access, and solving debugging/dependency issues via decompilation.

## Trigger Semantics
Load when an agent needs to understand a third-party .NET assembly without source code, investigate runtime behavior of NuGet packages, decompile closed-source .NET libraries, or inspect generated code at the IL level.

## Capability Breakdown
Covers ILSpy CLI usage (ilspycmd), assembly decompilation to C# projects, IL bytecode inspection, resource extraction from assemblies, metadata and attribute inspection, and analyzing obfuscated or optimized assemblies.

## Workflow Role
Investigation — applied during debugging, reverse engineering, or dependency analysis when source code is unavailable.

## Inputs / Outputs
Inputs: .NET assemblies (DLL/EXE). Outputs: decompiled C# source code, IL bytecode listing, assembly metadata.

## Tool and Permission Profile
Standard file reading, ILSpy CLI tool (ilspycmd). No elevated permissions needed.

## Compatibility Notes
Complements local-tools for local development tooling setup. Useful alongside any debugging or dependency investigation workflow.

## Conflict Notes
No conflicts. Decompilation is a standalone investigation activity.

## Dedupe Notes
Unique in the catalog — no other skill covers .NET decompilation. Distinct from general debugging skills.

## Evaluation Hooks
Verify that the skill covers ILSpy output formats (project vs single-file), that it addresses ethical use of decompilation (licensed libraries), and that it works with the latest .NET assembly format.

## Evidence and Confidence
medium — based on source metadata and ILSpy capabilities. Full content review recommended.
