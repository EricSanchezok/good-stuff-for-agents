---
schema_version: 1
skill_id: skl_verify-email-snapshots-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-verify-email-snapshots-skill-md_71945f3f
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.852Z"
---

# Verify Email Snapshots

## Core Purpose
Guides agents through testing rendered email output in .NET using Verify-based snapshot testing — email template rendering verification, HTML email snapshot approval, and integration with email generation libraries.

## Trigger Semantics
Load when an agent writes tests for rendered email content in .NET, validates email template output (HTML, text) against approved snapshots, or automates email UI regression testing.

## Capability Breakdown
Covers Verify configuration for email content, email snapshot file management, scrubbing dynamic content (dates, links, tokens), HTML email rendered output verification, integration with FluentEmail or MJML-rendered output, and email-specific diff handling.

## Workflow Role
Testing — applied during email template development to ensure email rendering stays consistent and correct.

## Inputs / Outputs
Inputs: rendered email content (HTML, text). Outputs: verified email snapshots, test approval workflow.

## Tool and Permission Profile
Standard .NET test tools. References Verify NuGet packages.

## Compatibility Notes
Complements snapshot-testing for general snapshot capability and mjml-email-templates for email template authoring. Works with aspire-mailpit-integration for end-to-end email testing.

## Conflict Notes
No conflicts. Domain-specific extension of snapshot-testing.

## Dedupe Notes
Sits on top of snapshot-testing — more specialized. No duplicate in catalog.

## Evaluation Hooks
Verify that the skill handles email-specific dynamic content scrubbing (tracking pixels, unsubscribe links), that it covers both HTML and plain text email testing, and that snapshot management works across OS platforms.

## Evidence and Confidence
medium — based on source metadata and Verify library knowledge. Full content review recommended.
