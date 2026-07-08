---
schema_version: 1
skill_id: skl_godot-ui-control-src-https-github-com-gamedev-skills-awesome-gamedev-agent-skills-gamedev-agent-skills-8ed84037-skills-godot-godot-ui-control-skill-md_3806f43d
source_hash: sha256:unknown
analysis_version: 1
confidence: unknown
updated_at: "2026-07-08T14:54:34.546Z"
---

# Godot Ui Control

## Core Purpose
Guides agents through Godot's UI system — Control nodes (Button, Label, Panel, Container), layout containers (HBoxContainer, GridContainer, etc.), theme customization, and UI event handling with signals.

## Trigger Semantics
Load when an agent builds game UI in Godot (menus, HUD, inventory screens), arranges UI elements with containers, styles UI with themes and StyleBoxes, or handles UI events like button presses and text input.

## Capability Breakdown
Covers Control node fundamentals (position, size, anchors, pivot), container-based layout (HBox/VBox/Grid/MarginContainer for automatic arrangement), theme system (Theme resource, StyleBox textures, font colors), UI signals (pressed, text_changed, item_selected), and responsive UI with anchors and size flags.

## Workflow Role
Implementation — applied when creating all player-facing UI in a Godot project.

## Inputs / Outputs
Inputs: UI layout wireframes, visual style guide. Outputs: Control-based UI scenes, theme resources, signal-wired UI logic.

## Tool and Permission Profile
Godot editor (Control node inspector), standard script editing.

## Compatibility Notes
Complements game-ui-ux for game-specific UI/UX principles and godot-signals-groups for UI event wiring. Works with godot-animation for UI animation.

## Conflict Notes
No conflicts. Godot's UI system is independent of other engine subsystems.

## Dedupe Notes
Engine-specific to Godot UI. No duplicate. Complements general game-ui-ux design principles.

## Evaluation Hooks
Verify that the skill covers Godot 4's theme system changes and that container-based layout patterns handle different screen sizes.

## Evidence and Confidence
medium — based on source metadata and Godot UI knowledge. Full content review recommended.
