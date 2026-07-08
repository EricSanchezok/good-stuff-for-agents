---
schema_version: 1
skill_id: skl_snapshot-testing-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-snapshot-testing-skill-md_03599ec2
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.792Z"
---

# Snapshot Testing

## Core Purpose
Guides agents through snapshot testing in .NET using Verify (the popular .NET snapshot testing library) — setting up Verifier-based tests, managing snapshots, handling diff viewing, and integrating with serializer settings.

## Trigger Semantics
Load when an agent writes snapshot tests for .NET objects, uses the Verify library for approval testing, manages snapshot files across OS platforms, or handles snapshot updates during code changes.

## Capability Breakdown
Covers Verify test setup (Verifier.Verify), snapshot file management (.verified.txt/.received.txt), diff tool integration (Beyond Compare, VS Code), global defaults configuration (VerifySettings), serializer customization for snapshot content, OS-specific line ending handling, and auto-accept workflows for CI.

## Workflow Role
Testing — applied during test authoring to verify serialized output against approved snapshots.

## Inputs / Outputs
Inputs: objects to snapshot-verify. Outputs: test assertions via snapshot comparison, approved snapshot files.

## Tool and Permission Profile
Standard .NET test tools (dotnet test with xUnit/NUnit). References Verify NuGet packages.

## Compatibility Notes
Complements verify-email-snapshots for domain-specific email snapshot testing and unit-testing-xunit for overall test framework. Works with effcore-patterns for EF query snapshot testing.

## Conflict Notes
No conflicts. Snapshot testing is additive to any test strategy.

## Dedupe Notes
Unique in the catalog — no other skill covers Verify-based snapshot testing for .NET. Related to but distinct from generic testing skills.

## Evaluation Hooks
Verify that the skill covers the correct Verify version, that scrubbing patterns for machine-specific data are included, and that the diff workflow (accept/reject) is clearly explained.

## Evidence and Confidence
medium — based on source metadata and Verify library knowledge. Full content review recommended.
