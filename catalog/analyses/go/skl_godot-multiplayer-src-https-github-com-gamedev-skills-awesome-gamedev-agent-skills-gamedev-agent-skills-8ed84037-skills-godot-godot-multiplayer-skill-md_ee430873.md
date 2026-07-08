---
schema_version: 1
skill_id: skl_godot-multiplayer-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-multiplayer-skill-md_ee430873
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.331Z"
---

# Godot Multiplayer

## Core Purpose
Guides agents through implementing multiplayer networking in Godot — ENet and WebRTC multiplayer, scene replication (RPCs), synchronization strategies, lobby management, and latency compensation.

## Trigger Semantics
Load when an agent implements networked multiplayer in a Godot game, configures ENet or WebRTC multiplayer, synchronizes game state across peers with RPCs, or handles connection/disconnection and lobby management.

## Capability Breakdown
Covers ENet-based multiplayer setup (MultiplayerSceneSynchronizer and MultiplayerSpawner), RPC (Remote Procedure Call) configuration (any_peer, authority), networked scene spawning and replication, custom data synchronization strategies (delta updates, state interpolation), lobby and room management patterns, and latency compensation (client-side prediction, lag compensation).

## Workflow Role
Implementation — applied when adding multiplayer capabilities to a Godot game.

## Inputs / Outputs
Inputs: multiplayer design (P2P vs server-authoritative), network topology. Outputs: multiplayer manager setup, RPC methods, synchronization scripts.

## Tool and Permission Profile
Standard code editing in Godot. Network testing tools.

## Compatibility Notes
Complements godot-input for networked input handling and godot-export for dedicated server export.

## Conflict Notes
No conflicts with other Godot skills.

## Dedupe Notes
Engine-specific to Godot multiplayer. No duplicate.

## Evaluation Hooks
Verify that the skill covers Godot 4's Multiplayer API (MultiplayerSceneSynchronizer), not Godot 3's old API.

## Evidence and Confidence
medium — based on source metadata and Godot multiplayer knowledge. Full content review recommended.
