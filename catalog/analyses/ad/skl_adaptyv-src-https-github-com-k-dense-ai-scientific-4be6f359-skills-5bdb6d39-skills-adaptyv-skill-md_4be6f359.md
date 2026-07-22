---
schema_version: 1
skill_id: skl_adaptyv-src-https-github-com-k-dense-ai-scientific-4be6f359-skills-5bdb6d39-skills-adaptyv-skill-md_4be6f359
source_hash: git_sha1:728e113fd36e14c7c3be9a7e20be8b032169b941
analysis_version: 1
confidence: high
updated_at: "2026-07-22T03:04:10.006Z"
---

# Adaptyv Bio Foundry API

# Adaptyv Bio Foundry API

This skill turns an agent into a walk-up user of the Adaptyv Bio Foundry API and its beta Python SDK. It does not teach protein design, assay selection, or experimental strategy. It teaches how to call endpoints: list targets, estimate cost, create experiments, submit them, and poll for results. It is a thin operational wrapper over a single company's REST API, compiled into SKILL.md format.

## Why it matters

If you need to programmatically submit protein sequences to Adaptyv's cloud lab, this skill gives you exactly the code patterns and endpoint knowledge to do it. No other skill in this catalog competes on that narrow task.

But narrow is the operative word. This is a proprietary integration skill for a single vendor's beta API. It has no transferable knowledge about protein engineering, no general assay design principles, and no fallback path if Adaptyv changes its API or the SDK breaks. If Adaptyv shut down tomorrow, this skill would be worthless. If they shipped a v2 API, this skill would need a rewrite. That's the trade: deep specificity in exchange for zero portability.

For an agent that does know protein science, loading this skill adds a thin but functional automation layer — it bridges the gap from "I have sequences" to "I have results" without the human needing to click through a web UI. That's real value, but it's shallow value.

## Where it helps, where it hurts

**Best case:** A researcher has designed 50 candidate binder sequences against PD-L1 using computational tools and wants to screen them all via BLI. They tell the agent "submit these sequences as a binding screen against PD-L1." The agent loads this skill, iterates targets to confirm the right one, estimates cost, creates the experiment with proper sequence formatting, submits it, and hands back an experiment URL. The user saves 20 minutes of form-filling and avoids copy-paste errors. Three weeks later the agent retrieves results for analysis.

**Worst case:** An agent loads this skill and hallucinates a cost estimate because the SDK's `cost_estimate` method is underspecified in the skill (no example payload is shown). The agent submits an experiment with malformed multi-chain sequences because the skill mentions the format exists but doesn't show a complete working multi-chain example. The experiment reaches the lab and fails silently, wasting real money — Adaptyv runs are not free. Worse, the agent hardcodes the API key into generated code instead of reading from the environment, and the code gets committed. These are not hypotheticals; the skill gives surface-level descriptions of formats ("Simple format, rich format, multi-chain format") without executable examples, and the cost estimate call shows `client.experiments.cost_estimate({...})` — literally an ellipsis where the payload should be.

## What it quietly assumes

**You already know protein science.** The skill never explains what a binding assay is, when BLI beats SPR, what constitutes a reasonable sequence for an experiment, or how to interpret KD/kon/koff results. It assumes the agent or user brings that domain knowledge.

**You have budget and an active Adaptyv account.** There is no sandbox, no free tier mentioned, and no warning about costs. An agent that calls `client.experiments.submit()` is committing real money. The skill assumes the user has already set up billing.

**The beta SDK won't break under you.** Version 0.1.0, installed from a GitHub repo rather than PyPI, with no stability guarantees. The skill assumes `adaptyv-sdk` will remain installable from that repo and that the decorator pattern and client pattern will stay compatible. If the SDK repo is renamed, moved, or the API version bumps, this skill breaks hard.

**You're comfortable with a 21-day turnaround.** The skill mentions this timeline once, almost as an aside. An agent that naively treats this like a synchronous API call (submit, then immediately poll for results) will loop uselessly for three weeks unless the human intervenes.

**Python 3.10+ and uv are available.** The install instructions assume `uv` specifically. If the agent's environment uses `pip` or `conda`, the install command fails without a helpful fallback.

These assumptions are individually reasonable — Adaptyv's actual users will have accounts, know protein science, and use modern Python. But taken together they mean this skill is useless for anyone who isn't already an active Adaptyv customer halfway through experiment design.

## What could go wrong

The skill requires network access to `foundry-api-public.adaptyvbio.com` and makes authenticated requests with a Bearer token. The worst realistic outcomes:

- **Accidental spend:** The agent submits an experiment with garbage sequences or the wrong target, and the user gets billed for a failed run. There's no confirmation gate described beyond `auto_accept_quote` (which the skill teaches how to enable, not how to safely disable).
- **Credential leak:** The agent generates code with a hardcoded API key, or writes the key into a shell script that gets committed. The skill tells you not to do this, but the most dangerous path (generating code from examples) makes it easy to slip.
- **Webhook misconfiguration:** The skill teaches passing `webhook_url` for automation. If the agent points this at an unsecured endpoint or a wrong URL, experiment status updates leak to an external server for 21+ days.
- **Silent SDK failure:** If the SDK installation fails (repo moved, uv not available, Python too old), the agent gets an import error and the whole workflow collapses. The skill has no fallback to raw curl calls in that case, even though the REST API is fully documented alongside the SDK.

The user should be present for the submit step — that's the point of no return where money changes hands. The rest (browsing targets, estimating costs, retrieving results) is safe to automate.

## Bottom line

This skill earns its spot only if the catalog values highly specific scientific automation integrations. It does one narrow thing for one vendor's beta API, and it does it competently but shallowly — the cost estimate and multi-chain sequence gaps are real. The single biggest benefit is eliminating manual form-filling for a tedious multi-step submission process. The single biggest risk is an agent burning real lab budget on a misconfigured experiment with no human in the loop. In a catalog of 100 skills, I'd keep this only if the catalog explicitly targets bioinformatics and lab automation; otherwise, a generic "REST API integration" skill with a link to Adaptyv's OpenAPI spec would cover 80% of the value with none of the vendor lock-in risk.

## Confidence: high

The skill source is complete and self-contained; I read every section and can defend each judgment. The gaps (missing cost estimate payload, missing multi-chain example, ellipsis placeholders) are visible in the text itself.