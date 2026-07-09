---
schema_version: 1
skill_id: skl_foundation-stakeholder-briefings-src-https-github-e8f9ba1c-oundation-stakeholder-briefings-skill-md_e8f9ba1c
source_hash: sha256:7357e7604270a4a310e78744add961263da91b0a
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:06:02+08:00"
---

# Stakeholder Briefings

A master-first, project-later document generator that solves a specific, painful PM problem: one piece of work needs to reach five different audiences, each of whom needs a different framing, but all five versions must never contradict each other. The skill takes any source artifact (PRD, research, GTM plan, experiment results, retro) and produces a canonical master document with numbered, traceable claims (`M1`, `M2`, ...), then projects audience-tailored briefings from that master. The projection rule — no briefing may assert a claim absent from the master — is what makes this skill genuinely novel. It's not "rewrite this six ways." It's "write one truth, then project it six ways, and never let the projections diverge."

## Why it matters

This is a standout skill. The master-first design with claim IDs is a simple but powerful structural constraint. Every briefing block carries a `Draws on:` line that lists exactly which master claims it projects, making the traceability auditable. Every block has exactly one `Primary ask:`. These two constraints — traceable derivation and single action per audience — prevent the most common failure mode of multi-audience communication: the versions quietly disagreeing with each other.

The nine audience lenses (executive, board, engineering, UX/design, PMM, sales, CS, legal, data) come with concrete definitions, boundary rules ("not this lens when"), and an overlap matrix in the references. This isn't a vague "tailor to your audience" instruction — it's a system. The source-type map tells you which audiences to propose based on what kind of artifact you're projecting from, so the agent isn't guessing.

The translations-applied log — an internal section below a boundary marker that records every technical-to-business translation for user verification — is a thoughtful safety feature. It acknowledges that translations can drift and gives the user a chance to catch it before the briefings go out.

The N=1 support is a pragmatic detail: you can generate briefings for a single audience when that's all you need. The fan-out is the signature use case, not the floor.

## Where it helps, where it hurts

**Best case:** You have just finished a PRD or a major discovery synthesis. It's dense, technical, and 40 pages. Engineering needs the architecture decisions and tradeoffs. The executive sponsor needs the what, why, and investment ask in one page. PMM needs the positioning implications. Legal needs the data-handling sections. You could spend an afternoon rewriting the same document four ways and hoping they stay consistent — or you could run this skill once and get four traceable briefings that all derive from the same master. This is the scenario where the projection rule pays off: if the executive briefing says "we recommend approach X," and you check the master, either `M14` says that or the briefing has a bug.

**Worst case:** You don't have a real source artifact yet — just an idea and some notes. The skill can still run ("if the source is thin, continue but set `input_quality: low` and name the gap"), but the master will be thin, the claims will be few, and the projections will be hollow. You're essentially running a briefing generator on vapor. Also: if you only have one audience and a short source (30-second Slack update), this skill is overkill — the master + projection machinery adds ceremony that a single tailored paragraph didn't need. The skill also assumes the agent can correctly classify the source type to propose the right audience set; misclassifying a compliance doc as a spec will propose the wrong lenses.

## What it quietly assumes

**The agent can build a neutral master from a source artifact.** The skill says the master must carry "no audience-specific spin." This is harder than it sounds. A source artifact — especially a PRD written by a PM — is already pitched to some audience. The agent must extract the substance and strip the framing. That's a non-trivial editorial task, and the skill provides no concrete guidance on how to do it.

**The agent understands what each audience lens means in practice.** The full lens definitions and overlap matrix are in `references/audience-lenses.md`, but referencing them doesn't guarantee the agent applies them correctly. A board briefing and an executive briefing differ in length, vocabulary, and decision type, and the agent needs to know the difference — or the output will be two identically worded blocks with different headers.

**The source artifact is complete enough to generate a useful master.** The skill says to name gaps when the source is thin, but it doesn't refuse. A user who feeds in a half-baked document will get a master that faithfully reflects the half-baked thinking, and the briefings will faithfully project it. The traceability is sound; the thinking is what's unsound.

**The user will actually verify the translations log.** The translations-applied log is a great idea, but it's only useful if the user reads it before sending briefings. In practice, a PM under time pressure might copy-paste the briefings without checking — and discover a translation error when the board asks about a claim that doesn't exist in the original analysis.

The assumption about neutral master extraction is the riskiest. It's a real editorial skill, and the skill's quality gate for it is "review," not "automated check." In maybe 60-70% of cases an agent can do this passably; in the remaining cases, the master inherits the source's framing and the projections carry the bias forward.

## What could go wrong

**No destructive tool use — the skill is read-and-write-document only.** The real risk is political. If a briefing block's `Primary ask:` is wrong for the audience (e.g., asking engineering for a budget decision), the recipient reads it as a request from the PM, not from the agent. The PM is accountable for what goes out under their name. If the PM doesn't review the briefings before forwarding, a mismatched CTA can damage relationships or delay decisions.

A second risk: the "no untraced claim" invariant is a review step, not automated. An agent that skips the self-check or does it sloppily could produce a briefing that quietly adds a claim absent from the master. The user might not catch it without diffing every briefing against the master manually.

The user must be present to review before anything is shared externally. The skill intentionally outputs a single file with a boundary marker separating shareable blocks from internal meta-sections — the user is expected to copy out only the shareable parts.

## Bottom line

Pick this skill when you have one high-stakes artifact (PRD, GTM plan, major research) that needs to land with multiple audiences and consistency matters. It earns a spot in a tight 100-skill catalog because the master-first projection model with traceable claim IDs is genuinely distinctive — it solves the multi-version drift problem that "rewrite this six ways" approaches create. Biggest benefit: auditable consistency across audience variants. Biggest risk: the neutral-master extraction is a hard editorial task, and the skill's only quality gate for it is "review." If the master is biased, every projection inherits the bias.

## Confidence: high

I read the complete source, including the referenced structure for audience lenses and source-type maps. The projection model is well-defined, the invariants are checkable, and the skill's boundaries with sibling skills are clearly stated.
