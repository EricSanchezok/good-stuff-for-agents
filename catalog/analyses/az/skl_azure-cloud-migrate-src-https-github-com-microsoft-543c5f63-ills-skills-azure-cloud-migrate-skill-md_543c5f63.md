---
schema_version: 1
skill_id: skl_azure-cloud-migrate-src-https-github-com-microsoft-543c5f63-ills-skills-azure-cloud-migrate-skill-md_543c5f63
source_hash: git_sha1:b1634cf629d9358eb70a95c089b309c304f9c42c
analysis_version: 1
confidence: medium
updated_at: "2026-07-22T03:59:01.735Z"
---

# Azure Cloud Migration — Generic Playbook

# Azure Cloud Migration

Walkthrough for moving on-premises into Azure via Microsoft-prescribed lifecycle: discovery/assessment with Azure Migrate, wave planning, execution (lift-and-shift, re-platform, refactor), landing zone config, cost estimation, post-migration validation. Operations playbook, not code asset.

## Why it matters — or doesn't
Every component is a direct reflection of Microsoft's Cloud Adoption Framework (CAF) and publicly available Azure documentation. Swap with Microsoft Learn modules, blog posts, or consulting templates. Value is convenience of having standard playbook as loadable skill — useful but not distinctive.

## Where it helps, where it hurts
**Best case:** Mid-sized enterprise with 50-500 VMs on aging hardware, Azure commitment made, network team can set up ExpressRoute/VPN, need structured migration checklist.

**Worst case:** Evaluating cloud vendors without Azure commitment, workloads not fitting standard patterns (physical servers, mainframes, air-gapped, zero-downtime), or leadership expects cost estimates without full discovery. Skill assumes Azure and Microsoft tooling are the only answers.

## What it quietly assumes
Azure commitment already made. Microsoft tooling available (Azure Migrate appliance, outbound connections to Azure). Workloads are virtualized. Hybrid network connectivity exists. Team understands Azure fundamentals (not an Azure 101 course). Most hold for intended audience but skill never states them.

## What could go wrong
Cost estimation failures — Azure pricing is famously complex, validated assumptions about reserved instances and hybrid benefit matter hugely. Orphaned workloads during cutover — half in Azure, half on-prem. Permission sprawl from overly permissive role assignments. User must be present — not unattended automation.

## Bottom line
Reasonable starting point if you don't have a migration playbook, but dozens of functionally identical alternatives exist. Too commodity for a tight 100-skill catalog. Biggest risk: cost estimation overconfidence.

## Confidence: medium