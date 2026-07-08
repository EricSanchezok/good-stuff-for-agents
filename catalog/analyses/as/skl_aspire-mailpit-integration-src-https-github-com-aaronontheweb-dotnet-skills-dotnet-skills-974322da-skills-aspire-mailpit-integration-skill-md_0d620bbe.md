---
schema_version: 1
skill_id: skl_aspire-mailpit-integration-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-aspire-mailpit-integration-skill-md_0d620bbe
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.688Z"
---

# Aspire Mailpit Integration

## Core Purpose
Covers integrating Mailpit (email testing tool) into a .NET Aspire application — configuring the Mailpit container resource, sending test emails from the application, and using the Mailpit UI/web API to verify email delivery during development.

## Trigger Semantics
Load when an agent configures Mailpit as an Aspire resource for email testing, sets up SMTP settings pointing to Mailpit in an Aspire app, or writes automated email verification logic against Mailpit's API.

## Capability Breakdown
Covers Mailpit resource registration in AppHost, SMTP configuration injection into dependent projects, Mailpit HTTP API consumption for test assertions, and email snapshot verification strategies.

## Workflow Role
Implementation/Testing — applied when email-sending functionality needs a test harness within the Aspire development environment.

## Inputs / Outputs
Inputs: SMTP configuration, email templates to test. Outputs: configured Mailpit resource in Aspire AppHost, email verification test fixtures.

## Tool and Permission Profile
Standard file editing, .NET CLI, Docker runtime for Mailpit container. May reference verify-email-snapshots for assertion patterns.

## Compatibility Notes
Complements verify-email-snapshots for email snapshot testing and aspire-hosting for resource orchestration. Works with playwright-blazor for UI-driven email flow testing.

## Conflict Notes
No known conflicts. Narrowly scoped to Mailpit within Aspire.

## Dedupe Notes
Highly specific — no other skill covers Mailpit integration. Not duplicated elsewhere in catalog.

## Evaluation Hooks
Verify that the Mailpit resource launches correctly from the AppHost, that SMTP configuration propagates to the consuming service, and that the Mailpit API returns expected message data.

## Evidence and Confidence
medium — based on source metadata and Mailpit/Aspire knowledge. Full content review recommended.
