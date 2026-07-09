---
schema_version: 1
skill_id: skl_foundation-stakeholder-update-src-https-github-com-a6397108-s-foundation-stakeholder-update-skill-md_a6397108
source_hash: sha256:15ebba0e9586cb55ea318d3ebae7afa4672b211f
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:06:02+08:00"
---

# Stakeholder Update

A meeting-outcome translator that turns what happened in a meeting into what-it-means for people who weren't there. The skill takes a meeting recap (or raw notes as a fallback), infers the right channel and audience variant, and produces a formatted async update with the primary CTA surfaced up front. It supports four channel variants — Slack/Teams, email, Notion, and exec-memo — each with distinct structure and tone. The key design insight is that non-attendees need translation, not transcription: the skill flags jargon, provides plainer alternatives, and keeps a translations-applied log for the user to verify before sending.

## Why it matters

This is a solid but not groundbreaking meeting-to-communication translation skill. Its most useful feature is the channel-variant system: a Slack update has a one-line headline, three TL;DR bullets, and a bold CTA; an exec-memo leads with TL;DR, caps supporting detail at three sections, and uses formal tone with no emojis. These format rules are concrete enough that the agent can produce materially different outputs for each channel, not just the same text with different headers.

The zero-friction execution model is well-designed. The skill detects thread continuation by scanning for prior updates on the same topic, infers channels and audiences from context, presents a brief inference summary, and accepts `go` or corrections — or runs with `--go` to skip the prompt entirely. This prevents the skill from turning into an interrogation session while still giving the user a checkpoint.

The distinction from sibling skills is clear and explicitly routed: `foundation-meeting-recap` is for attendees (what happened); this skill is for non-attendees (what it means). `foundation-stakeholder-briefings` is for fanning out one master document to multiple audiences; this skill is for one meeting's outcomes to one audience. These boundaries prevent the most common misuse — loading the wrong skill for the wrong communication pattern.

However, the skill's core value proposition — "translate meeting outcomes into what-it-means for readers" — is something a competent agent can do with a well-written prompt. The channel-variant formats and thread-detection logic add genuine value, but the basic workflow (read recap → distill outcomes → tailor to audience → surface CTA) is not novel.

## Where it helps, where it hurts

**Best case:** You just left a 90-minute architecture decision meeting. Five engineers were in the room. Twenty people across three teams need to know what was decided and what it means for them — especially the QA team whose test plan is affected but who weren't invited. You have a Recap artifact from the meeting. Load this skill, it detects the recap, infers a mixed-audience Slack variant, surfaces the QA-relevant CTA, and produces a send-ready update in under a minute. The thread-detection feature links this update to last week's update on the same topic so readers have context.

**Worst case:** You don't have a recap — just some scattered meeting notes with incomplete decisions and vague action items. The skill accepts raw notes with a lower input-quality flag, but the output will be correspondingly thin. Worse: if the meeting was a status-touchpoint rather than a decision-making meeting, there are no meaningful "outcomes" to translate. The skill will still produce a formatted update, but it'll be empty calories — "we discussed X, next steps TBD." Also: if you need to communicate to five different audiences from the same meeting, this skill is the wrong tool — it's designed for one audience per invocation, and running it five times will produce five independent artifacts with no master to keep them consistent. That's what `foundation-stakeholder-briefings` is for, and the skill correctly routes to it — but only if you read the "When NOT to Use" section first.

## What it quietly assumes

**A Recap artifact exists or the user provides rich meeting notes.** The skill's preferred input is a `foundation-meeting-recap` with structured decision/action/outcome fields. When that's missing, it falls back to raw notes but tags the result as lower quality. In practice, many meetings don't produce recaps — the user has five bullet points in a Notion page. The skill's output quality degrades proportionally with input quality, and there's no mechanism to recover.

**The agent can accurately detect thread continuation from filenames and frontmatter.** The skill says to scan the "same directory" for prior updates matching on `project`/`topics`. This assumes a consistent file-naming convention and frontmatter structure that may not exist in the user's workspace. If the prior update is in a different folder or uses a different format, the thread detection silently fails.

**The agent can correctly infer channel from audience.** The mapping is: engineering/design → Slack, leadership → email, mixed → Notion. This is reasonable but not universal. Some organizations do all async comms in Slack including leadership updates; others consider Slack inappropriate for anything more formal than FYIs. The inference is a starting point, but the user needs to verify it.

**Jargon detection is reliable.** The skill says to flag jargon and acronyms and provide plainer alternatives. This assumes the agent recognizes domain-specific jargon that won't land with the target audience — which varies by audience. A term that's standard for engineering may be gobbledygook for CS. The skill provides no per-audience jargon taxonomy, so the agent is guessing.

The assumption about recap availability is the most consequential: without a good recap, the skill is a fancy Slack-message formatter, not a meeting-outcome translator. This holds in maybe 50% of real meeting situations — recaps are aspirational, not universal.

## What could go wrong

**The skill writes a shareable document — no destructive operations.** The real risk: a mistranslated CTA. If the meeting decided to postpone a feature launch but the agent's update says "launch is proceeding," a non-attendee team starts executing on bad information. The translations-applied log is the safety net, but it's internal — the user must read it and verify before sharing. If the user copy-pastes the shareable block without checking the log, they're forwarding whatever the agent produced.

A secondary risk: the thread-detection fails and the update doesn't link to prior context. Readers see a decision in isolation, without the history that explains why it was made. This creates confusion rather than alignment.

A third risk: the `--go` mode bypasses the inference summary entirely. If the user runs with `--go` and the inferred channel or audience is wrong, the output is a well-formatted update sent to the wrong people in the wrong tone. The user probably catches this before sending, but the skill provides no backstop.

The user must be present to review — not during generation, but absolutely before sending. The shareable output is designed to be copy-pasted, and the boundary marker separating it from internal verification sections means the user has to actively skip checking. That's a design choice that trades safety for convenience.

## Bottom line

Pick this if you're in the PM-skills meeting family and need consistent, channel-tailored async updates from meeting recaps. It's a solid workhorse that does its job competently. Skip it if you need multi-audience fan-out from a single master (use `stakeholder-briefings`) or if your meetings rarely produce recaps — the skill's value is tightly coupled to input quality. In a tight 100-skill catalog, this earns a spot only as part of the meeting-skills family, not on standalone merit. Biggest benefit: the channel-variant format rules produce genuinely different outputs, not reskinned text. Biggest risk: the `--go` bypass makes it too easy to skip verification and send a mistranslated CTA.

## Confidence: high

The source is complete with clear boundaries, concrete format rules, and explicit routing to sibling skills. I read the full skill and the referenced meeting-skills family contract, and I understand the meeting-communication domain well enough to judge this skill's place in it.
