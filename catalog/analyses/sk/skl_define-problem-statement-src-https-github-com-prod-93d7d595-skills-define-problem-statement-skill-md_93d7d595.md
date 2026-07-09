---
schema_version: 1
skill_id: skl_define-problem-statement-src-https-github-com-prod-93d7d595-skills-define-problem-statement-skill-md_93d7d595
source_hash: sha256:a0ab828277b1d311f117ba41efaf6df750da7ce5
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T03:35:00+08:00"
---

# define-problem-statement

A structured prompt for producing problem framing documents. It walks the agent through six steps: identify the user segment with specificity, explore pain points using evidence from research or support data, connect the problem to business impact, define success metrics with baselines and targets, surface constraints, and capture open questions. A quality checklist enforces specificity, quantification, and separation of problem from solution. The output follows an external template with sections for Problem Summary, User Impact, Business Context, Success Criteria, Constraints, and Open Questions.

## Why it matters

This skill occupies the most foundational position in the pm-skills workflow chain — it is the entry point that every other skill in the suite either builds on or routes back to. The "when NOT to use" section is genuinely instructive: if the problem is already agreed, go to `deliver-prd`; if you want to compare solutions, go to `develop-solution-brief`; if you are capturing customer motivation rather than a business problem, go to `define-jtbd-canvas`; if the "problem" is actually an unverified assumption, frame it as a `define-hypothesis` first. That routing alone reveals the author's understanding of the product workflow more than the six-step process does. The checklist item "Problem describes the 'what' without prescribing the 'how'" is the sharpest quality gate here — it catches the most pervasive failure mode in problem framing, where teams smuggle their preferred solution into the problem description.

Beyond the routing and that one checklist item, the skill is a straightforward problem-framing template. Six steps, a checklist, a template reference. A senior PM could write this from memory. But the discipline of having it formalized — with explicit gates that force you to quantify impact and name the user segment — gives it real utility in environments where problem framing is habitually skipped.

## Where it helps, where it hurts

**Best case**: A product team has been building features for six months. Velocity is high, but nobody can articulate why any of it matters. Leadership is asking pointed questions about ROI. You load this skill. The agent produces a problem statement that names the specific user segment (not "users" but "freelance designers managing 5+ concurrent clients"), quantifies the pain (they spend 4 hours/week on client communication overhead), connects it to business impact (churn is 12% among this segment), and sets a success metric (reduce client communication time to 2 hours/week, targeting 6% churn). The team reads it and realizes they have been solving problems for the wrong segment entirely. The document forces a realignment conversation that would not have happened otherwise.

**Worst case**: An executive says "we need a problem statement for our AI initiative to show the board." The agent loads this skill. The checklist demands quantified impact and success metrics with baselines. The team does not have that data, but the agent does not know that, so it infers plausible-sounding numbers from context. The problem statement gets presented to the board with fabricated baselines and invented business impact. The board approves the initiative based on evidence that does not exist. Three months later, when actual baselines are measured, the original framing turns out to have been disconnected from reality. The project is too far along to stop, so everyone pretends the original problem statement was directionally correct. The skill enabled performative rigor.

## What it quietly assumes

1. **Evidence exists and is accessible.** Step 2 explicitly says "Look for evidence from user research, support tickets, or behavioral data." This assumes the organization has collected and organized this evidence, that the agent can access it, and that it is relevant to the specific problem being framed. In early-stage products, none of this holds. The agent will produce a problem statement that reads like it is evidence-backed when it is actually built on inference.

2. **Business impact can be quantified.** Step 3 asks how the problem "affects revenue, retention, growth, or strategic goals" and the checklist demands "quantified with data or reasonable estimates." The word "reasonable" is doing a lot of work here. An agent with no access to internal business data will produce estimates that are reasonable-sounding but ungrounded. This assumption holds in organizations with embedded analytics and fails everywhere else.

3. **The user already knows the user segment.** Step 1 asks the agent to "get specific about the user persona, role, or segment" but does not acknowledge the possibility that the user segment is itself an open question. In many initiatives, part of the discovery is figuring out who the problem actually affects most.

4. **The problem is separable from solutions.** The checklist says "Problem describes the 'what' without prescribing the 'how'," which assumes a clean separation between problem and solution. In practice, problems and solutions co-evolve — what you frame as "the problem" is shaped by your sense of what solutions are feasible. The skill treats this as a purity issue rather than acknowledging it as a genuine tension.

5. **Organizational patience for framing exists.** The entire skill assumes the team will pause to frame a problem before building. In organizations where "shipping" is the only virtue signal, a problem statement is seen as bureaucracy.

## What could go wrong

File write: the agent writes a problem statement document to the filesystem. The risk pattern is the same as all skills in this suite — the output looks authoritative, but the quantified claims (baselines, business impact, target metrics) are the parts most likely to be hallucinated. The user should verify every number in the output against actual data before sharing the document. No network access, identity operations, or elevated permissions are needed. The user does not need to be present during generation but must audit the result.

## Bottom line

A clean, well-structured problem-framing prompt that earns its place primarily through its position as the entry point in a coherent product workflow chain. Its routing logic is the most thoughtful part — it tells you clearly when to step back (hypothesis), when to go forward (PRD), and when to go sideways (JTBD canvas, solution brief). In isolation, it is a competently written template that any PM could reproduce. In context with the other pm-skills, it is the foundation everything else references. Biggest risk: quantified claims fabricated to satisfy the checklist when real data does not exist. Biggest benefit: the "what not how" discipline and the routing logic that prevents premature commitment to a solution.

## Confidence: medium

The skill is clearly written and the workflow logic is sound, but its real value depends on whether the user's environment has the evidence infrastructure (user research, analytics, baselines) that the steps assume. In data-poor environments, the skill will still produce output — it just will not be honest output.
