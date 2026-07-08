---
schema_version: 1
skill_id: skl_playwright-blazor-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-playwright-blazor-skill-md_cc741392
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.578Z"
---

# Playwright Blazor

## Core Purpose
Guides agents through end-to-end testing of Blazor applications with Playwright — testing Blazor interactive components, validating rendered component output, simulating user interactions, and testing Blazor Server and WebAssembly hosting models.

## Trigger Semantics
Load when an agent writes end-to-end tests for Blazor applications, validates Blazor component behavior in the browser, tests Blazor Server SignalR connectivity, or verifies Blazor WebAssembly page rendering.

## Capability Breakdown
Covers Playwright test setup for Blazor (BlazorServerAppFixture), Blazor component element selection (bUnit-like queries via Playwright), waiting for Blazor rendering cycles (circuit initialization for Server, loading for WASM), form interaction and validation testing, and JavaScript interop testing from Playwright.

## Workflow Role
Testing — applied during Blazor application testing to validate component behavior in real browser environments.

## Inputs / Outputs
Inputs: Blazor application project, test scenarios. Outputs: Playwright test fixtures for Blazor, E2E test cases.

## Tool and Permission Profile
.NET test tooling, Playwright CLI/NPM. Docker for Playwright browsers in CI.

## Compatibility Notes
Complements playwright-ci-caching for CI optimization and dotnet-unit-testing for unit-level Blazor testing. Works alongside unit-testing-xunit for test framework.

## Conflict Notes
No conflicts. E2E testing with Playwright is complementary to unit-level Blazor testing with bUnit.

## Dedupe Notes
Unique in the catalog — no other skill covers Blazor E2E testing with Playwright. Related to but distinct from general playwright-blazor testing.

## Evaluation Hooks
Verify that the skill covers both Blazor Server and WebAssembly hosting models, that test fixtures handle Blazor circuit/rendering lifecycle correctly, and that element selection patterns match actual Blazor component output.

## Evidence and Confidence
medium — based on source metadata and Playwright/Blazor testing knowledge. Full content review recommended.
