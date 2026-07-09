---
schema_version: 1
skill_id: skl_deliver-prd-src-https-github-com-product-on-purpos-f3cad5c7-ose-f2ce15e5-skills-deliver-prd-skill-md_f3cad5c7
source_hash: sha256:2100006eb0ac716f5691167c975e701d2675596f
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T03:30:00+08:00"
---

# deliver-prd

A structured workflow for generating Product Requirements Documents. It gives the agent an eight-step process (summarize problem, define goals/metrics, outline solution, detail functional requirements, set scope boundaries, address technical considerations, identify dependencies/risks, propose timeline) and a quality checklist. It references an external template and example file for output structure. The most useful part is not the workflow itself — it is the explicit "when NOT to use" section that routes you to sibling skills when the preconditions are not met.

## Why it matters

This is a competent but thoroughly generic PRD skill. The sections it covers — problem summary, success metrics, functional requirements, scope, technical considerations, dependencies, timeline — are exactly what any product manager or PRD template would include. There is no unique methodology, no distinctive framing technique, no novel requirement-quality heuristic. The one genuinely useful feature is the routing logic: it explicitly redirects you to `define-problem-statement` when the problem is unframed, to `develop-solution-brief` when you need stakeholder alignment first, to `deliver-user-stories` when you just need tickets, and to `develop-adr` for architecture decisions. That routing represents real editorial judgment about workflow sequencing. Beyond that, you could swap this with any other PRD skill from any other PM toolkit and get roughly the same result.

## Where it helps, where it hurts

**Best case**: You are three weeks into a product initiative. The problem statement is ratified, the solution brief has been socialized with leadership, and engineering is asking for a formal PRD before they will commit resources. You load this skill, and it walks the agent through producing a complete, checklist-verified document with explicit scope boundaries and testable requirements. The document lands in the shared drive, engineering reads it in 12 minutes, and work begins.

**Worst case**: A founder asks the agent to "write a PRD for our new analytics dashboard." The problem is still vague, the solution is contested, and there is no prior problem statement or solution brief. The agent loads this skill anyway (it tells you not to, but it does not enforce), produces a beautiful-looking PRD with confident-sounding metrics and scope boundaries that are pure fabrication. Nobody in the room actually knows what success looks like, so the specific, measurable metrics in the PRD are decoupled from reality. The document gives a false sense of alignment, and engineering builds to a spec that was never grounded. The damage is not in the output quality — it is in the illusion of rigor.

## What it quietly assumes

1. **A solved problem and aligned solution already exist.** The skill explicitly says "after problem and solution alignment," but there is no validation step. The agent will not check whether those preconditions are met. In practice, users will ask for PRDs too early, and the skill will comply without protest. This assumption holds in mature product organizations with formal phase gates; it fails in startups, early-stage products, and any fast-moving team.

2. **The agent can produce genuinely testable requirements.** The checklist says "requirements are testable and unambiguous" but gives the agent no technique for achieving this. The skill assumes the agent implicitly knows how to distinguish a testable requirement from a vague aspiration. That is a significant cognitive assumption about the agent's reasoning capability.

3. **The referenced template file exists and is well-designed.** The skill delegates output structure to `references/TEMPLATE.md`. If that file is missing, the agent gets a scaffold with no walls. Even if it exists, the template quality is an unknown variable this skill does not control.

4. **A multi-stakeholder, approval-gated environment.** The workflow assumes stakeholders need to approve scope before investment, that multiple teams coordinate on shared deliverables, and that there is a formal engineering handoff. This is true at larger companies and falls apart in teams of fewer than 10 people where the PRD writer is also the stakeholder and the engineer.

5. **Domain knowledge for dependency and risk identification.** Step 7 asks the agent to list dependencies, assumptions, and risks with mitigation strategies. This assumes the agent has enough domain and organizational context to do this meaningfully rather than producing generic boilerplate like "risk: scope creep, mitigation: clear scope boundaries."

## What could go wrong

The primary risk is file-system: the agent writes a PRD to disk. The worst realistic outcome is overwriting an existing PRD at the same path, or writing to a location that gets mistaken for the authoritative document. The user should review the output before it enters any formal approval pipeline — a PRD with fabricated metrics or hallucinated dependencies looks convincing and can derail engineering planning for weeks if taken at face value. The user does not need to be present during generation, but they must read the output before distributing it. No network or identity capabilities are needed.

## Bottom line

This is a competent PRD scaffold with a single distinctive feature — its routing logic — and otherwise nothing you cannot get from any other PRD template. In a catalog of 100 skills, I would keep it only if the catalog already had the sibling skills it routes to (`define-problem-statement`, `develop-solution-brief`, `develop-adr`, `deliver-user-stories`), because together they form a coherent phase-gated product workflow. In isolation, it is replaceable. Biggest risk: producing confident-looking requirements documents from unvalidated preconditions. Biggest benefit: the quality checklist gives the agent a concrete self-review step that many PRD templates omit.

## Confidence: medium

The source is clearly written and well-structured, but the actual value of this skill depends heavily on the quality of the referenced template and example files, which I cannot inspect. The skill's instructions are generic enough that the agent's output quality will vary widely with its base reasoning capability.
