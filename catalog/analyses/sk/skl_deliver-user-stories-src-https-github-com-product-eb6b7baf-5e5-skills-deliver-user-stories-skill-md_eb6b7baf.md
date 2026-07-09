---
schema_version: 1
skill_id: skl_deliver-user-stories-src-https-github-com-product-eb6b7baf-5e5-skills-deliver-user-stories-skill-md_eb6b7baf
source_hash: sha256:40a476c401001507a405c38815c5f2d39fbc2a0a
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T03:38:00+08:00"
---

# deliver-user-stories

A structured prompt for decomposing feature requirements into user stories in the standard "As a [persona], I want [action] so that [benefit]" format. The seven-step process walks the agent from understanding feature context through to defining acceptance criteria in Given/When/Then format and validating each story against the INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable). It routes downstream to `deliver-acceptance-criteria` for deeper test coverage and to `deliver-edge-cases` for boundary/failure scenarios, and upstream to `deliver-prd` when the feature is not yet specified.

## Why it matters

The single best thing in this skill is the INVEST criteria application step. Most user story prompts stop at "write As a... I want... so that..." and call it done. This skill forces the agent to validate each story against six quality dimensions, including estimability ("can engineering actually size this?") and independence ("can we build this in any order?"). Stories that fail are revised. That is actual quality engineering, not template filling. The routing logic is also good: it acknowledges that user stories are one artifact in a chain, and that deeper work (acceptance criteria, edge cases) belongs to sibling skills rather than being weakly covered here.

That said, the "As a... I want... so that..." format is the most commoditized template in all of product management. Every PM tool, every agile training, every Jira template uses it. The skill's core value proposition — decompose features into user stories — is something a competent agent can do from general knowledge. What elevates this above baseline is the INVEST gate and the structured per-story output with separate sections for Context, Design Notes, Technical Notes, Dependencies, and Out of Scope.

## Where it helps, where it hurts

**Best case**: A PRD for a new checkout flow has been approved. Engineering needs sprint-ready stories by Tuesday. You load this skill with the PRD as input. The agent produces eight stories, each with a specific persona ("As a first-time buyer using guest checkout..."), INVEST-validated scope, Given/When/Then acceptance criteria, and explicit out-of-scope boundaries. Engineering lead reviews and says "these are the cleanest stories we've ever received — we can estimate every one of them." The sprint starts on time with no requirement churn.

**Worst case**: A PM says "write user stories for our new notifications feature" but has no PRD, no defined personas, and no scope boundaries. The agent loads this skill, which says it needs feature context from a PRD, but the agent proceeds anyway. It invents plausible personas from context, fabricates feature boundaries, and writes tidy-looking stories with Given/When/Then criteria that map to nothing real. Engineering sees the stories, estimates them, and starts building. Two sprints in, the PM realizes the stories describe a feature nobody actually asked for — the personas were wrong and the scope was guessed. The INVEST validation passed because each story was internally consistent, but they were externally disconnected from reality. The skill created the illusion of well-scoped work.

## What it quietly assumes

1. **A PRD or equivalent feature specification exists.** Step 1 says "Review the PRD or feature description." If neither exists, the agent has nothing to trace stories back to. The skill does not offer a fallback — it just routes you to `deliver-prd` in the "when NOT to use" section and assumes you will follow that advice. Users will not always follow it.

2. **Personas are already known and distinct.** Step 2 says "Determine which users interact with this feature." This assumes persona research has been done and the agent can reference defined user types. In teams without formal personas, the agent will infer segments from context, and those inferences may be wrong.

3. **The agent can write non-trivial Given/When/Then criteria.** The skill requires acceptance criteria in GWT format but provides no guidance on what good ones look like. An agent that produces superficial criteria ("Given the user is logged in, When they click the button, Then the modal opens") will pass the checklist but produce stories that miss edge cases and give engineering no real contract to test against.

4. **Stories really can be independent and small.** The INVEST criteria are applied as a validation step, but some features genuinely resist decomposition into independent, sprint-sized stories. The skill assumes this decomposition is always possible with enough effort, which is not universally true — particularly for platform-level or infrastructure-heavy features.

5. **One sprint is the right size boundary.** The checklist says "small enough to complete in one sprint." Sprint length is organizational; two weeks is traditional but far from universal. More importantly, "small enough for one sprint" sets a ceiling without a floor — a story could be trivially small and still pass.

6. **The agent has access to design references and technical context.** Steps 4 and 7 mention "design references" and "technical considerations." Without access to Figma files, architecture docs, or engineering team conventions, the agent will produce generic notes that add noise rather than clarity.

## What could go wrong

File write: the agent writes user story documents to disk. The primary risk is the same as all skills in this suite — well-formatted output that looks authoritative but contains hallucinated personas, fabricated scope boundaries, and GWT criteria that are tautological rather than testable. The user should verify that each persona is a real user type the team recognizes, that the stories trace to actual PRD requirements, and that the acceptance criteria would actually fail a broken implementation. No network, identity, or elevated permissions are needed. The user does not need to be present during generation but must review the output before it enters a sprint planning session.

## Bottom line

A better-than-average user story prompt, primarily because of the INVEST validation step, which most competitors omit. The per-story structure with explicit Context, Design Notes, Technical Notes, Dependencies, and Out of Scope sections is also above baseline. In a catalog of 100 skills, this earns a spot if the catalog includes the upstream and downstream skills it connects to (PRD, acceptance criteria, edge cases), because together they form a coherent specification pipeline. In isolation, it is a competent user story generator that you could replace with a well-crafted prompt to any capable agent. Biggest risk: stories that are INVEST-valid internally but disconnected from external requirements because the preconditions (PRD, personas) were not met. Biggest benefit: the INVEST gate catches bloated or interdependent stories before they reach engineering.

## Confidence: medium

The source is clear, the INVEST application is a real differentiator, but the skill's effectiveness depends on the quality of the upstream PRD and the existence of defined personas — both of which are outside its control and not validated by the skill itself.
