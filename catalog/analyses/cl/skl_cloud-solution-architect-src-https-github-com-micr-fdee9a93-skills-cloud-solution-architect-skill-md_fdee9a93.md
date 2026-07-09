---
schema_version: 1
skill_id: skl_cloud-solution-architect-src-https-github-com-micr-fdee9a93-skills-cloud-solution-architect-skill-md_fdee9a93
source_hash: sha256:7db4c335fff4c73300a5b17b8d847acc919e72b0
analysis_version: 1
confidence: high
updated_at: "2026-07-10T01:24:00+08:00"
---

# Cloud Solution Architect (Microsoft)

This skill is a compressed Azure Architecture Center reference card. It transforms an agent into a Cloud Solution Architect by loading it with 10 design principles, 6 architecture styles, 44 cloud design patterns mapped to Well-Architected Framework pillars, technology choice matrices, performance antipatterns, and a structured 7-step architecture review workflow. It is essentially a curated, terse remix of Microsoft's public Azure documentation — not original research, but a genuinely useful cheat sheet for systematic architectural decision-making on Azure.

## Why it matters

This skill is comprehensive in a way few cloud architecture prompts manage. Most architecture skills give you a handful of principles and call it done. This one gives you 44 design patterns, each mapped to specific WAF pillars (Reliability, Security, Cost Optimization, Operational Excellence, Performance Efficiency), plus technology selection frameworks for compute, storage, data stores, messaging, networking, AI, and containers. The architecture review workflow (requirements → style selection → technology choice → patterns → cross-cutting concerns → WAF validation → ADRs) is a genuine decision scaffold rather than a vague suggestion. The tradeoff matrix and mission-critical design section show awareness that architecture is about tradeoffs, not checklists.

That said, the skill has no original insight. Every table, every pattern name, every selection criterion comes directly from the Azure Architecture Center public documentation. It is a compressed, well-organized distillation — not a unique contribution. For pure Azure workloads, this is arguably the best-structured reference skill available. For anything involving AWS, GCP, or multi-cloud, it is the wrong tool entirely.

## Where it helps, where it hurts

**Best-case scenario**: A team is designing a greenfield Azure application and the agent is asked to recommend an architecture. The agent loads this skill and walks through the 7-step review workflow: it picks an architecture style based on domain complexity and team autonomy, selects Azure services using the technology choice decision framework, applies relevant design patterns (say, Circuit Breaker and Queue-Based Load Leveling for a high-throughput API), validates against all five WAF pillars, and produces an Architecture Decision Record. The structured workflow prevents the agent from jumping to technology recommendations without first establishing requirements and constraints.

**Worst-case / failure scenario**: Someone asks the agent to design a cloud architecture without specifying Azure, or specifically asks for an AWS/GCP solution. The skill is Azure-only at every level — the technology matrices, the architecture styles (which list Azure services), the identity guidance (Microsoft Entra ID), and the mission-critical patterns all assume Azure. The agent will either produce Azure-specific recommendations for the wrong platform, or the skill will be dead weight that the agent wastes context loading. Even in a pure Azure scenario, the skill references four external files (`design-patterns.md`, `technology-choices.md`, `best-practices.md`, `mission-critical.md`) that are not included in the source. If those references are unavailable, the agent has pattern names and one-line summaries but no implementation detail — enough to sound knowledgeable, not enough to be correct on specifics.

## What it quietly assumes

The biggest hidden assumption is **Azure exclusivity**. The skill is called "cloud-solution-architect" with no Azure qualifier in the title, but every technology choice, every service name, every identity reference is Azure-specific. This would mislead an agent into applying it to non-Azure cloud work.

It assumes **external reference files exist and are loadable**. The SKILL.md links to four reference files (`./references/design-patterns.md`, `./references/technology-choices.md`, `./references/best-practices.md`, `./references/mission-critical.md`) that are not part of this source artifact. Without them, the user gets a table of contents without the book. Approximately 60-70% of the skill's value depends on these references being available.

It assumes **the agent can reason from terse tables**. Many entries are one-sentence summaries — "Stop calling a failing service; fail fast to protect resources" for Circuit Breaker is correct but insufficient for someone who has never implemented one. The skill assumes the agent either knows these patterns already or can infer implementation from the summary. For an experienced cloud architect, this is fine. For a junior engineer role-playing as an architect, the table format provides false confidence.

It assumes **enterprise-scale deployment context**. Mission-critical design targeting 99.99%+ SLOs, Architecture Decision Records, game days, chaos engineering, postmortems — these are practices of organizations with dedicated platform teams and formal architectural governance. A startup building on Azure would find half the content overengineered for their needs.

It assumes **Microsoft Entra ID for identity**. There is no discussion of alternative identity providers. If the deployment uses Okta, Auth0, or any non-Microsoft IdP, the identity guidance is incomplete.

## What could go wrong

This is primarily a knowledge and reasoning skill — it does not request deployment permissions, cloud API access, or infrastructure modification tools. The direct tool risk is low.

The real risk is **bad architectural advice delivered with high confidence**. The terse table format can make an agent sound authoritative about patterns it does not actually understand. A Circuit Breaker implemented poorly because the agent only had a one-line summary is worse than no Circuit Breaker at all. The performance antipatterns section is particularly risky — an agent that identifies "Busy Database" and recommends moving logic to the application tier without understanding the specific query patterns, data volumes, or indexing situation will produce harmful recommendations.

A secondary risk: the skill's Azure exclusivity combined with its generic name means an agent may load it for non-Azure cloud work and silently produce Azure-specific recommendations that are wrong for the target platform. The SKILL.md frontmatter description says "following Azure Architecture Center best practices" but an agent deciding what to load based on skill name alone will miss this.

## Bottom line

This is the best-structured Azure architecture reference skill I have seen, but its value is almost entirely in curation and organization, not original insight. For an agent working on Azure architecture, this is a strong default choice — the structured workflow and WAF pillar mapping prevent the haphazard technology recommendations that plague most architecture conversations. For any non-Azure cloud work, it is a trap. The single biggest risk is the missing reference files that could leave the agent with pattern names and no substance. The single biggest benefit is the 7-step review workflow that forces systematic reasoning before technology selection. In a tight catalog of 100 skills, this earns a spot only if the catalog also has an AWS equivalent and a multi-cloud equivalent to cover the gaps — standing alone, its Azure exclusivity makes it too narrow for a general-purpose architecture slot.

## Confidence: high

I read the full source artifact. The skill is well-structured and its content is explicit enough that its capabilities, limitations, and risks are clear. Every judgment above can be traced to specific sections of the source.
