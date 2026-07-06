# Skill Authoring Standard

Use this standard whenever you create or update a project `SKILL.md`.

## Perspective

Write for the operating agent in second person. Use direct instructions such as "you inspect", "you decide", "you write", "you verify", and "do not". Avoid marketing copy and vague descriptions.

## Required Sections

Each project skill should include these sections unless there is a clear skill-specific reason to combine them:

- What You Own
- When To Use This Skill
- When Not To Use This Skill
- Inputs You Should Gather First
- Outputs You Must Leave Behind
- References To Read
- Helper Scripts You May Call
- Workflow
- Quality Bar
- Bad Patterns To Avoid
- Failure Handling
- Verification
- Handoff

## Detail Bar

A good skill lets a fresh agent complete the task without asking what the process is. It names inputs, artifact paths, quality checks, failure modes, helper boundaries, and handoff shape.

A weak skill only says what the task is. Rewrite weak skills until they explain how to do the work, how to know it is good, and how to avoid unsafe shortcuts.

## Helper Tables

When you list helpers, include the path, deterministic purpose, input contract, output contract, failure policy, and verification command. If no helper exists for a semantic decision, say that the agent must make and document the decision before calling a writer.

## Good Pattern

"You inspect the candidate source, record evidence and rejection reasons, write a candidate draft, then call the catalog writer to append only the reviewed candidate. If license evidence is missing, you mark the source as blocked instead of guessing."

## Bad Pattern

"Run the discovery helper and accept whatever it writes." This hides judgment inside a helper and leaves no evidence trail.

## Stop Conditions

Stop when evidence is missing, a decision belongs to a human, public pages would leak internal mechanics, catalog validation fails, or a helper name would misrepresent its behavior.
