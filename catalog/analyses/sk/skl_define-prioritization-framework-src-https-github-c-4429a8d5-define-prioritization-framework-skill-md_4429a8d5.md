---
schema_version: 1
skill_id: skl_define-prioritization-framework-src-https-github-c-4429a8d5-define-prioritization-framework-skill-md_4429a8d5
source_hash: sha256:05ffaeecdf09241d4ef0bb718b4f24365888e1ba
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:07:15+08:00"
---

# define-prioritization-framework

A multi-framework prioritization engine that runs up to five scoring methods (RICE, ICE, MoSCoW, Weighted Scoring, Kano) against a list of candidate items, produces a cross-framework divergence analysis, and synthesizes an executive recommendation. Its defining feature is not the frameworks themselves—every PM knows these—but the refusal protocols, applicability filter, and the deliberate emphasis on divergence as insight.

## Why it matters

This is the best product management skill I've read so far. It earns that assessment on three concrete design choices, not on comprehensiveness alone.

First, the **applicability filter**: the skill refuses to run frameworks that don't match the available data. Kano is gated behind customer research. RICE requires quantitative inputs or an explicit estimation scaffold. ICE is always applicable as a coarse fallback. This prevents the single most common prioritization failure—running RICE on made-up numbers and calling it rigor.

Second, the **six refusal protocols**: the skill will flatly refuse to produce output under specific conditions (empty list, no context, missing RICE inputs, wrong-framework insistence, single-stakeholder weighted scoring, Kano without customer research). Each refusal includes a concrete alternative. These aren't error messages—they're guardrails that prevent the agent from producing misleading analysis. The RICE refusal is particularly good: "I cannot produce defensible RICE scores without reach, impact, confidence, and effort estimates" followed by three concrete options.

Third, the **divergence as insight**: "Multi-framework analysis surfaces what single-framework selection hides." The cross-framework comparison table explicitly labels divergent items and demands an explanation of the driving dimension. This turns a mechanical scoring exercise into genuine strategic analysis—the disagreement between ICE and RICE on the same item often reveals that ease is carrying too much weight, or that a high-reach, high-effort initiative is being underrated.

The skill also has unusually thorough cross-references: it names which upstream skills feed into it, which downstream skills consume its output, and which adversarial review skill challenges its assumptions.

## Where it helps, where it hurts

**Best-case scenario:** You're a PM with a list of 15-20 candidate features for Q3, rough effort estimates from engineering, impact estimates from user research, and stakeholders who disagree about what matters. You load this skill. It filters Kano out (no survey data), runs RICE, ICE, MoSCoW, and Weighted Scoring, and produces a comparison that shows Items A, C, and F rank in the top 5 across all frameworks. But Item D is #2 in RICE (massive reach) and #12 in ICE (low ease). That divergence sparks a real conversation: do we invest the engineering effort to unlock the reach, or is ease the binding constraint? The output isn't just a ranking—it's a decision-support artifact that makes hidden trade-offs visible.

**Best-case scenario 2:** You try to run RICE on made-up numbers. The skill pushes back with the estimation scaffold option. You take that option, and it produces a structured worksheet showing you exactly which numbers you need to estimate, forcing you to acknowledge that your "high confidence" item actually has unknown reach. The honesty improves the decision quality more than any score would.

**Worst-case scenario:** You provide a list of 5 items with only names and one-sentence descriptions, no data at all. The applicability filter correctly gates out RICE, Kano, and Weighted Scoring (unless you accept equal default weights). ICE runs—it always does—and produces 1-10 scores that are pure agent judgment with zero grounding. MoSCoW also runs, classifying items into Must/Should/Could/Won't based on the agent's interpretation of the item descriptions. The output looks structured and legitimate but is no better than asking a colleague for a gut check. The skill warns about this (ICE scores carry "coarse but fast" caveats, and the sensitivity section asks what changes if Confidence is wrong), but the format of the output—tables, cross-framework comparisons, an executive summary—creates an aura of rigor that the underlying data doesn't support.

## What it quietly assumes

1. **The user has a pre-defined candidate list.** The skill explicitly says this ("this skill ranks a list, it does not discover what belongs on it") and cross-references `define-opportunity-tree` for list generation. This is stated, not hidden—but it means the skill is useless unless an upstream process has already produced structured candidates. The quality of the prioritization is bounded entirely by the quality of the candidate list.

2. **The user can provide or estimate quantitative inputs.** RICE needs reach, impact, confidence, and effort numbers. In practice, most PMs cannot produce defensible reach estimates. The estimation scaffold helps, but the skill assumes the act of estimating produces better decisions than not estimating. This is an assumption with mixed empirical support—sometimes false precision is worse than honest ranking.

3. **The frameworks are complementary, not redundant.** Running RICE and ICE together assumes they will surface different things. Sometimes they do (the divergence insight). Sometimes they don't, and the multi-framework approach just adds busywork. The skill has no mechanism to detect when frameworks are producing redundant rankings and say "you could have stopped after one."

4. **The agent can execute framework scoring faithfully.** Every framework requires the agent to assign scores per item based on the provided inputs. An agent that skips the input data and assigns scores from generic heuristics will produce output that passes the quality checklist but is fabricated. The skill's refusal protocols push back on completely missing data but cannot detect when the agent quietly ignores the data that was provided.

5. **The skill exists in a family of related PM skills.** The cross-skill composition section references `develop-solution-brief`, `define-opportunity-tree`, `define-hypothesis`, `discover-interview-synthesis`, `deliver-launch-checklist`, and `utility-pm-critic`. All of these must exist and work together for the full intended workflow. In isolation, this skill is powerful but incomplete—it ranks items but can't generate them or act on the ranking.

## What could go wrong

The tool risks are minimal—the skill explicitly limits itself to read-only tools (Read, Grep) and produces a markdown artifact. No file writes outside the output, no destructive operations. The user does not need to be present.

The real risk is **decision risk**, not tool risk. The output is a set of ranked recommendations presented with tables, scores, and an executive summary. A PM who treats this as authoritative without examining the input data quality, the estimation assumptions, or the framework weights could commit significant resources to the wrong items. The skill includes sensitivity analysis and limitations sections as mitigations, but these are passive—they work if the PM reads them, not if the PM skips to the ranking.

A subtler risk: the skill's high-quality refusal protocols might train users to work around them. If a PM learns that Kano gets excluded without customer research, they might fabricate "customer feedback" next time to unlock it. The skill can't detect fabricated inputs—it can only gate on presence, not authenticity.

## Bottom line

The best-structured PM skill I've seen in this batch, and likely the best prioritization skill in any product management catalog. Its refusal protocols, applicability filter, and divergence-as-insight philosophy represent genuine design thinking, not just template completion. The biggest benefit is that it refuses to produce bad analysis—it will say no when the inputs don't support the method. The biggest risk is that its formatted output creates an illusion of rigor that the underlying data may not warrant. It earns a spot in any tight catalog. If you read only one of the four skills in this batch, read this one.

## Confidence: high

The source is complete, detailed, and contains executable refusal protocols with concrete alternative-language. I understand the scoring mechanics, the degradation paths for weak data, and the failure modes well enough to defend every judgment.
