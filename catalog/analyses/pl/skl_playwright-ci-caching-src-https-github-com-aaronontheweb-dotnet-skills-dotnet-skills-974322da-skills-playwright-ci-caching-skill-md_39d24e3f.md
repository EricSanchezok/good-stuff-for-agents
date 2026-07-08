---
schema_version: 1
skill_id: skl_playwright-ci-caching-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-playwright-ci-caching-skill-md_39d24e3f
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:49:51.612Z"
---

# Playwright Ci Caching

## Core Purpose
Focuses on optimizing Playwright test execution in CI/CD pipelines — caching Playwright browsers and dependencies, parallel test execution strategies, retry configuration, and integrating Playwright tests with CI providers like GitHub Actions.

## Trigger Semantics
Load when an agent configures Playwright tests in CI, optimizes CI test execution time, caches Playwright browser downloads across CI runs, or configures sharding and parallelization for Playwright.

## Capability Breakdown
Covers Playwright browser caching in CI (GitHub Actions cache action), CI providers' specific configuration (GitHub Actions, Azure DevOps), test sharding and parallel workers, retry and flake detection configuration, report generation and artifact upload, and dependencies installation optimization.

## Workflow Role
Deployment/CI — applied when setting up or optimizing the CI pipeline for a project with Playwright tests.

## Inputs / Outputs
Inputs: CI provider configuration, Playwright test settings. Outputs: optimized CI workflow YAML, browser cache configuration, test execution strategy.

## Tool and Permission Profile
CI configuration editing. May require CI admin access to configure caches and artifact storage.

## Compatibility Notes
Complements playwright-blazor for Blazor E2E testing and ci-cd-and-automation for overall CI strategy. Pairs with any Playwright-based testing approach.

## Conflict Notes
No conflicts. CI optimization is additive to whatever testing strategy is in place.

## Dedupe Notes
Unique in the catalog — no other skill focuses on Playwright CI optimization. Related to but distinct from general ci-cd-and-automation.

## Evaluation Hooks
Verify that browser caching covers the correct Playwright browsers and that the cache key includes the Playwright version, that sharding works with the CI provider's parallelism model, and that retry configuration avoids masking real failures.

## Evidence and Confidence
medium — based on source metadata and Playwright CI optimization patterns. Full content review recommended.
