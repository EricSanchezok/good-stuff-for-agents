---
schema_version: 1
skill_id: skl_mcp-builder-src-https-github-com-microsoft-skills-d6d41f0c-423e-github-skills-mcp-builder-skill-md_d6d41f0c
source_hash: sha256:792635390fff9f4c0032b1f0e06db1d81affe678
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T01:24:00+08:00"
---

# MCP Server Development Guide (Microsoft)

This is a four-phase workflow guide for building MCP (Model Context Protocol) servers. It covers planning, implementation in three languages (TypeScript, Python, C#), testing, and creating evaluation question sets. The core of it is a detailed checklist masquerading as a tutorial — it will tell you what to do at each phase but won't hold your hand through why each decision matters. The most unusual thing about it is how deeply it ties into Microsoft's own MCP server ecosystem, spending considerable real estate on Azure MCP, Foundry MCP, and Fabric MCP before you've written a single line of code.

## Why it matters

This skill is a competent MCP server construction guide with a strong Microsoft flavor. If you strip away the Azure/Foundry sections and the C#/.NET guidance, what remains is a solid but unremarkable MCP-building workflow that any SDK README would give you: study the API, pick a language, implement tools with schemas, test with the Inspector, write evaluations. The real differentiation is the "check Microsoft's existing servers before building your own" philosophy and the deep linking into Azure's 48-service MCP server, Foundry remote endpoints, and Entra ID authentication patterns. If you're building in the Microsoft ecosystem, this is genuinely useful in a way generic guides are not. If you're building a Python MCP server for a third-party SaaS API, the Microsoft sections are dead weight you'll scroll past.

The evaluation phase is the most opinionated part — it mandates exactly 10 complex read-only questions with verifiable string-comparison answers, packaged as an XML file. This is a specific and defensible testing methodology, but it's presented as a requirement rather than a recommendation, which feels rigid for something that should be context-dependent.

## Where it helps, where it hurts

**Best case:** You're a developer on a Microsoft-oriented team, building an MCP server to wrap an internal Azure-hosted API. Before you start, this guide points you to Azure MCP Server to check if your service is already covered by one of its 48 pre-built integrations. When it turns out you do need a custom server, the C#/.NET patterns with `BaseCommand → GlobalCommand → SubscriptionCommand` hierarchy, Entra ID OBO flow auth, and Bicep testing templates give you a concrete path that a generic MCP guide would never provide. The evaluation framework also produces a test artifact you can hand to QA without additional translation.

**Worst case:** You're building a lightweight Python MCP server for a small internal tool and you load this skill expecting a concise tutorial. Instead, you get navigated through Microsoft server catalogs, C# command hierarchies, and Azure Functions deployment patterns that have nothing to do with your use case. The guide's structure makes it hard to skip irrelevant sections because the Microsoft content is woven throughout — not quarantined in a separable appendix. You burn tokens on Azure-specific transport decisions when all you needed was a `@mcp.tool()` decorator and five minutes with the Inspector.

## What it quietly assumes

- **You're building for or within the Microsoft ecosystem.** The guide frames Microsoft's existing MCP servers as the default starting point. This assumption holds for Azure-heavy teams but fails for roughly 70% of MCP server builders who are working with non-Microsoft stacks. When it fails, large sections of the guide become noise.

- **You already know how to design APIs.** The guide tells you to "review the service's API documentation" and "identify key endpoints" but provides no heuristics for choosing which endpoints deserve tools, how to handle rate limits, or how to map REST semantics to MCP tool semantics. It assumes API design taste you either have or don't.

- **MCP Inspector is sufficient for testing.** The testing section points to `npx @modelcontextprotocol/inspector` as the primary testing tool. This assumes your server runs locally via stdio. Remote streamable HTTP servers need a different testing approach that the guide doesn't address — a gap given how much it emphasizes remote transport for Azure.

- **Ten evaluation questions is the right number.** The guide mandates exactly 10 questions with no justification. For a server with 3 tools, 10 complex multi-call questions may be impossible to write without fabricating contrived scenarios. For a server with 50 tools, 10 questions may barely scratch the surface.

- **The reader has access to the full API documentation of the service being wrapped.** The guide says "review the service's API documentation" as if it's always available. For internal or poorly documented APIs, this phase collapses, and the guide offers no fallback strategy.

## What could go wrong

The guide advises implementing tools with annotations like `destructiveHint` and `readOnlyHint`. Mislabeling a tool is the primary risk: an agent relying on a `readOnlyHint: true` annotation for a tool that actually mutates state could trigger unintended writes, deletions, or configuration changes. The guide mentions annotations as a checklist item but provides no validation step to verify them — no "run this tool and confirm it didn't change anything" testing protocol.

Authentication is another vector. The guide references Entra ID, OBO flows, and Managed Identity for the Microsoft path, but for general custom servers it simply says "API client with authentication" as a bullet point. A developer following this guide could ship a server that hardcodes credentials or uses environment variables in an unsafe way, with no warning in the guide about token storage risks.

The user should be present during evaluation creation, since the guide expects you to manually verify answers to 10 complex questions. However, the actual server implementation phase is designed to be run autonomously — and that's where the annotation and auth risks live.

## Bottom line

Pick this if you're in the Microsoft ecosystem and need a guide that knows where Azure MCP Server ends and custom work begins. Skip it if you're building a straightforward Python or TypeScript MCP server for a non-Microsoft service — the SDK READMEs and a few blog posts will get you there faster with less cruft. The single biggest risk is following the tool-annotation guidance without independent verification; the single biggest benefit is the pre-flight check against Microsoft's existing server catalog, which genuinely prevents redundant work. If the catalog could only keep 100 skills, this one earns a spot only because it serves a specific, large constituency (Microsoft developers) that generic MCP guides underserve. A truly generic MCP builder guide would edge it out on breadth alone.

## Confidence: medium

The source is complete and well-structured, but I cannot assess the accuracy of the referenced external files (`node_mcp_server.md`, `python_mcp_server.md`, `microsoft_mcp_patterns.md`, `evaluation.md`) because they were not part of the fetched artifact. The skill's quality heavily depends on those references, and without them I can only evaluate the workflow skeleton, not the implementation depth it promises.
