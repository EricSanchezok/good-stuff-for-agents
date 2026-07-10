---
schema_version: 1
skill_id: skl_retro-src-https-github-com-phuryn-pm-skills-pm-ski-9f78a3a7-36372-pm-execution-skills-retro-skill-md_9f78a3a7
source_hash: sha256:f90eeb5f1121ca6ed4cf5780e09060d1cb983210
analysis_version: 1
confidence: high
updated_at: "2026-07-10T13:46:00.000Z"
---

# retro

A sprint retrospective documentation template masquerading as a facilitation skill. It lists three well-known retro formats (Start/Stop/Continue, 4Ls, Sailboat), provides a table template for action items, and a markdown summary format. That's the whole skill.

## Why it matters

It doesn't matter. The three retro formats are the three most common in the industry and are documented everywhere — every scrum guide, every agile blog, every PM's bookmarks folder. The action-items table template (Priority | Action Item | Owner | Deadline | Success Metric) is the obvious format anyone would produce. The sprint analysis checklist (goal achieved? velocity vs. commitment? blockers?) is standard scrum-master fare.

What's absent is more instructive than what's present. There is no guidance on handling interpersonal conflict, no technique for drawing out quiet team members, no advice on distinguishing symptoms from root causes, no framework for when the retro format itself is the problem (teams that have done 50 Start/Stop/Continue retros and are bored senseless). These are the hard parts of facilitation, and the skill has nothing for them.

## Where it helps, where it hurts

**Best case**: A new scrum master who has literally never run a retrospective needs a template to follow. The skill provides the structure — pick a format, analyze sprint data, produce action items, save a summary. The output looks professional and contains the right sections. For someone who would otherwise stare at a blank page, this is genuinely useful.

**Worst case**: An experienced team uses this skill to "run" a retro. The agent processes whatever raw feedback it's given, groups items by keyword similarity, generates action items no team member actually committed to, and produces a markdown summary that everyone nods at and nobody acts on. The retro happened on paper and nowhere else. The team loses a week of real improvement because the ceremony was outsourced to an agent that can't read the room, can't detect sarcasm in "everything's fine," and can't push back when the loudest person dominates the feedback. The output creates a paper trail of fake accountability.

## What it quietly assumes

The foundational assumption is that a retrospective is a documentation exercise rather than a facilitated conversation. Everything in the skill treats retro as input-processing-output: raw feedback in, formatted summary out. But retros live or die on what happens in the room — the awkward silence before someone admits the sprint was terrible, the moment a junior engineer finally says the architecture is falling apart, the genuine debate about whether a "blocker" was actually a blocker. None of that shows up in sticky-note text the agent can process.

It assumes sprint-based development with velocity tracking, committed story points, and discrete sprint goals. Many teams using Kanban, continuous flow, or shape-up won't have any of these artifacts.

It assumes the agent can meaningfully assess whether a sprint goal was achieved and what the collaboration patterns were from whatever data is fed in. It can't. It can only reflect back what the data says, and the data rarely captures reality.

The "limit to 2-3 action items" rule assumes the agent can distinguish high-impact from low-impact improvements — but it's just pattern-matching frequency and sentiment from text, which correlates poorly with actual impact.

## What could go wrong

Tool risks are negligible — reads files, writes markdown. The damage is social and organizational. A team that substitutes this skill for an actual facilitated retro loses the single most important agile ceremony for continuous improvement. The action items look actionable but have no buy-in — the owner was "assigned" by an agent, not volunteered by a human. Three sprints later, nothing has changed, but the markdown files look great.

There is also a subtler risk: the skill could be used to generate fake retro artifacts for compliance or audit purposes. A manager asks for "evidence of retrospectives" and someone runs the skill on fabricated sprint data to produce a paper trail. The skill enables this without friction.

## Bottom line

Skip it. Everything this skill does — format selection, sprint analysis, action-item tabulation, summary generation — is within the default capabilities of any agent with basic agile knowledge. It adds no specialized methodology, no facilitation technique, no insight about team dynamics. The single biggest risk is process theater replacing real team reflection. The benefit is essentially zero for anyone who has ever attended a retro. This does not earn a catalog spot — it's the kind of skill that exists because someone thought "retros are important, we should have a skill for that" without asking whether the skill adds anything beyond what the agent already knows.

## Confidence: high

The source is short, clear, and covers well-known agile territory. There are no ambiguous behaviors to unpack.
