---
schema_version: 1
skill_id: skl_akka-best-practices-src-https-github-com-aaronontheweb-dotnet-skills-dotnet-skills-974322da-skills-akka-best-practices-skill-md_189286bc
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:48:06.504Z"
---

# Akka Best Practices

## Core Purpose
Provides guidance on idiomatic Akka.NET usage — actor lifecycle management, message contract design, supervision strategies, ask/tell patterns, and common anti-patterns to avoid in actor-based systems.

## Trigger Semantics
Load when an agent designs new Akka.NET actor hierarchies, reviews existing actor code for anti-patterns, sets up supervision strategies, or decides between ask vs tell for inter-actor communication.

## Capability Breakdown
Covers actor hierarchy design, lifecycle hooks (PreStart, PostStop), supervision directive selection, Stash and Become for state machines, DeadLetters monitoring, and performance considerations for actor messaging.

## Workflow Role
Implementation and Review — applied during actor system design and code review to ensure Akka.NET patterns follow community-established best practices.

## Inputs / Outputs
Inputs: actor class definitions, message types, supervision configurations. Outputs: reviewed/recommended actor patterns, supervisor strategy selections, identified anti-patterns.

## Tool and Permission Profile
Standard code reading and writing tools. No elevated permissions required.

## Compatibility Notes
Complements akka-hosting-actor-patterns for actor lifecycle guidance and akka-testing-patterns for testability. Works alongside akka-persistence for persistent actor best practices.

## Conflict Notes
No direct conflicts. May duplicate advice already encoded in specific Akka skill files — check against akka-hosting-actor-patterns for redundancy.

## Dedupe Notes
Potentially overlaps with akka-hosting-actor-patterns; this is the general-purpose best-practices skill while the latter focuses on the Akka.Hosting library pattern.

## Evaluation Hooks
Assess whether recommendations match current Akka.NET community guidance (v1.5+), check for outdated advice on old APIs, and verify that anti-pattern detection covers common pitfalls like blocking inside actors.

## Evidence and Confidence
medium — based on source metadata and Akka.NET ecosystem knowledge. Content review recommended to verify alignment with latest library versions.
