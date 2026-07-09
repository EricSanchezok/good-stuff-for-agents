---
schema_version: 1
skill_id: skl_export-tokens-figma-src-https-github-com-southleft-2cbc758c-gma-ea9f2b3d-skills-export-tokens-figma-skill-md_2cbc758c
source_hash: sha256:2c4b2e0c2be4b7c277a41e07671b73cef832e2e7
analysis_version: 1
confidence: high
updated_at: "2026-07-10T02:15:00+08:00"
---

# export-tokens-figma — Figma variables → design tokens

This is a two-stage pipeline: a `use_figma` script reads every variable from a Figma file and dumps them as normalized JSON, then a deterministic Node.js converter turns that JSON into ten output formats including DTCG, CSS custom properties, Tailwind v3/v4, SCSS, and Tokens Studio. The clever bit is that it bypasses Figma's Enterprise-gated Variables REST API by going through the Plugin API instead, which works on any plan. If you have ever watched a free-tier Figma file refuse to give up its tokens, this solves exactly that problem.

## Why it matters

The token-export space in agent skills is full of thin wrappers around Figma's REST API, all of which silently fail on Starter/Pro/Org plans with a 403. This skill side-steps that restriction entirely. It also handles real-world messiness that naive converters get wrong: per-type units (opacity is unitless, spacing gets px), multi-mode output with proper theme layering (light/dark), alias resolution across collections, and font-weight name-to-number conversion. The converter script is positioned as the single source of truth — the SKILL.md explicitly warns against hand-writing conversions, which is the right instinct for a task where freehand token generation is a reliable vector for silent errors.

That said, this is a utility skill. It does one thing — extract tokens from Figma — and does it well, but it is not architecturally novel. The pipeline approach (read in Figma, convert in Node) is pragmatic, not innovative.

## Where it helps, where it hurts

**Best-case scenario:** You are mid-implementation on a design system that lives in Figma, your team is on the free or Pro plan, and you need to sync design tokens into a CSS/Tailwind/SCSS codebase. You point the skill at the Figma file, run the read script, feed the JSON to the converter with `--format css-vars`, and you get a `:root` block plus `.dark`/`[data-theme]` blocks with proper var() references and correct unit handling — about thirty seconds of work for something that would take an hour by hand and still have mistakes.

**Worst-case scenario:** The Figma file is enormous, with dozens of collections and hundreds of variables across modes, and the user is in a chat-only environment (no terminal). The read will produce a mountain of JSON, and the SKILL.md offers only "best-effort inline conversion for DTCG only" as the fallback. The agent tries to convert in-chat, hallucinates unit handling, mangles alias references, and produces token files that look plausible but are silently wrong. The user ships them and breaks their design system.

## What it quietly assumes

The biggest hidden assumption is **agent environment capability**: the converter requires Node 18+ and a terminal. In a Claude Desktop chat or a web-only interface, you cannot run `convert-tokens.mjs`. The SKILL.md acknowledges this (the Notes section mentions it) but positions the fallback as "best-effort inline conversion" — which is a euphemism for "the agent guesses the output format." For DTCG output this might work; for CSS variables with multi-mode theming and alias resolution, it is a footgun.

It also assumes the user's Figma file is well-structured — variables use aliases sensibly, colors are defined as variable references rather than literal hex, and collections are named in a way that `--collection <substr>` filtering actually helps. If the Figma file is a mess of hardcoded values and inconsistent naming, the export will faithfully reproduce that mess.

Finally, it assumes the `figma-use` skill is available and loaded. If the agent environment does not have that skill, the entire `use_figma` step collapses and the skill becomes a dead link to scripts you cannot run.

## What could go wrong

The `use_figma` scripts run inside the Figma Plugin API sandbox with read-only access to the active document. The worst outcome here is the agent applying a broken `use_figma` script that silently returns incomplete data — alias references that didn't resolve, modes that were dropped, variables from collections that weren't walked. The converter will happily process whatever JSON it receives and produce output that looks correct but is missing data. There is no validation step between read and convert — the pipeline trusts the read output implicitly.

The converter writes files to disk via `--out <dir>`. If the agent passes a path that overlaps with existing source files, it will overwrite them. The SKILL.md does not warn about this.

The user does not need to be present during the read phase (it's non-destructive inspection), but they should review the output before it ships into a production codebase. The converter warnings (slug collisions, non-numeric font weights) are findings about the source Figma file and deserve human attention.

## Bottom line

This is a well-designed, honest skill that solves a real access problem (Figma's Enterprise gate) and handles the genuinely tricky details of token conversion correctly. In a catalog of Figma skills, it earns a spot because the Plugin API workaround alone distinguishes it from every REST-based alternative. The single biggest risk is the chat-only fallback path producing plausible-looking but incorrect token files; the single biggest benefit is that for anyone with terminal access, the read-convert pipeline produces identical, correct output every time.

## Confidence: high

I read the full source and the skill is explicit, well-bounded, and internally consistent. The only areas of ambiguity are the chat-only fallback behavior, which the author themselves flag as "best-effort," confirming they are aware of the limitation.
