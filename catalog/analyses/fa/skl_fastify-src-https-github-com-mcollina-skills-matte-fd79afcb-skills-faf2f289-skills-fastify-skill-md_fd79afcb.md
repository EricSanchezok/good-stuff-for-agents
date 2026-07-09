---
schema_version: 1
skill_id: skl_fastify-src-https-github-com-mcollina-skills-matte-fd79afcb-skills-faf2f289-skills-fastify-skill-md_fd79afcb
source_hash: sha256:439e684d678e2ed5fc1e7ec37ac5f332554c8800
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T01:24:18+08:00"
---

# Fastify Best Practices (mcollina)

This is not a self-contained Fastify skill. It is a curated table of contents — a reading-order index pointing to 19 separate `rules/*.md` files that cover specific Fastify topics from plugin architecture to production deployment. The SKILL.md itself contributes a 12-line "quick start" TypeScript server, three core principles, and scenario-based navigation paths. Almost all substantive knowledge lives in files you cannot evaluate by reading this artifact alone.

## Why it matters

The curation is genuinely useful. Rather than dumping 19 links and wishing you luck, it gives four scenario-based reading paths: "New to Fastify?" gets plugins → routes → schemas; "Adding authentication?" gets plugins → hooks → authentication; "Going to production?" gets logging → configuration → deployment. This is the kind of guidance that saves an agent from reading reference files in the wrong order or skipping prerequisites. It also signals the author's opinion about what matters most — schemas, encapsulation, and serialization get early emphasis, which aligns with Fastify's design philosophy.

But judged solely on what this SKILL.md contains (not the referenced files), it is thin. The "Core Principles" section is four one-liners so generic they could appear in any Fastify tutorial: "Encapsulation: Fastify's plugin system provides automatic encapsulation." The TypeScript quick start is 9 lines of boilerplate that any developer could generate from memory. If you cannot fetch the referenced rule files — or if they are stale, missing, or inconsistent with Fastify's current documentation — this skill collapses to a bookmark.

## Where it helps, where it hurts

**Best-case scenario**: An agent is building a greenfield Fastify backend in TypeScript and needs systematic, opinionated coverage of the full development lifecycle. The reading-order paths prevent the agent from jumping into authentication before understanding plugins, or attempting performance tuning before setting up JSON Schema validation. The index covers an unusually broad range — CORS, WebSockets, HTTP proxying, content-type parsing — so the agent can discover topics it might not have known to ask about. If all 19 rule files exist and are well-maintained, this is a solid curriculum.

**Worst-case scenario**: An agent fetches this SKILL.md, sees the impressive index of 19 topics, and proceeds to hallucinate the content of the referenced files because they are not available in context. The "rules/" paths are relative — they reference files in the same repository, but if the agent only ingested this file, it has nothing actionable beyond a 9-line server and three platitudes. Another failure mode: the agent is working with Fastify v4 and the rule files assume v5 (the SKILL.md mentions TypeScript "strip types," a v5 feature, but never states a minimum version). The agent applies v5 patterns to a v4 codebase and generates broken code.

## What it quietly assumes

- **Fastify v5+**: The TypeScript guidance mentions "strip types," introduced in Fastify v5. If your project is on Fastify v4, the TypeScript setup path is wrong. Nowhere does it state a version requirement.
- **The 19 rule files exist and are current**: This is the catastrophic assumption. If any referenced file is missing or outdated, the corresponding reading path silently fails. The skill provides no fallback to official Fastify documentation.
- **TypeScript-first**: The quick start is in TypeScript, not JavaScript. Teams using plain JavaScript get a reading path that still starts with a TypeScript example they must mentally translate.
- **No specific database**: The database integration reference exists but the SKILL.md reveals nothing about what database patterns, ORMs, or drivers are covered. An agent working with Prisma, Drizzle, Knex, or raw SQL has no signal about whether the guidance applies.
- **The agent understands Fastify fundamentals**: This skill is pitched at intermediate+ users. It says "Use this skill when you need to develop backend applications using Fastify" but then immediately dives into encapsulation and schema-first design. A genuinely new-to-Fastify developer reading only the SKILL.md would be lost.
- **mcollina's opinions are authoritative**: Matteo Collina is a Fastify core maintainer, which gives this skill weight. But the skill never states that explicitly, so an agent unfamiliar with the ecosystem won't know the provenance matters.

## What could go wrong

This is a knowledge/navigation skill with no executable tools and no server-side operations. The risks are all downstream from bad or outdated advice. The worst realistic outcome is an agent following the reading path, generating code based on stale or hallucinated rule content, and producing a Fastify application with broken TypeScript integration, incorrect plugin encapsulation, or insecure authentication patterns — code that passes type-checking but fails at runtime or exposes data.

The user does not need to be present for any tool operation, but the agent should verify it has access to the referenced rule files before trusting this index. If the rules are unavailable, this skill is worse than useless — it gives the illusion of coverage.

## Bottom line

This is a well-structured navigation index for Fastify development written by someone who clearly knows the framework deeply. But as a standalone catalog entry, it is structurally incomplete: its value depends entirely on external files that are not part of the evaluated artifact. In a tight catalog of 100 skills, this earns a spot only if the full rule tree ships with it and a version guard is added. The single biggest benefit is the scenario-based reading order; the single biggest risk is that an agent treats this 19-topic index as a sign of comprehensive coverage without verifying the referenced files exist and match the target Fastify version. If you can confirm the rule files are available and maintained, load it. If not, skip it and point the agent at the official Fastify documentation directly.

## Confidence: medium

The SKILL.md is fully readable and its structure is clear, but its real quality lives in 19 referenced files that were not fetched as part of this analysis. Judging this artifact in isolation is like reviewing a book by its table of contents — I can assess the organization and curation, but I cannot confirm whether the chapters deliver on the index's promises.
