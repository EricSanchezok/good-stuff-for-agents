---
schema_version: 1
skill_id: skl_roblox-datastores-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-other-engines-roblox-datastores-skill-md_71b86f77
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:58:25.850Z"
---

# Roblox Datastores

## Core Purpose
Guides agents through Roblox DataStore service for persistent game data — DataStore operations (GetAsync, SetAsync, UpdateAsync), ordered data stores, data versioning, and rate-limiting best practices.

## Trigger Semantics
Load when an agent implements persistent player data in Roblox, saves/loads game state with DataStore, or handles DataStore rate limits and errors.

## Capability Breakdown
Covers DataStoreService API (GlobalDataStore, OrderedDataStore), GetAsync/SetAsync/UpdateAsync operations, data serialization to JSON, versioning and rollback with GetVersionAsync, rate limit handling (retry, exponential backoff), and data caching patterns to minimize DataStore calls.

## Workflow Role
Implementation — applied when adding persistence to Roblox games.

## Inputs / Outputs
Inputs: data schema for save data. Outputs: DataStore save/load functions, caching layer, error handling.

## Tool and Permission Profile
Roblox Studio. Roblox Server access for DataStore.

## Compatibility Notes
Complements roblox-luau as the data persistence layer.

## Conflict Notes
No conflicts.

## Dedupe Notes
Engine-specific to Roblox DataStore. No duplicate.

## Evaluation Hooks
Verify the skill covers UpdateAsync for atomic updates and rate limit handling patterns.

## Evidence and Confidence
medium — based on source metadata and Roblox DataStore knowledge. Full content review recommended.
