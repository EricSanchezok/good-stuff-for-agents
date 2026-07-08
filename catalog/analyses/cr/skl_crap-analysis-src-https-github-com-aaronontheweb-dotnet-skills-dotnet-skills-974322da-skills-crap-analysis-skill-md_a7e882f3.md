---
schema_version: 1
skill_id: skl_crap-analysis-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-crap-analysis-skill-md_a7e882f3
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.748Z"
---

# Crap Analysis

## Core Purpose
Guides agents through running and interpreting CRAP (Change Risk Anti-Patterns) analysis on .NET code — a code metric that combines cyclomatic complexity with test coverage to identify high-risk methods that are both complex and undertested.

## Trigger Semantics
Load when an agent performs code quality analysis on .NET projects, evaluates refactoring candidates based on complexity and coverage, or integrates CRAP score computation into CI pipelines.

## Capability Breakdown
Covers CRAP score computation methodology, threshold interpretation (scores > 30 indicate high risk), tooling integration (dotnet tool for CRAP or related analyzers), and correlation of CRAP scores with refactoring priorities.

## Workflow Role
Review — applied during code quality assessment to identify methods that need refactoring or additional test coverage.

## Inputs / Outputs
Inputs: .NET project source code and test coverage data (OpenCover/Coverlet). Outputs: CRAP score report, prioritized refactoring candidates, coverage gap analysis.

## Tool and Permission Profile
Standard file reading, dotnet CLI, test coverage tools (Coverlet).

## Compatibility Notes
Complements csharp-coding-standards for code quality governance and dotnet-unit-testing for coverage analysis. Works alongside code-review-and-quality from the Addy Osmani skills set.

## Conflict Notes
No conflicts. CRAP analysis is a specific metric tool — does not duplicate broader code quality skills.

## Dedupe Notes
Unique in the catalog — no other skill covers CRAP analysis methodology. Distinct from generic code quality tools.

## Evaluation Hooks
Verify that CRAP score computation aligns with standard formula (complexity^2 * (1 - coverage/100)^3 + complexity), that tooling produces actionable output, and that thresholds are calibrated to project standards.

## Evidence and Confidence
medium — based on source metadata and software metrics knowledge. Full content review recommended.
