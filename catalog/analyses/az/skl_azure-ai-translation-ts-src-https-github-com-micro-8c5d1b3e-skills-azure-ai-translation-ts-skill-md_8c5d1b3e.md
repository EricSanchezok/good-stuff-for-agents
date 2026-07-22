---
schema_version: 1
skill_id: skl_azure-ai-translation-ts-src-https-github-com-micro-8c5d1b3e-skills-azure-ai-translation-ts-skill-md_8c5d1b3e
source_hash: git_sha1:fa832211c5a8a90e6ca63b241314dd0437c96946
analysis_version: 1
confidence: medium
updated_at: "2026-07-22T03:58:19.913Z"
---

# Azure AI Translation TypeScript — Standard SDK Wrapper

# Azure AI Translation TypeScript

Teaches Azure's AI Translator service through the official TypeScript/JavaScript SDK: authentication, text translation, language detection, transliteration, dictionary lookups, batch translation, async patterns. Vendor-specific, language-specific.

## Why it matters

Doesn't. Competent but entirely generic Azure SDK skill. Swap with Google Cloud Translation or AWS Translate — same shape, different imports. Modest value from Azure-specific credential setup and batch translation workflow.

## Where it helps, where it hurts

**Best case**: TypeScript/Node.js app already on Azure using managed identities, needs translation. Saves agent from guessing SDK surface names.

**Worst case**: Quick translation in non-Azure project — massive SDK overkill. Creates lock-in risk teaching Azure-specific patterns. Agent adds heavy Azure SDK dependency where single HTTP POST would suffice.

## What it quietly assumes

Azure subscription and provisioned Translator resource (~20-30% of dev scenarios). TypeScript/Node.js toolchain. Azure SDK conventions familiarity. Outbound network to Azure. Text is non-confidential enough for cloud translation.

## What could go wrong

Credential leakage from hardcoded keys. Runaway translation costs (metered per character). Sensitive data sent to Azure creating compliance violations. Wrong-language cascading errors from low-confidence detection.

## Bottom line

Earns spot only for Azure-specific translation catalog completeness. Generic "call a translation API" skill covers more ground with less vendor coupling. First to go in trim to 100 skills.

## Confidence: medium