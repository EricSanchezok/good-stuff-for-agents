---
schema_version: 1
skill_id: skl_ai-seo-src-https-github-com-coreyhaines31-marketin-b71a257e-y-haines-ef920698-skills-ai-seo-skill-md_b71a257e
source_hash: sha256:de9dfbd7717f281511c800c10302f9268ad1ebbd
analysis_version: 1
confidence: high
updated_at: "2026-07-10T03:05:25+08:00"
---

# AI SEO

This skill teaches agents how to optimize content so AI systems — ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini, Copilot — cite it in their answers. It is not a traditional SEO skill (that lives in `seo-audit`). It covers a genuinely new discipline: making content extractable and citable by LLMs, grounded in the Princeton GEO research (KDD 2024) and Google's own AI optimization guide. It also handles emerging surface area like `llms.txt`, the Open Knowledge Format, and making pricing legible to autonomous buying agents.

## Why it matters

The skill is rich — unusually so for a marketing-domain skill. It doesn't stop at surface advice. It layers: a platform-by-platform breakdown of how each AI engine selects sources, the Princeton GEO study's ranked optimization methods with specific numeric visibility boosts, content-block patterns keyed to query types, an AI-bot-level robots.txt guide, machine-readable file formats for autonomous agents (`pricing.md`, `llms.txt`, `okf/`), and a monitoring section with tool recommendations and a DIY manual-check protocol. It also draws a distinction Google themselves insist on — "don't write separate content for AI, don't chunk for AI" — and warns that some of its own structural advice mostly helps *non-Google* AI engines. This self-awareness is rare in skill artifacts. The genuine insight here: traditional SEO gets you *ranked*, AI SEO gets you *cited*, and the correlation between rank position and citation is weaker than most people assume.

That said, much of the content-pattern advice (answer blocks, comparison tables, FAQ sections, schema markup) overlaps with standard on-page SEO. The value-add is the *lens* — reframing those patterns around LLM extractability rather than SERP click-through. If you already load a traditional SEO skill, maybe 40% of this is redundant. The non-overlapping 60% — platform-by-platform selection behavior, the GEO study data, llms.txt/OKF/pricing.md guidance, agentic-experience preparation — is what earns its keep.

## Where it helps, where it hurts

**Best-case scenario:** A content team has a strong traditional SEO foundation (good rankings, decent E-E-A-T, existing schema markup) but they're invisible in AI-generated answers even for queries where they rank well. They need to understand *why* they're not being cited and what structural changes would change that — not just "add more content," but specific interventions like adding 40-60 word answer blocks, building comparison tables, creating `llms.txt`, and getting Wikipedia/Reddit/review-site presence. The skill walks them through an audit template, then prescribes concrete structural and authority changes with expected visibility boosts per method. This is the skill in its element.

**Worst-case scenario:** Someone with no traditional SEO foundation (no schema markup, no E-E-A-T, thin content, JS-rendered pages, blocked crawlers) loads this skill hoping to "do AI SEO" instead of regular SEO. The skill will give them the structural patterns — and those patterns will do little, because the underlying content isn't good enough to get cited regardless. The skill acknowledges this (it repeatedly says traditional SEO is the foundation) but doesn't gate itself — it will happily walk someone through llms.txt creation while their robots.txt blocks every AI crawler. Also: the monitoring section requires either paid tools (Otterly, Peec AI, ZipTie) or manual drudgery — there's no automated free tier. An agent following this skill for monitoring without a budget will get stuck or produce unreliable DIY data.

## What it quietly assumes

1. **The site already has solid traditional SEO.** The skill says this explicitly — but it doesn't enforce it. It assumes ranking positions, content depth, and E-E-A-T signals are already in decent shape. If they're not, the AI-SEO layer is decoration on a crumbling foundation. This assumption holds for established content operations; it fails completely for brand-new sites or those with severe SEO debt.

2. **The user has budget for monitoring tools.** The monitoring section lists four paid tools and a manual workaround. The manual workaround is described in one sentence and doesn't address scale. Realistically, the skill assumes a tool subscription. This holds for professional marketing teams, not for solo operators.

3. **The content lives on an owned website (not a platform).** The advice about `pricing.md`, `llms.txt`, and OKF assumes site-root file access. If your business lives entirely on a marketplace, social platform, or app store, you can't implement these files.

4. **The organization controls its robots.txt.** It assumes the dev team or CMS allows editing crawler directives. In enterprise environments where security teams blanket-block AI crawlers, the "unblock or accept invisibility" advice becomes a political problem, not a configuration one.

5. **Google's stance is the floor, not the ceiling.** The skill explicitly navigates tension between Google saying "just do normal SEO" and the reality that other AI engines reward different signals. It assumes you'll optimize for multiple platforms simultaneously. This is reasonable but adds complexity — you're essentially maintaining two optimization strategies: one Google-safe, one extractability-forward.

## What could go wrong

The skill is mostly advisory — it tells the agent what to *recommend*, not what to *execute*. So tool risk is lower than a skill that runs commands. But several failure modes are real:

- **Bad advice on crawler blocking**: The skill recommends allowing AI crawlers while optionally blocking training-only crawlers like CCBot. If an agent misidentifies a crawler bot in robots.txt (e.g., blocks `Google-Extended` thinking it's training-only), it kills AI Overviews visibility entirely. The remediation is manual and slow — bots recrawl on their own schedules, and recovering can take weeks.
- **Cargo-cult file creation**: An agent could create `pricing.md`, `llms.txt`, and an OKF bundle without understanding what goes in them, producing files that are technically present but useless or misleading. A `pricing.md` with stale or wrong data that an AI agent reads and cites could trigger customer complaints or legal issues around deceptive pricing.
- **Content generation at scale**: The skill warns against this (calling it a spam-policy risk) but doesn't prevent it. An overzealous agent could use the content-block templates to mass-generate AI-targeted pages, hitting Google's "scaled content abuse" policy and getting the site penalized.
- **No automated verification**: The agent can recommend changes but has no deterministic way to verify they worked. AI citation is probabilistic and delayed — the agent would need to tell the user "check back in 2-4 weeks with Otterly." That's a weak handoff.

The user should be present for any robots.txt changes, pricing.md publication, or content-structure overhauls. The agent should not make these changes autonomously.

## Bottom line

This is a genuinely useful skill that covers a real, emerging domain with more depth and research grounding than most marketing skills in the catalog. It earns its spot in a tight catalog because the intersection of LLM citation behavior and content strategy is not well-covered elsewhere, and this skill's GEO-study data, platform-by-platform breakdown, and forward-looking agentic-experience section (pricing.md, OKF) go beyond what any generic SEO skill provides. The biggest risk is that it's used as an alternative to traditional SEO rather than a layer on top of it — naive agents could cargo-cult the structural advice onto weak foundations. The biggest benefit is that it answers a question most content teams don't yet know to ask: "Why am I ranking but not getting cited?"

## Confidence: high

The source is complete, well-structured, and explicitly cites its research foundations (Princeton GEO KDD 2024, Google's own AI optimization guide). Every claim is traceable.
