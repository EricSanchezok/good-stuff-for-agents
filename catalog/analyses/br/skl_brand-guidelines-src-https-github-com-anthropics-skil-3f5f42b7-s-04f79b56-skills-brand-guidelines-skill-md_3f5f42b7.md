---
schema_version: 1
skill_id: skl_brand-guidelines-src-https-github-com-anthropics-skil-3f5f42b7-s-04f79b56-skills-brand-guidelines-skill-md_3f5f42b7
source_hash: sha256:47c72c607bdb5dd81bdea5de2b5e4f3992a5fd59
analysis_version: 1
confidence: high
updated_at: "2026-07-10T02:35:00+08:00"
---

# Brand Guidelines Skill (Anthropic Brand Styling)

This is not a general-purpose brand-guidelines skill. It is Anthropic's own internal corporate style sheet, packaged as a skill. It encodes exactly one brand — Anthropic's — with specific hex colors (#141413 dark, #faf9f5 light, #d97757 orange accent), Poppins/Lora font pairing, and python-pptx application hints. If you are not building output for Anthropic, this skill is irrelevant.

## Why it matters

It doesn't matter to anyone outside Anthropic, and it barely matters inside Anthropic either — it's a style reference card, not a skill with workflows or logic. The actual value is that it centralizes brand token values so different agents and artifacts can reference the same hex codes without drift. That's useful, but it's also what any brand does with a one-page PDF or a Notion doc. Wrapping it in a SKILL.md adds discoverability at the cost of pretending a style sheet is a capability.

The font guidance is misleading. It says Poppins and Lora "should be pre-installed in your environment for best results" and that the skill "uses system-installed Poppins and Lora fonts when available." These are Google Fonts — they are not system fonts on macOS, Windows, or any standard Linux distribution. The stated fallbacks (Arial for headings, Georgia for body) are what will actually render on 95% of systems, making the Poppins/Lora pairing aspirational rather than operational. A better skill would include font download instructions or a CDN reference.

The python-pptx mention in the technical details is the only concrete implementation hint, and it's a single passing reference — there's no code, no application script, no template. This reveals the skill's true nature: it's a token store, not a tool.

## Where it helps, where it hurts

**Best case**: An agent inside Anthropic is generating a slide deck, document, or web page that needs to match the company brand. Loading this skill gives it the authoritative hex codes and font pairings. For internal Anthropic use where brand consistency matters, this is a small but real win — it prevents an agent from guessing #FF6600 when it should be #d97757.

**Worst case**: Any use outside Anthropic. The skill's description says "Applies Anthropic's official brand colors and typography to any sort of artifact" — but a non-Anthropic user loading this will get their deck styled in Anthropic's corporate identity, which is exactly the opposite of what they want. The skill's keywords ("branding, corporate identity, visual identity, company design standards") are generic enough that a search for "brand guidelines" could surface this skill for an agent whose user works at Salesforce, and the agent would then apply Anthropic orange to a Salesforce deck. That's a real failure mode, not a theoretical one.

A secondary worst case: the agent loads this skill expecting brand-application logic and finds only color/font declarations. There's no code to apply, no templates to use, no validation rules — just values. The agent must already know how to apply brand styling to an artifact; this skill only tells it what values to use.

## What it quietly assumes

The skill assumes the user is inside Anthropic. It never states this, but every color, font, and design decision is Anthropic-specific. The generic description ("Applies Anthropic's official brand colors") does state "Anthropic," but the keyword list and trigger semantics would match any brand-related query regardless of the user's actual affiliation.

It assumes Poppins and Lora are available as system fonts, which they are not on any standard OS. It assumes python-pptx as the target library, which limits the skill to PowerPoint file generation and excludes HTML, PDF, Keynote, Google Slides, and every other output format. It assumes the agent knows how to apply colors and fonts mechanically — this skill provides no implementation guidance beyond listing values.

It assumes there is one correct brand application. No variants, no dark-mode alternatives (despite having a "Dark" color), no accessibility thresholds, no guidance on when to use accent colors vs. main colors. A real brand guidelines document would cover these; this is a minimal token reference.

## What could go wrong

Low operational risk — this is a read-only style reference. No tool execution, no filesystem writes, no network calls.

The real risk is misapplication: an agent outside Anthropic applies Anthropic's brand to a non-Anthropic artifact, producing output that looks like it was built by a confused contractor. The skill's discoverability keywords make this more likely, not less. Within Anthropic, the risk is subtler: the agent applies the stated fonts (Poppins/Lora) that aren't actually installed, the fallback kicks in silently, and the output doesn't match the brand spec the agent thought it was following.

The user does not need to be present, but they should be an Anthropic employee for this skill to make any sense at all.

## Bottom line

This is a corporate style sheet masquerading as a skill. For Anthropic employees automating slide-deck generation, it serves a real (if tiny) purpose as a centralized brand token store. For everyone else, it's noise — and potentially harmful noise if it's surfaced by generic brand-related queries. In a catalog of 100 skills, this does not earn a spot as-is. An actually useful version would be renamed to "anthropic-brand-styling" and its triggers would explicitly scope to Anthropic artifacts, preventing the cross-brand misapplication scenario. The biggest benefit is brand token centralization for Anthropic-internal use; the biggest risk is an agent applying Anthropic orange to someone else's company deck.

## Confidence: high

I read every word. This skill is 80 lines of brand token declarations with no executable logic. There's no ambiguity about what it is or who it's for. The only judgment call is whether its discoverability risk outweighs its token-centralization benefit — I think it clearly does, but I can see the internal-Anthropic counterargument.
