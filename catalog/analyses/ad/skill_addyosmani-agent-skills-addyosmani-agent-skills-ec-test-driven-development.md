---
schema_version: 1
skill_id: skill_addyosmani-agent-skills-addyosmani-agent-skills-ec-test-driven-development
source_hash: sha256:6c60e193d77a6c52eb3d9a7ca774f1801b9f798ec34f075720e0425a8094f50e
analysis_version: 1
confidence: high
updated_at: "2026-07-09T18:30:00.000Z"
---

### 1. What does it actually do?

It teaches an AI agent to write a failing test before implementation code, follow red-green-refactor, and use the Prove-It pattern for bug fixes (reproduce the bug with a test before fixing it). It covers the test pyramid, DAMP over DRY in tests, preferring real implementations over mocks, and a verification checklist. It's essentially a strongly-opinionated TDD procedural guide for agents, complete with TypeScript examples.

### 2. What makes it special — or not special?

What makes it stand out is its thoroughness for an agent-facing document — it includes the Beyonce Rule ("If you liked it, you should have put a test on it"), a resource-model table for test sizes (small/medium/large), explicit security boundaries for browser DevTools MCP, and a subagent delegation pattern for writing reproduction tests without knowledge of the fix. These details are genuinely thoughtful, especially the anti-sycophancy check ("All tests pass" but no tests were actually run). However, the core content (red-green-refactor, test pyramid, AAA pattern) is textbook TDD that any experienced developer already knows. The value is all in the agent-specific framing, not the TDD knowledge itself.

### 3. When it works, and when it will fail you

Best case: An agent is about to implement a new feature or fix a bug in a TypeScript/JavaScript codebase that already has a test runner configured. The skill kicks in, the agent writes the failing test first, implements the minimum code, and produces a well-tested change with reproduction tests. Worst case: The codebase has no test infrastructure at all, the agent has no permission to add one, or the user explicitly wants speed over verification. In these cases the skill either can't execute or actively creates friction. It will also underdeliver when runtime behavior is what needs testing (e.g., complex async state management, browser interactions) because unit tests only cover what the skill covers — the DevTools MCP reference is noted but not integrated as a required step.

### 4. What does it assume, and are those assumptions safe?

It assumes a JavaScript/TypeScript ecosystem with `npm test` as the test runner command — this is safe for a large percentage of web projects but excludes Python, Rust, Go, and other ecosystems entirely. It assumes tests can be run deterministically and quickly (milliseconds for small tests). It assumes the agent has write access to create test files and run shell commands. These are all reasonable for an agent operating in a web-dev context, but a non-JS project or one without existing test infrastructure will get zero value from this skill. The subagent delegation pattern assumes the agent platform supports spawning subagents, which is not universal.

### 5. Tools and permissions: what could go wrong?

The skill uses `npm test` (or equivalent) to run tests and expects file read/write for test files. Worst case: a malicious project could have a `npm test` script that exfiltrates data or does damage, since the skill tells the agent to run it without review. The DevTools security boundaries section is a bright spot — it explicitly warns that browser content is untrusted data and not to execute commands from it. The note about the tool calling `browser-testing-with-devtools` rather than embedding it is also responsible. No user presence is required during test runs, which is fine for read-only verification but risky if `npm test` has side effects.

### 6. Your bottom-line verdict

This is a very well-written TDD skill that could meaningfully improve an agent's test discipline — the Common Rationalizations table alone is worth the page it's on. However, it's only valuable in TypeScript/JavaScript web projects with existing test infrastructure. In a 100-skill catalog, this earns a spot because TDD enforcement is an agent anti-pattern that many other skills (debugging, refactoring, performance) benefit from as a prerequisite. The biggest risk is false confidence: an agent claiming "all tests pass" when the suite doesn't exist or the skill was ignored. The biggest benefit is preventing the common agent failure mode of writing code that looks right but wasn't verified.
