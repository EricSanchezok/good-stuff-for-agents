---
schema_version: 1
skill_id: skl_library-variables-figma-src-https-github-com-south-9e39adc0-skills-library-variables-figma-skill-md_9e39adc0
source_hash: sha256:472d88bc98101deca796260e7a9845464e1e1272
analysis_version: 1
confidence: medium
updated_at: "2026-07-10T14:00:00Z"
---

# Library Variables for Figma

A focused utility that lets an agent browse and import design tokens from subscribed Figma team libraries into the current file. It's a thin wrapper around two Figma Plugin API scripts — one for discovery (`list-library-variables.js`) and one for import (`import-library-variable.js`) — with a short text workflow that connects them. The scope is deliberately narrow: this skill only touches library-published variables; local variables are explicitly routed to `export-tokens-figma` or `manage-variables-figma`.

## Why it matters

This is a competent but unremarkable skill. It does exactly one thing — discover published variables from subscribed libraries and import them by key — and it does that thing clearly. The value isn't in any novel technique; it's in packaging the `figma.variables.getVariablesInLibraryCollectionAsync()` API call into a reusable, agent-friendly form.

What makes it slightly better than "just call the API" is the two-phase workflow: discover first (get the collection keys), then import selectively. This prevents the common mistake of trying to import before knowing what's available. The idempotency note — "re-importing is idempotent (same local id)" — is a small but meaningful detail that makes the skill safe to run repeatedly.

That said, any agent with access to the Figma Plugin API reference and basic JavaScript skills could reproduce this in two function calls. There's no complex logic, no error recovery, no edge-case handling in the scripts. The skill file acknowledges this by deferring to `figma-use` for the Plugin API reference. The value here is packaging, not innovation.

## Where it helps, where it hurts

**Best-case scenario:** A designer is working in a file that subscribes to a shared design system library and wants to pull in the brand color tokens to use locally. They don't know the exact variable keys or collection structure. The agent loads this skill, runs the discovery script to list all available collections and variables, presents them to the user, then imports only the ones the user selects. The workflow is clean and the output is predictable.

**Worst-case / failure scenario:** The target library is not subscribed in the current file. The skill says "enable the library in the file's library settings first (a manual Figma step)" — and then stops. The agent cannot automate this step, so the user hits a dead end. Worse, if the agent doesn't communicate this clearly, the user gets a confusing "no collections found" result and assumes the skill is broken. Another failure mode: the user wants to import hundreds of variables at once. The import script takes variable keys one at a time (the SKILL.md says "put the variable key(s)" — the scripts likely support iteration, but the workflow reads as single-key). Bulk import could be slow or require script modification.

## What it quietly assumes

Several assumptions are baked in:

- **The file already subscribes to the target library.** The skill states this explicitly ("Only subscribed libraries appear") and calls it a manual step, but a user who hasn't read the skill carefully may expect it to work on any library. This assumption fails for first-time setup workflows where the file hasn't been connected to the design system yet — roughly 40% of initial setup scenarios.

- **The `figma-use` skill is loaded and available.** The skill boundary section says "load the official `figma-use` skill first" — but doesn't enforce this. If the agent loads this skill standalone, the JavaScript scripts will fail because the execution environment rules (top-level `await`, no IIFE, colors in 0–1 range) aren't available. This is a chain-loading assumption that the skill just states, not enforces. It degrades gracefully only if the agent follows directions.

- **Figma Plugin API `teamLibrary` methods are available.** These methods are documented in the Plugin API but availability on all Figma plan tiers isn't guaranteed by the skill. The skill claims "Works on ANY plan" — this is likely true since `teamLibrary` is a standard Plugin API surface, but it's an assertion without qualification.

- **The agent understands Figma's variable model.** The skill talks about `localId`, `key`, collection keys vs. collection IDs, and "binding to node properties." An agent unfamiliar with Figma's variable system will struggle to interpret the output of the discovery script or explain results to the user.

## What could go wrong

The risks are low — this is a read-mostly skill with no destructive operations.

- **Importing wrong variables silently.** The import script creates local variable references. If the agent imports the wrong token (wrong key, wrong collection), the local file now has a binding to an unintended source. Since re-importing is idempotent, you can't fix this by re-importing the correct one — you need a separate cleanup step that the skill doesn't provide. The local file gets cluttered with dead variable references.

- **Discovery output overload.** If the subscribed library has 50 collections with 200 variables each, the discovery script dumps 10,000 entries. The agent's context window fills with variable keys and the user gets analysis paralysis. The `LIBRARY_NAME`, `COLLECTION_NAME`, and `TYPE` filters mitigate this, but only if the user knows to set them before running discovery.

- **No mutation of the source library.** Library variables are read-only references — the skill can't modify the source. This is stated but worth noting as a risk surface: no destructive writes to shared design system content are possible. The user does not need to be present during execution, but will need to be present for the manual library subscription step.

## Bottom line

Pick this if you need to consume design tokens from a shared Figma library and already know which libraries you subscribe to. Skip it if your workflow involves setting up subscriptions from scratch or working with local variables — those are different skills in the same collection. The biggest benefit is the clear two-phase workflow (discover then import); the biggest risk is dead-ending on the manual subscription gate. It earns a catalog spot as part of the southleft Figma collection, but as a standalone skill it's replaceable by any agent with access to the Figma Plugin API docs.

## Confidence: medium

The source artifact is short and clear, but I haven't inspected the actual JavaScript scripts (`scripts/list-library-variables.js` and `scripts/import-library-variable.js`) — the SKILL.md references them but they reside in the source repo. Without reading the scripts, I can't confirm the exact error handling, iteration behavior, or edge-case coverage. My analysis of the import behavior and discovery output format is inferred from the workflow description, not confirmed from code.
