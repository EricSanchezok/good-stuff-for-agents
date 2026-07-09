---
schema_version: 1
skill_id: skl_mcp-builder-src-https-github-com-anthropics-skills-b47e5045-lls-04f79b56-skills-mcp-builder-skill-md_b47e5045
source_hash: sha256:bd0e5aed0ef8691f77c4aa7b958e9f24a67fc295
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T02:13:08+08:00"
---

# MCP Builder

This is a structured, four-phase development guide for building MCP (Model Context Protocol) servers — the bridge components that let LLMs call external APIs. It covers research, implementation, testing, and evaluation, with opinionated stack recommendations (TypeScript + streamable HTTP) and a heavy emphasis on tool design philosophy over bare syntax.

## Why it matters

The real value here isn't the implementation boilerplate — most of that is delegated to separate language-specific reference files. What distinguishes this skill is Phase 1's design philosophy: the tradeoff between comprehensive API coverage and workflow tools, naming conventions for discoverability, context management through pagination and filtering, and actionable error messages. Most MCP tutorials leap straight to code. This one spends real time on *why* you'd structure tools a certain way, which is genuinely useful for someone who hasn't internalized how LLMs discover and use tools.

Phase 4 — the evaluation system — is the most distinctive piece. The skill requires you to create 10 complex, read-only, multi-step questions that test whether an LLM can actually accomplish real tasks with your server, then output them in a specific XML format. This turns MCP server building from "I wrote some tools" into "I verified an agent can use them competently." I haven't seen another MCP guide package evaluations as a required deliverable.

That said, this is a process guide, not a deep technical reference. The language-specific details are outsourced to separate files. If you've already built one MCP server, you'll skim most of it and find only the evaluation phase novel.

## Where it helps, where it hurts

**Best case**: You're building your first or second MCP server to wrap a well-documented REST API (GitHub, Slack, Jira, Stripe). You need more than syntax — you need to understand how tool design choices affect agent behavior. You follow all four phases sequentially, build clean Zod/Pydantic schemas, annotate tools properly, and end up with 10 evaluation questions that prove your server actually works for real agent tasks. The TypeScript-first recommendation genuinely helps because the SDK maturity is real and AI code generation of TypeScript is better in practice.

**Worst case**: You're wrapping a non-REST API — a WebSocket service, a gRPC backend, a GraphQL endpoint, or a local binary. The guide's assumptions about "review the API documentation" and "list endpoints to implement" break down immediately. Or you're targeting a Python-only deployment environment and the TypeScript preference is actively harmful to your architecture. Or you already know MCP and loaded this skill expecting advanced patterns — you'll get a process checklist and an evaluation format, nothing more.

## What it quietly assumes

- **TypeScript is the right default language.** The guide states this as a recommendation but treats it as near-mandatory — the Python path is secondary. This holds for about 60-70% of server builders but actively hurts teams with Python-only infrastructure.
- **Streamable HTTP with stateless JSON for remote servers.** This is a legitimate architectural preference, but the guide never acknowledges that some APIs need stateful sessions, streaming, or WebSocket connections. If your target API uses SSE or long-polling, you're on your own.
- **The service has well-structured API docs you can study.** The guide says "review the service's API documentation" as if that's always available. For internal services, poorly documented endpoints, or reverse-engineered APIs, the entire Phase 1 workflow collapses.
- **The MCP Inspector tool works reliably.** It's the recommended testing approach for both TypeScript and Python. If the inspector has bugs or doesn't support your transport, there's no fallback.
- **All evaluation questions are read-only and answers are stable over time.** This is baked into the XML evaluation format. For services where interesting questions inherently involve state changes or time-varying data, the evaluation methodology doesn't fit.

When these assumptions hold — and they will for the majority of public REST API wrappers — the skill is effective. When they break, the degradation is graceful rather than catastrophic (you can still extract the tool design philosophy), but you'll be filling substantial gaps yourself.

## What could go wrong

The skill itself is a guide, not executable code — it doesn't directly invoke tools. But following it leads to building and running an MCP server that *does*. The biggest risk is built right into the skill's own annotation system: the guide teaches you to mark tools with `destructiveHint: true`, but never provides concrete guidance on what safeguards to put around destructive tools. A server built following this guide could expose a `delete_all_records` tool that's correctly annotated but has no confirmation step, no dry-run mode, and no rate limiting. The annotation tells the agent "this is dangerous" but the agent may call it anyway if the user's request implies it.

The testing recommendation (MCP Inspector) is another risk vector: `npx @modelcontextprotocol/inspector` pulls a live npm package with whatever latest version exists. No version pinning is suggested. A broken inspector release could derail someone's development workflow.

User presence is irrelevant — this is a development-time skill, not a runtime one.

## Bottom line

Pick this skill when you're building your first or second MCP server for a well-documented REST API and need a structured workflow. Skip it if you've built MCP servers before or are targeting an unusual protocol — the design philosophy is worth reading once but the implementation content is thin. The evaluation system is the single feature that sets it apart from other MCP guides. In a tight 100-skill catalog, this only earns a spot if developer workflow skills are in scope alongside end-user/integration skills; if the catalog focuses on runtime agent capabilities, this belongs in a separate developer-docs tier.

## Confidence: medium

I read the full SKILL.md source, but the skill delegates substantial content to referenced files (python_mcp_server.md, node_mcp_server.md, evaluation.md, mcp_best_practices.md) that I could not read. My judgments about design philosophy and the evaluation system are grounded in the main document; my assessment of how thin or deep the implementation guidance is could shift if the reference files are unusually rich or unusually sparse.
