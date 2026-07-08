# Public Surface Boundary

Use this reference whenever you touch `README.md`, `docs/**/*.md`, or the publishing helpers.

## Audience

Public pages are for outside visitors who want to browse useful agent skills, packs, sources, domains, and reports. Write them as catalog pages, not as maintenance notes.

## Allowed Public Content

You may show:

- names and summaries of public catalog entries;
- public status labels;
- human-readable source provenance;
- license information that helps users judge reuse;
- pack composition and use cases;
- domain navigation;
- public report summaries when they are meant for visitors.

## Forbidden Public Content

Do not show internal mechanics, hidden metadata, maintenance instructions, helper names, command names, hashes, private paths, or update machinery. Do not include invisible metadata comments.

## Required Check

Run the deterministic boundary checker:

```bash
npm --prefix .synergy run publish:boundary
```

This runs a context-aware checker that distinguishes blocking implementation leaks from legitimate catalog names and public task language. A clean result means zero blocking errors. Warnings for broad public nouns (`workflow`, `automation`, `script`, `pipeline`) do not block, but the agent should review them to confirm they are catalog entry names or public task language, not implementation leaks.

**Blocking errors** mean concrete internal tokens were found in public pages — fix the renderer or page copy and rerun the check.

**Do not use raw grep as a substitute for `publish:boundary`.** The checker accounts for legitimate catalog names and slugs that happen to contain internal-looking words.

## Drift and Link Checks

Run the publishing checks after every public surface change. If render succeeds but drift or links fail, fix the rendering logic or source records at the owner layer. Do not hand-edit public pages as a workaround.
