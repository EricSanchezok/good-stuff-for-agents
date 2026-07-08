---
schema_version: 1
skill_id: skl_mjml-email-templates-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-mjml-email-templates-skill-md_76387b44
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.488Z"
---

# Mjml Email Templates

## Core Purpose
Guides agents through creating responsive HTML email templates using MJML — covering MJML component syntax, responsive email layout patterns, template integration with .NET applications, and email rendering/testing workflows.

## Trigger Semantics
Load when an agent designs email templates for a .NET application, converts MJML to HTML for transactional emails, integrates MJML rendering into ASP.NET Core pipelines, or validates email template rendering across email clients.

## Capability Breakdown
Covers MJML syntax and component library (mj-section, mj-column, mj-button, mj-image), responsive email design principles, MJML-to-HTML compilation (CLI or .NET libraries), template partials and includes, email client compatibility considerations, and integration with email-sending .NET libraries (FluentEmail, MailKit).

## Workflow Role
Implementation — applied during email template design and integration in .NET applications that send transactional or marketing emails.

## Inputs / Outputs
Inputs: email content structure and design requirements. Outputs: MJML template files, compiled HTML email output, .NET email template rendering integration.

## Tool and Permission Profile
Standard file editing, MJML CLI or .NET MJML library (MimeKit, FluentEmail).

## Compatibility Notes
Complements verify-email-snapshots and aspire-mailpit-integration for email testing. Works with any email-sending .NET library.

## Conflict Notes
No conflicts. Email template design is an independent concern from email delivery and testing.

## Dedupe Notes
Unique in the catalog — no other skill covers MJML email templates. Distinct from general HTML/CSS skills by its email-client-responsiveness focus.

## Evaluation Hooks
Verify that generated MJML templates render correctly across major email clients (Gmail, Outlook, Apple Mail), that responsive patterns work on mobile, and that .NET integration library is referenced with correct version.

## Evidence and Confidence
medium — based on source metadata and MJML/.NET email integration knowledge. Full content review recommended.
