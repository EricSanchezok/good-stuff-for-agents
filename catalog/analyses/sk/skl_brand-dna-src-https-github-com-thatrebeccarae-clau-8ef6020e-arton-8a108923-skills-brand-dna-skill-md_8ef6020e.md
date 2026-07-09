---
schema_version: 1
skill_id: skl_brand-dna-src-https-github-com-thatrebeccarae-clau-8ef6020e-arton-8a108923-skills-brand-dna-skill-md_8ef6020e
source_hash: sha256:f1daef99f82f6883d5d05f3a2e7f26212d6e7d85
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T03:06:00+08:00"
---

# Brand DNA — Brand Identity Extractor

Brand DNA is a website scraper that converts visual and textual brand signals into a structured `brand-profile.json`. It walks through a deterministic pipeline: fetch 1-3 pages with WebFetch, parse CSS for colors and fonts, score voice on five numerical axes, extract imagery/aesthetic descriptors, infer values and audience, and write the result. The JSON output is designed as machine input for downstream content-creation skills — seo-content-writer, email-composer, frontend-design, pro-deck-builder, cross-platform-audit — which is the most architecturally interesting idea here.

## Why it matters

The structured-handoff design is genuinely distinctive. Most brand-extraction skills produce a prose summary that sits dead in a chat transcript. This one produces a JSON artifact that other skills can consume programmatically — it treats brand identity as a data contract, not a vibe check. The five-axis voice scoring (formal↔casual, expert↔accessible, bold↔subtle, rational↔emotional, traditional↔innovative) with explicit signal-to-score mapping adds precision that "write in the brand voice" prompts lack.

Beyond that, the extraction logic is workmanlike but unremarkable. The CSS parsing rules are sensible but fragile. The page-fetch strategy (homepage → /about → /products) covers the common case and degrades gracefully on 404s. The detection signals for voice scoring are concrete — "uses you/your frequently → +2 casual" — which makes the output auditable. The forbidden-rules (don't infer colors from brand positioning, don't guess imagery from industry stereotypes) show defensive design thinking.

## Where it helps, where it hurts

**Best-case scenario:** You're building a brand-consistent content pipeline. A client has a well-built, server-rendered marketing site with Google Fonts, clear CSS declarations on `.hero` and `.btn-primary`, and rich about-page copy. You point Brand DNA at it, get a solid `brand-profile.json`, and immediately feed it into seo-content-writer and email-composer to produce on-voice content for five channels. The time saved over manually documenting brand guidelines is real.

**Worst-case scenario:** The target site is a Next.js app with CSS-in-JS, a full-page hero video with no extractable text colors, and navigation rendered client-side. WebFetch captures a skeleton of `<div>` wrappers and maybe some inline text. Brand DNA produces a profile where half the fields are `null`, the colors are wrong (pulled from a loading state or the only visible markup), and the voice scores are based on 40 words of nav text. An agent loading this skill proceeds to generate "brand-consistent" content that is actively misleading — worse than no profile at all. The skill notes this limitation but still writes the file with low-confidence data rather than aborting.

## What it quietly assumes

The single biggest assumption: the website is server-rendered with extractable CSS. The skill knows about SPAs and CSS-in-JS as limitations but doesn't gate anything — it produces output regardless. For a typical marketing site built with WordPress, Webflow, or Squarespace, this holds ~70% of the time. For any modern JS-framework site, it's closer to 20%. When it fails, the skill degrades to `null` fields, not to an error — which means downstream consumers may silently use incomplete profiles.

Other assumptions: the brand has a single identity (multi-brand enterprises get a note but no structural support); the about page lives at `/about` or `/about-us` (reasonable for anglophone sites, fails on localized or custom path structures); color extraction from CSS selectors maps to brand identity (the hero's `background-color` could be campaign-specific, not the core brand palette); Google Fonts detection is sufficient for typography (ignores Adobe Fonts, self-hosted fonts, and any font loaded via JavaScript).

Voice scoring assumes that linguistic signals like "uses you/your" map reliably to tone dimensions. A legal-tech site might use "you/your" heavily while being deeply formal. The scoring rules are heuristics, not validated measures.

## What could go wrong

The primary risk is moderate: WebFetch is the only tool, and it's inherently limited. The worst realistic outcome is not data loss or system damage — it's producing plausible-looking brand profiles that are wrong in non-obvious ways. An agent that doesn't read the confidence caveats could generate off-brand content at scale before anyone notices.

A subtler risk: the brand-profile.json feeds into frontend-design, which might generate a complete visual rebrand based on extracted colors that were actually campaign-specific or seasonal. This is a spec-at-a-distance problem — the extraction skill has no way to validate its output against ground truth.

The user doesn't need to be present during extraction, but should review the profile before it feeds downstream skills. The skill's summary output helps with this — it displays voice descriptors, primary color, typography, and audience at a glance.

## Bottom line

Pick it if you need a structured brand-data contract for a content pipeline targeting traditional marketing sites. The downstream-consumer design is the real insight. Skip it for JS-heavy sites, multi-brand enterprises, or when extraction accuracy matters more than automation speed. Biggest risk is silent inaccuracy on modern stacks; biggest benefit is turning brand discovery from a chat artifact into machine-readable data. In a tight 100-skill catalog, it earns a spot only if the catalog has the downstream skills to consume its output — without those, it's a JSON file with no reason to exist.

## Confidence: medium

The extraction pipeline is well-specified and I understand the intent clearly, but the real-world performance depends heavily on WebFetch's ability to capture CSS from arbitrary sites, and I haven't tested this against a representative sample of modern websites.
