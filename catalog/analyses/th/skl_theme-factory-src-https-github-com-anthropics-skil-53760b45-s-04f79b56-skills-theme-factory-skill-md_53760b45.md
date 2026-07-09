---
schema_version: 1
skill_id: skl_theme-factory-src-https-github-com-anthropics-skil-53760b45-s-04f79b56-skills-theme-factory-skill-md_53760b45
source_hash: sha256:5e81a3ebb46a83facaf91757d2cc0e00ef0366c8
analysis_version: 1
confidence: high
updated_at: "2026-07-10T02:30:00+08:00"
---

# Theme Factory Skill

This is a theme picker and applier for slide decks and other artifacts. It ships with 10 pre-built themes (Ocean Depths, Sunset Boulevard, Forest Canopy, etc.) stored in a `themes/` directory and displayed via a showcase PDF. The agent reads a theme file, applies its hex colors and font pairings to a deck, and optionally creates a custom theme on the fly. That's the whole skill.

## Why it matters

It barely matters. This is a competent but generic theme-switching utility. You could swap it with any other curated color-palette + font-pairing collection and get roughly the same result. The value proposition is "don't make your agent invent hex codes from scratch for slide decks" — which is a real need, but a shallow one. Any agent with access to a color palette API or even a web search for "professional color palettes" can replicate this skill's function in two turns.

The 10 themes are fine. They cover the waterfront of safe corporate aesthetic categories: maritime professional, warm sunset, natural earth, clean grayscale, rich autumnal, cool winter, soft dusty, bold tech, fresh garden, dramatic cosmic. None are surprising. None would make a designer lean forward in their chair. They are the thematic equivalent of stock photography — pleasant, unobjectionable, and completely interchangeable with a hundred other similarly-named palette sets.

The custom-theme generation feature ("create a theme similar to the ones above") is the only interesting part, and it's described in a single paragraph without any structural guidance — no token format, no required fields, no constraints beyond "give it a similar name." This means theme quality on the custom path depends entirely on the model, with no guardrails.

## Where it helps, where it hurts

**Best case**: An agent has just generated a 12-slide deck from raw content and needs to apply cohesive styling quickly. The user doesn't have strong visual opinions and just wants it to "look professional." Loading this skill, showing the showcase PDF, getting a theme pick, and applying it is a quick, deterministic path to "not ugly." The theme files presumably contain exact hex codes and font names, so the application step is literal and fast — no creative interpretation needed.

**Worst case**: The user has brand guidelines. Or strong color preferences. Or is working on something that isn't a slide deck (the description says "slides, docs, reportings, HTML landing pages" but the instructions are entirely deck-focused). The 10 pre-built themes are unlikely to match brand colors exactly, and the custom-theme path has zero structural guarantees — it's "generate something nice" dressed up as a feature. If the agent tries to use this skill for an HTML landing page, the deck-oriented application instructions (contrast, readability, consistency across slides) offer no web-specific guidance. The skill also assumes the `themes/` directory and `theme-showcase.pdf` exist — if they don't, the entire workflow collapses because the showcase PDF is the user's only way to pick a theme.

## What it quietly assumes

The skill assumes the agent can read from `themes/` and display `theme-showcase.pdf`. Both are filesystem dependencies that hold only within the Anthropic skills repo. Outside that context, the agent has no themes to read and no showcase to show. The skill has no inline fallback — it doesn't even list the hex codes or font names in the SKILL.md itself, it delegates entirely to external files.

It assumes the user is choosing from a menu. The workflow is: show PDF → ask → wait → apply. This is a synchronous, human-in-the-loop pattern that works for interactive use but would stall in an automated pipeline. If another skill or script calls this one expecting autonomous theme application, the "wait for selection" step becomes a dead end.

It assumes slides/decks as the primary artifact type. Despite listing "docs, reportings, HTML landing pages" in the description, every instruction references "slide decks" or "slides." The contrast/readability check and "across all slides" consistency language don't translate cleanly to other artifacts.

It assumes the user can visually evaluate a theme from a PDF. This is reasonable for sighted users but is an unstated accessibility assumption — there's no text-based theme description alternative mentioned.

## What could go wrong

Low operational risk — this is a read-and-apply skill with no tool execution beyond file reading and artifact styling. No shell commands, no network calls, no data mutation beyond the artifact being styled.

The practical risk is applying a theme that doesn't work: the agent reads a theme file, applies it verbatim, and produces a deck with 3:1 contrast ratios or body text in a display font at 10px. The skill says "ensure proper contrast and readability" but provides no mechanism for checking either — no contrast ratio thresholds, no minimum font sizes, no accessibility standards to validate against. This is a gap between "ensure" and the tools provided to ensure it.

The user should be present for theme selection (the skill requires it), but does not need to be present during application.

## Bottom line

This is a file-backed palette picker for slide decks. It does what it says and nothing more. The 10 themes are adequate but unmemorable. The custom-theme path is under-specified. In a catalog of 100 skills, this does not earn a spot — any agent with web access can find or generate a color palette and font pairing in less time than it takes to load this skill and discover whether the `themes/` directory exists. The single biggest benefit is the curated, ready-to-apply nature of the pre-built themes for users who want zero decisions; the biggest risk is the filesystem dependency that silently breaks the skill outside its home repo.

## Confidence: high

The skill is short and simple. I read every word. There's nothing ambiguous — it's a theme picker with external file dependencies and a thin custom-generation path.
