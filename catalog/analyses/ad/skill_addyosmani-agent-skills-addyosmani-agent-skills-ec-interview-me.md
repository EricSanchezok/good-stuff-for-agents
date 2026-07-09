---
schema_version: 1
skill_id: skill_addyosmani-agent-skills-addyosmani-agent-skills-ec-interview-me
source_hash: sha256:1cd14c73c8a5f4dab917322c967b39a4664e6ed35fb626ee623792791ab23fd5
analysis_version: 1
confidence: high
updated_at: "2026-07-09T18:30:00.000Z"
---

### 1. What does it actually do?

It stops an agent from jumping to implementation by running a structured one-question-at-a-time interview with the user until the agent can predict their reactions. The agent must state a hypothesis with a confidence number before each question, attach a guess to every question, and refuse to proceed until the user gives an explicit "yes" to a written restatement of intent. The deliverable is a confirmed statement of intent — not code, not a spec.

### 2. What makes it special — or not special?

This is genuinely distinctive. Most "requirement gathering" skills ask the agent to silently fill in gaps or present a batch of clarifying questions. This skill does the opposite: it enforces sequential, single-question interviews with attached guesses that the agent must be willing to be wrong about. The 95% confidence stop condition ("Can I predict the user's reaction to the next three questions?") is a concrete, checkable test that prevents premature convergence. The explicit list of what does NOT count as a yes ("whatever you think", "sounds good", "sure let's go") is rare and valuable. The only non-special aspect is that it demands a live user — trivially, any interactive requirement gathering requires one.

### 3. When it works, and when it will fail you

Best case: A user says "build me a dashboard for our metrics." The agent uses this skill, discovers after two questions that the user actually just wants a list of their experiments, and avoids building an entire dashboard that would have been wrong. The user saves days of work. Worst case: The user is impatient and just wants the agent to build something. The interview feels like friction. The user starts giving agreeing answers to end the torture, the agent falsely reaches 95% confidence, and the outcome is worse than if the agent had just built the wrong thing quickly so the user could course-correct. The skill explicitly warns about this ("polite user agreeing with your guess"), but the mitigation strategy (guessing in a direction you expect pushback) is subtle and easy for an agent to do poorly.

### 4. What does it assume, and are those assumptions safe?

It assumes a live, responsive, patient human user who can answer questions in real time. This is safe for interactive agent coding sessions but completely unsafe for CI/CD pipelines, scheduled runs, or autonomous loops — the skill correctly flags this as a hard constraint. It assumes the user can articulate their needs when probed, which fails when the user genuinely doesn't know what they want (the skill handles this partly with the "step back" escape hatch). It assumes the agent can accurately estimate its own confidence, which is a known AI failure mode — an overconfident agent will skip the interview entirely because it "already knows" what the user wants.

### 5. Tools and permissions: what could go wrong?

The skill has no tool or permission requirements beyond conversation — it's purely a communication protocol. The only risk is that the skill tells the agent to save intent to `docs/intent/[topic].md` if the user wants persistence, which requires file write permissions. This is low risk since the user confirms before saving. No external tools, no network access, no code execution. The absence of tool risk is a feature, not a bug — this is a thinking/communication skill.

### 6. Your bottom-line verdict

This is one of the highest-value skills in any agent catalog. The single most expensive mistake an agent makes is building the wrong thing, and this skill directly addresses that failure mode with concrete, enforceable steps. It earns a top-tier spot in a 100-skill catalog because it prevents waste before it happens, and it composes well downstream with spec-writing, planning, and implementation skills. The biggest risk is agent overconfidence bypassing the skill. The biggest benefit is catching misalignment before it costs anything.
