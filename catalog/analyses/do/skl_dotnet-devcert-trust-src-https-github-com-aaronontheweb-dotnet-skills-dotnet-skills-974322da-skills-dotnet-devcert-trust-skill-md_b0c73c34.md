---
schema_version: 1
skill_id: skl_dotnet-devcert-trust-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-dotnet-devcert-trust-skill-md_b0c73c34
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.930Z"
---

# Dotnet Devcert Trust

## Core Purpose
Guides agents through managing .NET development certificates — installation, trust configuration, HTTPS redirection, certificate renewal, and troubleshooting certificate-related issues in local development environments.

## Trigger Semantics
Load when an agent encounters SSL/HTTPS errors in .NET development, sets up HTTPS for a new .NET project, configures dotnet dev-certs trust for the OS certificate store, or troubleshoots certificate expiration.

## Capability Breakdown
Covers dotnet dev-certs CLI commands (https, check, trust, clean), OS-level trust configuration (macOS Keychain, Windows cert store, Linux openssl), ASP.NET Core Kestrel HTTPS binding, and troubleshooting common cert errors (ERR_CERT_AUTHORITY_INVALID, certificate expired).

## Workflow Role
Setup — applied during development environment initialization when HTTPS is required for local .NET development.

## Inputs / Outputs
Inputs: development environment OS info, HTTPS error description. Outputs: trusted development certificate, working HTTPS configuration, troubleshooting steps.

## Tool and Permission Profile
dotnet CLI (dev-certs command), OS-level certificate management tools (security, certlm.msc). May require sudo/admin for trust installation.

## Compatibility Notes
Complements local-tools and project-structure for development environment setup. Works with any .NET project that requires HTTPS.

## Conflict Notes
No known conflicts — development certificate management is an independent concern.

## Dedupe Notes
Unique in the catalog — no other skill covers .NET development certificate management.

## Evaluation Hooks
Verify that trust commands match the target OS, that HTTPS works after configuration (browser and curl), and that the skill covers common edge cases (multiple .NET SDK versions, corporate certificate stores).

## Evidence and Confidence
medium — based on source metadata and .NET dev cert conventions. Full content review recommended.
