---
name: skill-deep-analysis
description: Deeply analyze canonical skill records — not by summarizing them, but by forming independent judgments about what they actually do, what makes them special (or not), when they work and when they fail, what hidden assumptions they make, what tool risks they carry, and whether they deserve a place in the catalog. Use when catalog skills are new or changed and need catalog/analyses markdown with honest, opinionated analysis.
---

# Skill Deep Analysis SOP

## What You Own

You own the judgment. Not the summary. Not the classification. The judgment.

Your job is to read a skill's full source content — the actual SKILL.md file, every word of it — and then write down what you honestly think about it. Is it good? Is it mediocre? What does it assume that it never states? Where will it help, and where will it hurt? These are the questions you answer. They cannot be answered by copying sentences from the source.

The downstream agents — the ones doing relation analysis, pack synthesis, and evaluation — depend on your judgment to make their own decisions. If your analysis is just a reformatted version of the SKILL.md, you have given them nothing they could not have gotten themselves. If your analysis contains real opinions, real warnings, and real honesty about quality, you have given them something irreplaceable.

You do not own extraction, canonical identity creation, relation edge writing, pack synthesis, or publication. Your analysis informs those phases. They will be worse if your analysis is hollow; they will be better if your analysis is honest.

## When To Use This Skill

Use this skill when:

- a new or changed canonical skill needs its first analysis;
- an existing analysis is stale (skill content changed, analysis predates the change);
- a downstream phase (relations, packs, evaluation) needs analysis to proceed;
- you suspect an existing analysis is shallow or inflated and needs honest reconsideration.

## When Not To Use This Skill

Do not use this skill to:

- normalize skill identities (use `skill-normalization`);
- write relation edges (use `skill-dedup-relations`);
- score or evaluate packs (use `catalog-evaluation`);
- invent evidence when the source content is unavailable — if you cannot read the full source, either write low-confidence or block.

## Inputs You Should Gather First

Before you write a single word of analysis, you must have:

- the canonical skill record (for the skill ID and metadata);
- **the full source content** — the actual SKILL.md file, the full artifact, not a summary, not a metadata snippet. If you only have a summary or metadata record, your analysis can only be low-confidence, and you must say so explicitly;
- any existing analysis for this skill (so you do not unknowingly repeat or contradict without reason);
- these references: `references/analysis-template.md`, `references/analysis-rubric.md`, `references/capability-taxonomy.md`, `references/tool-risk-taxonomy.md`;
- relation records if they exist (for context on what this skill overlaps or conflicts with);
- the shared `artifact-contract.md` and `script-policy.md` references.

## Outputs You Must Leave Behind

- analysis markdown under `catalog/analyses/<2-char-prefix>/<skill-id>.md`, written through the deterministic helper script;
- a confidence level that honestly reflects how well you understood the skill;
- explicit notes on any evidence gaps or unresolved uncertainties;
- validation passing against `catalog:validate`.

## References To Read

Read these in order before you start:

1. `references/analysis-template.md` — the 6 questions you must answer. Read it every time. Do not rely on memory.
2. `references/analysis-rubric.md` — how your analysis will be judged. Use it to self-check before handoff.
3. `references/capability-taxonomy.md` — reference for domain and task type labels.
4. `references/tool-risk-taxonomy.md` — reference for naming and assessing tool risks.

## Helper Scripts

| Helper | Purpose | When to use |
|--------|---------|------------|
| `scripts/write-analysis-drafts.mjs` | Write analysis markdown from reviewed drafts | After you have written the complete analysis content and self-checked it |
| `../catalog-data/scripts/write-analysis.mjs` | Write one analysis markdown file | Alternative single-file writer |
| `../catalog-data/scripts/validate-catalog.mjs` | Validate analysis and catalog integrity | After writing, before handoff |

## Workflow

### Step 1: Select skills to analyze

Choose skill IDs based on: new skill records with no analysis, changed version IDs, analyses flagged as stale, or downstream requests from pack synthesis or relations. Do not try to analyze every skill at once — a few deep analyses are worth more than fifty shallow ones.

### Step 2: Read the full source content

This is the step that determines whether your analysis has any value. Do not skip it. Do not skim. Do not rely on summaries or metadata records.

Find the upstream SKILL.md — either from the source snapshot in `catalog/sources/snapshots/`, from the skill candidate record, or from the upstream repository directly. Read the entire file. Every section. Every instruction. You are reading as if the author is in the room and you will have to explain their work to a colleague afterward.

As you read, ask yourself:

- What is the author actually trying to help agents accomplish?
- What does the author seem particularly careful or opinionated about?
- What does the author gloss over or skip entirely?
- What would a user need to already have or already know for this to work?
- Is there anything in here that surprises me or contradicts my expectations?

If you finish reading and cannot answer at least three of these questions, you were skimming. Go back and read again. Deep analysis requires deep reading.

### Step 3: Form your own judgment

Before you open the template, before you write a single word, stop and think. Put the source content aside. Ask yourself:

- **What is my gut reaction?** Did this skill impress me? Bore me? Confuse me? Alarm me? Your gut reaction is real data — if a skill bored you, the analysis should reflect that. If it confused you, that is a finding worth reporting.
- **What is one thing this skill does differently from what I expected?** If the answer is "nothing", that is a finding too — it means this is a standard, interchangeable skill. Say that.
- **When would I, personally, choose to use this skill? When would I, personally, refuse to?** Be specific. Imagine real projects, real deadlines, real constraints.
- **What is the skill not telling me?** What does it assume I already have? What would go wrong if I did not have it?
- **Is this skill worth remembering?** If I read 50 skills today and came back next week, would I remember this one? Why or why not?

If you cannot answer these questions with conviction, you have not formed a judgment yet. Do not start writing. Go back to the source or accept that this skill will get a low-confidence analysis and be honest about why.

### Step 4: Write the analysis

Now open `references/analysis-template.md`. Answer the six questions, in order, in your own words.

Rules while writing:

- Do not look at the SKILL.md while you write. You already read it. Now write from your understanding and your judgment. If you need to check a specific detail (a file path, a tool name), check it quickly and then look away again. The analysis should sound like your voice, not like the source document reformatted.
- Write short. Each of the six sections should be 2-5 sentences. If you are writing a paragraph, make sure every sentence earns its place. If you find yourself writing filler, delete it and say what you mean in fewer words.
- Be decisive. "It depends" is not an answer. "I am not sure because I could not access the full source" is an answer — it is an honest one. Prefer honest uncertainty to fake certainty.
- Use the banned phrase list from the template. If you catch yourself writing any of those phrases, stop. You are on autopilot. Refocus and write something real.

After you finish all six sections, read your analysis aloud (in your head is fine). Does it sound like a person who read a skill and has opinions? Or does it sound like a form that was filled out? If the latter, rewrite the sections that sound hollow.

### Step 5: Self-check with the rubric

Open `references/analysis-rubric.md`. Score yourself on all five dimensions. Be harsh — the downstream agent will be.

Apply the substitution test: replace the skill name with another skill's name. Does most of your analysis still work? If yes, your analysis is generic and needs rewriting.

Apply the four final-gate questions:

1. Would another agent trust this?
2. Could this discriminate between near-duplicates?
3. Are the warnings actionable?
4. Is mediocrity visible?

If any answer is "no", go back to step 4 and fix the relevant sections.

### Step 6: Call the writer and validate

Write the analysis markdown through `scripts/write-analysis-drafts.mjs` (or the catalog-data alternative). Run `catalog:validate` immediately after. Fix any validation errors. If validation passes, hand off.

## Quality Bar

A good analysis is a judgment you would stand behind if the skill's author read it.

It tells another agent, in plain language:

- what this skill actually does (not what it claims to do);
- whether it is special or interchangeable;
- exactly when to use it and exactly when to avoid it;
- what hidden assumptions could cause it to fail;
- what risks it carries and how bad the worst case is;
- whether it deserves its place in the catalog.

A bad analysis is one where the reader finishes and thinks "I still do not know whether to use this skill — I should probably just read the original SKILL.md myself." If your analysis does not save the reader that trip, it has failed.

## Bad Patterns To Avoid

These are the patterns that produced the hollow analyses we are replacing. Recognize them. Catch yourself. Do not do them.

**Form-filling mentality.** You are not completing a template. You are writing your judgment. If you find yourself thinking "what goes in section 3?" instead of "what do I actually think about when this skill will fail?", you have slipped into form-filling mode. Close the template. Think. Then write.

**The everything-is-high-confidence trap.** If every skill you analyze gets high confidence, you are not distinguishing between strong and weak evidence. A skill whose source you read fully is different from one you only have metadata for. A skill in a domain you understand deeply is different from one in an unfamiliar domain. High confidence means "I would bet on my analysis being correct." Be honest about when you would not take that bet.

**Praise-without-criticism syndrome.** Every skill has flaws, limitations, blind spots, or areas where it is merely adequate. If your analysis sounds like a recommendation letter, you are not being critical enough. The most useful analyses are the ones that say "this is good at X but weak at Y" — that is what downstream agents need to make choices.

**Transcription disguised as analysis.** Copying the skill's description into "what it does", its trigger description into "when to use", its tool list into "tool profile" — this is transcription, not analysis. If your analysis could have been generated by a script that parses the SKILL.md frontmatter and reformats it, you have not added any value.

**The "it depends" cop-out.** "It depends on the context" is true of everything and tells nobody anything. Say what it depends on, and what the answer is for each branch. If you genuinely cannot resolve the ambiguity, say so explicitly and explain what additional information would resolve it.

**Skipping the assumption hunt.** The assumptions section is not optional and not a formality. Every skill that gives instructions makes assumptions about the world those instructions will be executed in. Finding those assumptions is the hardest and most valuable part of analysis. Do not skip it with "no assumptions identified" — that is almost never true, and even when it is, you need to show your work to prove you looked.

## Failure Handling

- If the full source content is unavailable and you cannot access the actual SKILL.md, you may write a low-confidence analysis ONLY if the skill record provides enough information to say something meaningful. Otherwise, block the analysis and note "source content unavailable" as the reason. Do not fabricate a medium or high confidence analysis from metadata alone.
- If a skill record is malformed, return to `skill-normalization` or `catalog-data`. Do not try to analyze a broken record.
- If a tool risk is genuinely unclear (the skill hints at external actions but does not specify them), mark it as unresolved in the tool risks section and lower confidence accordingly. Do not pretend clarity where there is none.
- If the analysis writing script fails, fix the draft format and rerun. Do not bypass the script and hand-write analysis files — the catalog-data integrity depends on script-mediated writes.

## Verification

After writing:

```bash
npm --prefix .synergy run catalog:validate
```

When analysis affects indexes or public pages, also run:

```bash
npm --prefix .synergy run catalog:index
```

## Handoff

Hand off to `skill-dedup-relations` with:

- skill IDs and their analysis file paths;
- dedupe observations from your analysis (similarity, overlap, distinctiveness);
- compatibility and conflict notes;
- confidence levels and any unresolved uncertainties;
- validation result.

The relations agent should be able to pick up your analyses and immediately understand which skills are distinct, which are overlapping, and which are incompatible — without reading the original SKILL.md files themselves. If your analyses cannot support that, they are not deep enough.
