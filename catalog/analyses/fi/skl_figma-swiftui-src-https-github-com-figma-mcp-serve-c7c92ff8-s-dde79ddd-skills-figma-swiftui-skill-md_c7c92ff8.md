---
schema_version: 1
skill_id: skl_figma-swiftui-src-https-github-com-figma-mcp-serve-c7c92ff8-s-dde79ddd-skills-figma-swiftui-skill-md_c7c92ff8
source_hash: sha256:2df88a2e0a2b121a0a580de633d2351ecadf1ff6
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T02:16:15+08:00"
---

# Figma ↔ SwiftUI

A bidirectional translation router between Figma designs and SwiftUI code. The SKILL.md itself is a thin dispatcher — it picks a direction (design→code or code→design) and routes to one of two reference files. The shared context section contains six grounding principles that apply regardless of direction, and these six points are where the real design judgment lives.

## Why it matters

This skill is valuable primarily for its shared context principles, not its routing structure. Those six points encode genuine design-to-code translation wisdom that most bridge tools get wrong. The critical insight is point #2: "The React+Tailwind in `get_design_context` output is a structural reference, not a literal source." This tells the agent that `get_design_context` returns an approximation — pixel-positioned divs with Tailwind classes — and that naively transliterating this into SwiftUI `position: absolute` views will produce garbage. Instead, the screenshot is the source of truth, and the agent must recognize underlying iOS patterns (NavigationStack, TabView, List) rather than rebuilding them from primitives.

Point #3 (iOS HIG semantic colors as tokens, not hex) and point #4 (SF Symbols round-trip by name, never codepoint) are similarly sharp: they encode Apple platform conventions that a generalist agent wouldn't know to apply. An agent that maps Figma color hex codes directly into SwiftUI `Color(red:green:blue:)` will produce apps that don't respond to Dark Mode or accessibility settings. This skill prevents that.

However, the skill body is 60 lines. The real content is in two reference files I cannot read. The routing table is trivial (two directions, two trigger descriptions, two file paths). The skill's value is entirely in the shared principles and whatever depth exists in the reference files.

## Where it helps, where it hurts

**Best case**: You have a Figma design for an iOS screen and a SwiftUI project open. The agent loads this skill, picks design→code, reads the reference, and produces SwiftUI that uses NavigationStack, TabView, List, semantic colors, and SF Symbols properly — not a pixel-level copy of the Figma layout but a platform-native interpretation. The `get_design_context` tool returns a structural approximation, and the agent treats it as a hint rather than a spec, cross-referencing with the screenshot. The result compiles, respects Dynamic Type, and looks correct in both light and dark mode.

Also strong: the reverse direction. You've built a SwiftUI screen and want to push it into Figma for designer review. The skill routes to the code→design reference, which presumably covers how to create Figma frames, text styles, and component instances that mirror the SwiftUI view hierarchy — useful for keeping design files in sync with implementation.

**Worst case**: You want a pixel-perfect Figma→code translation where every spacing value, every corner radius, and every shadow is faithfully reproduced. The skill explicitly resists this — its philosophy is "recognize the iOS pattern, don't transliterate." If your team's Figma designs are treated as the single source of truth for spacing and sizing (as many design-engineering teams do), this skill will fight you. It wants to produce idiomatic SwiftUI, not faithful SwiftUI.

Another failure mode: the skill assumes you're building for iOS with SwiftUI. If you're using UIKit (still common in existing codebases), AppKit (macOS), or SwiftUI cross-platform (visionOS, watchOS), the iOS-specific patterns may not translate. The SF Symbols and HIG semantic color mappings are iOS-only.

Also: if the reference files are thin, the skill collapses to six principles and a routing table. The agent would need to fill the actual translation methodology from its own knowledge.

## What it quietly assumes

- **You're targeting iOS with SwiftUI.** The trigger description says "Swift, SwiftUI, iOS, iPhone, or iPad." No mention of macOS (AppKit/SwiftUI), watchOS, visionOS, or tvOS. Cross-platform SwiftUI projects will get iOS-specific guidance that may not apply.
- **`get_design_context` returns usable structural data with the React+Tailwind approximation.** The skill's entire design→code approach depends on this tool's output format. If the tool changes its output or doesn't support `clientLanguages: "swift"` effectively, the pipeline breaks.
- **The Figma design uses iOS HIG conventions or at least maps to them.** The semantic color mapping assumes the Figma file uses tokens that correspond to iOS system colors. A design using a custom brand palette will still get mapped to `Color(.systemBackground)` incorrectly.
- **SF Symbols covers the icon set used in the design.** The round-trip-by-name approach only works if every icon in the Figma file has an SF Symbol equivalent. Custom icons or non-Apple icon sets will break.
- **Both reference files exist and are substantive.** The SKILL.md is a router with no implementation content. If `references/design-to-code.md` or `references/code-to-design.md` are empty stubs, this skill is a hollow shell.
- **`figma-use` is available for code→design.** The skill explicitly says to load `figma-use` before any `use_figma` call. This creates a dependency chain: figma-swiftui → figma-use → 13 reference files. If any link breaks, the code→design path fails.

These assumptions are reasonable for the primary target (iOS SwiftUI developers with Figma designs that follow platform conventions). For teams with custom design systems or cross-platform needs, the assumptions degrade quickly and the skill provides no escape hatches.

## What could go wrong

The biggest risk is silent semantic mapping errors. The skill instructs the agent to map Figma color variables like `var(--backgrounds/primary)` to `Color(.systemBackground)`. If the Figma file uses similar variable names with different semantics, or if the designer intended a custom color (not the system background), the mapping will produce a plausible-looking but semantically wrong result. The agent has no way to verify the mapping is correct — it's following a rule, not checking intent.

The code→design direction has the inverse risk: pushing SwiftUI views into Figma could overwrite or conflict with existing designer work. If the agent pushes a full screen into a Figma file that already has that screen designed, it could create duplicates, misalign with existing component instances, or break variable bindings. The skill doesn't warn about this.

The SF Symbols round-trip dependency (`figma.util.getSfSymbolCharacter(name)`) is another fragility point. If this utility doesn't exist or returns wrong characters for a given symbol name, the agent will insert incorrect glyphs into the Figma file with no visual feedback until the designer notices.

User presence is required for quality — the agent should show the user screenshots and get confirmation before pushing to Figma — but the skill doesn't mandate this.

## Bottom line

Pick this skill when doing Figma↔SwiftUI translation work, because its six shared principles encode genuine iOS platform knowledge that prevents the most common translation failures (pixel-positioning, hardcoded colors, broken icons). Skip it if you need pixel-perfect fidelity, if you're not on iOS, or if the reference files turn out to be thin — the SKILL.md body is too small to stand on its own. The biggest benefit is preventing naive transliteration of Figma output into broken SwiftUI. The biggest risk is that the semantic mapping rules are applied blindly to designs that don't follow iOS conventions. In a tight 100-skill catalog, this only earns a spot if iOS-specific design-engineering workflows are a catalog priority; it's too narrow and too dependent on unread reference files to compete with general-purpose skills.

## Confidence: medium

The SKILL.md body is 60 lines and I read every word of it. The six shared principles are concrete and well-reasoned. However, the entire directional methodology is delegated to two reference files that I could not read (`references/design-to-code.md` and `references/code-to-design.md`). If those files are rich and well-structured, this skill is substantially more valuable than my analysis suggests. If they're thin or incomplete, the skill is essentially a routing stub with six good ideas. I've written accordingly.
