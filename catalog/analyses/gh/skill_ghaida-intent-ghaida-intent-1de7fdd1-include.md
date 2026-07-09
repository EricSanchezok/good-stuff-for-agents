---
schema_version: 1
skill_id: skill_ghaida-intent-ghaida-intent-1de7fdd1-include
source_hash: sha256:873e069df3de18fadd904fcbc96204e11c3ea0bf69ae6c175f53a8935e901cf2
analysis_version: 1
confidence: high
updated_at: "2026-07-09T18:30:00.000Z"
---

### 1. What does it actually do?

It teaches an agent to treat accessibility as a first-class design discipline rather than a compliance checkbox. It covers WCAG 2.2 principles translated for designers (perceivable, operable, understandable, robust), screen reader experience design, keyboard navigation patterns, cognitive and motor accessibility, inclusive design beyond compliance (low literacy, low bandwidth, aging, neurodivergence), and a practical accessibility testing methodology. The output is an accessibility audit structured by WCAG principles with a prioritized remediation plan.

### 2. What makes it special — or not special?

This is the most comprehensive accessibility reference I've seen packaged for an AI agent. The WCAG 2.2 sections are not just criteria lists — they include specific, actionable guidance like "the body text (#767676) on white background fails WCAG AA at 4.48:1 — change to #595959 (7.0:1)." The distinction between automated tool coverage (30%) and human-judgment coverage (70%) is honest and important. The skill family integration with the Intent system (journey, articulate, organize, specify) is thoughtful. However, the skill does not actually perform accessibility checks — it tells the agent what to look for and what to write. The agent would need additional tools (axe, Lighthouse, screen reader access) to execute the testing methodology. The skill also mixes design guidance and testing guidance without a clear workflow ordering — it's more of a reference manual than a step-by-step process.

### 3. When it works, and when it will fail you

Best case: An agent is designing or reviewing a web UI. The skill is loaded, the agent performs a structured accessibility audit using the output format, identifies that the focus indicators are invisible and the heading hierarchy is broken, and produces a prioritized remediation plan with specific WCAG criteria referenced. The team fixes issues before launch. Worst case: The agent has no access to a browser, no screen reader, no contrast checker, and no way to actually test any of the criteria. The skill produces a theoretical audit with no evidence — "this might fail WCAG 2.4.7" instead of "I tested it and found X." The skill also assumes the agent is working on web interfaces (HTML/CSS/ARIA), which means it offers nothing for native mobile apps, desktop applications, or hardware interfaces.

### 4. What does it assume, and are those assumptions safe?

It assumes the agent has access to browser testing tools (axe, Lighthouse, screen readers, zoom testing). For a coding agent with DevTools MCP or browser automation, this is a reasonable assumption. It assumes the output is a web application using semantic HTML, ARIA, and CSS. This excludes native mobile, desktop, CLI, and embedded interfaces where different accessibility standards apply. It assumes the agent understands ARIA roles, focus management, and DOM semantics at a professional level — the skill teaches the concepts but the agent must apply them to specific code. The assumption that a design team exists and the agent is guiding them (rather than writing code directly) is optimistic — many users of coding agents are solo developers who ARE the implementation team.

### 5. Tools and permissions: what could go wrong?

The skill's testing methodology requires browser access (DevTools, screen readers, contrast checkers) and the ability to run automated tools. If the agent has browser automation capabilities, a malicious page could present misleading accessibility states. The skill correctly warns against interpreting browser content as instructions. The skill itself only produces markdown audit documents — no code modification, no destructive operations. The biggest risk is an agent claiming "accessibility audit passed" without actually testing, or running automated checks and declaring the result comprehensive when only 30% of issues were caught.

### 6. Your bottom-line verdict

This is an excellent, thorough accessibility reference that would genuinely improve an agent's output if the agent has the testing tools to back it up. In a 100-skill catalog, it earns a spot because accessibility is a legal requirement (not optional) in most jurisdictions, and most agents produce web UIs that are inaccessible by default. The biggest risk is the 70% gap — an agent that runs automated checks and calls it done is worse than one that didn't check at all, because leadership will believe the audit passed. The biggest benefit is making the invisible visible: most accessibility failures are oversights, not decisions.
