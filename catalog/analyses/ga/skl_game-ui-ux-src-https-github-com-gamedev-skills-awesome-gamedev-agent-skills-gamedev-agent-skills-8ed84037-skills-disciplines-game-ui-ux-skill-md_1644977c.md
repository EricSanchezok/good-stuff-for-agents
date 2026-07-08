---
schema_version: 1
skill_id: skl_game-ui-ux-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-disciplines-game-ui-ux-skill-md_1644977c
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:53:22.388Z"
---

# Game Ui Ux

## Core Purpose
Guides agents through designing and implementing game UI/UX — HUD layout, inventory screens, menus, UI animation, input-aware UI (controller vs keyboard), and accessibility considerations specific to game interfaces.

## Trigger Semantics
Load when an agent designs game HUD layouts, implements UI screens (main menu, settings, inventory), handles controller/keyboard navigation in UI, or adds UI animations and transitions.

## Capability Breakdown
Covers HUD design patterns (health bars, ammo counters, minimaps), menu system architecture, input-aware navigation (controller focus, keyboard tabs), UI animation (tweens, transitions), responsive UI for different resolutions, and color-blind/accessibility-friendly game UI.

## Workflow Role
Design/Implementation — applied during game interface creation, from wireframes to functional UI screens.

## Inputs / Outputs
Inputs: UI wireframes, gameplay data to display, input method specs. Outputs: game UI implementation, HUD components, menu system.

## Tool and Permission Profile
Standard code editing, game engine UI tools (Godot Control nodes, Unity uGUI/UI Toolkit).

## Compatibility Notes
Complements godot-ui-control, unity-input-system, unreal-blueprints for engine-specific UI implementation. Works with game-feel for UI feedback.

## Conflict Notes
No conflicts. UI/UX design principles complement engine-specific UI skills.

## Dedupe Notes
Distinct from engine-specific UI skills by its design-principle focus. No duplicate.

## Evaluation Hooks
Verify that the skill covers both 2D (overlay) and 3D (in-world) UI patterns and that input method switching is handled gracefully.

## Evidence and Confidence
medium — based on source metadata and game UI/UX design knowledge. Full content review recommended.
