---
schema_version: 1
skill_id: skl_akka-hosting-actor-patterns-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-akka-hosting-actor-patterns-skill-md_66844335
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.535Z"
---

# Akka Hosting Actor Patterns

## Core Purpose
Focuses on the Akka.Hosting library — the modern approach for configuring and starting actor systems using the Generic Host pattern, including typed actors, dependency injection integration, and startup lifecycle hooks.

## Trigger Semantics
Load when an agent sets up an Akka.NET actor system using Akka.Hosting, registers actors with dependency injection, configures Akka using IHostBuilder, or migrates from legacy ActorSystem.Create() to the hosting model.

## Capability Breakdown
Covers AkkaConfigurationBuilder setup, actor registration via IServiceProvider, lifecycle hooks (WithActors, OnStart, OnStop), Akka.Hosting extension points, and integration with ASP.NET Core and Worker Service hosts.

## Workflow Role
Implementation — applied during the initial project bootstrapping phase when wiring Akka.NET into a .NET application using modern hosting patterns.

## Inputs / Outputs
Inputs: service collection configuration, Akka.NET HOCON overrides. Outputs: configured IHostedService actor system, registered typed actors with DI lifetimes.

## Tool and Permission Profile
Standard .NET CLI and file editing tools. May reference NuGet package versions for Akka.Hosting dependencies.

## Compatibility Notes
Complements microsoft-extensions-dependency-injection and dotnet-generic-host patterns. Works with akka-persistence and akka-cluster-configuration for full-stack Akka hosting.

## Conflict Notes
Potential overlap with akka-best-practices — this skill is narrower in scope, focused specifically on the Akka.Hosting API surface.

## Dedupe Notes
Related to but narrower than akka-best-practices. No direct duplicate in the catalog.

## Evaluation Hooks
Verify that generated Akka.Hosting setup compiles against current package versions, that actor registrations respect DI lifetimes correctly, and that disposal patterns are correct.

## Evidence and Confidence
medium — based on source metadata and familiarity with Akka.NET hosting APIs. Full content review recommended.
