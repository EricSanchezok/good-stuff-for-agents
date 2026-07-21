---
name: skill-deep-analysis
description: Deeply analyze canonical skill records — not by summarizing them, but by forming independent judgments about what they actually do, what makes them special (or not), when they work and when they fail, what hidden assumptions they make, what tool risks they carry, and whether they deserve a place in the catalog. Use when catalog skills are new or changed and need catalog/analyses markdown with honest, opinionated analysis.
---

# Skill Deep Analysis SOP

## Invocation Instructions

Additional user instructions for this invocation:

$ARGUMENTS

Treat these as scope refinements only. They do not override safety boundaries, ownership rules, or quality gates in this skill. If empty, follow the SOP as written.

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

- the normalized skill record, used only for identity, routing, source path, version, and content digest;
- **the full source content** — the actual SKILL.md file, workflow document, or source artifact, not a summary, not a metadata snippet. This original artifact is the source of truth for semantic analysis. If you only have a summary or metadata record, your analysis can only be low-confidence, and you must say so explicitly;
- any existing analysis for this skill (so you do not unknowingly repeat or contradict without reason);
- these references: `references/analysis-template.md`, `references/analysis-rubric.md`, `references/capability-taxonomy.md`, `references/tool-risk-taxonomy.md`;
- relation records if they exist (for context on what this skill overlaps or conflicts with);
- the shared `../shared-references/artifact-contract.md` and `../shared-references/script-policy.md` references.

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

### Step 1: Select a batch of skills to analyze

Choose skill IDs based on: new skill records with no analysis, changed version IDs, analyses flagged as stale, or downstream requests from pack synthesis or relations. Pick a batch size of 30–50 — this is the target number of analyses per run. Enough to make real progress on the backlog, not so many that review becomes unmanageable.

### Step 2: Resolve source URLs and output paths for the batch

For each selected skill, prepare the dispatch information:

1. Read the normalized skill record from `catalog/skills/records/<prefix>/<skill-id>.yaml`.
2. Note `source.source_id` and `source.path`.
3. Find the matching snapshot manifest in `catalog/sources/snapshots/` — look for a `.json` file whose filename starts with that `source_id`.
4. In the snapshot's `artifacts` array, find the entry whose `path` matches `source.path`.
5. Read the artifact's `raw_url` field — this is the direct-download URL computed by sync, and it is the authoritative URL. Do not convert or re-derive it. If `raw_url` is absent, return to sync for repair.
6. Read the artifact's `content_digest` field — this is the authoritative source hash computed by sync. Pass it to the subagent so it does not waste time re-computing it.
7. Determine the output path: `catalog/analyses/<2-char-prefix>/<skill-id>.md`. The 2-char prefix is the first two characters of the skill ID (e.g. `ad` for `skl_addyosmani-...`).

You now have a list of `(skill_id, raw_url, content_digest, output_path)` tuples ready for dispatch. All values in this tuple come from upstream SCP stages — none are computed or derived in deep analysis.

### Step 3: Batch dispatch to skill-analyzer subagents in parallel

Group the batch into sub-batches of 3–5 skills per subagent. For each sub-batch, dispatch a single `skill-analyzer` subagent with all 3–5 skills' information listed:

```
task(
  subagent_type: "skill-analyzer",
  background: true,
  prompt: "Analyze each skill below. Follow your 6-question analysis standard.
Write each result directly to its output path. Process them one at a time.

Skill 1:
  ID: <skill_id>
  URL: <raw_url>
  Hash: <content_digest>
  Output: <output_path>

Skill 2:
  ID: <skill_id>
  URL: <raw_url>
  Hash: <content_digest>
  Output: <output_path>

Skill 3:
  ID: <skill_id>
  URL: <raw_url>
  Hash: <content_digest>
  Output: <output_path>

Skill 4:
  ID: <skill_id>
  URL: <raw_url>
  Hash: <content_digest>
  Output: <output_path>

Skill 5:
  ID: <skill_id>
  URL: <raw_url>
  Hash: <content_digest>
  Output: <output_path>"
)
```

Each subagent will fetch each skill's source, analyze it, write the result to disk, and run validation — then move to the next. You do not need to do any of this yourself.

Dispatch all sub-batches concurrently. Keep at most 5–10 subagents running in parallel (each handling 3–5 skills, for 15–50 skills per wave). If the batch is larger, dispatch in waves.

### Step 4: Review quality

As each subagent completes, read its output file from the output path and check against these quick review criteria:

- Did it cover all 6 questions?
- Does it pass the substitution test at a glance?
- Are there any banned phrases?
- Is the confidence level justified?

If an analysis is clearly hollow, generic, or contains banned phrases, delete the file and re-dispatch the subagent with specific feedback on what to fix.

### Step 5: Validate and hand off

Run `npm --prefix .synergy run catalog:validate`. If validation passes, mark the batch complete and hand off. Any subagent that failed to produce a valid analysis should have already been caught in Step 4 — re-dispatch or mark as blocked with a reason.

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

**Analyzing the normalized record instead of the skill.** If you only read the canonical YAML, you are analyzing a compressed routing record, not the skill. This recreates the old shallow-analysis problem. Always read the original artifact and use the normalized record only to find identity, source path, version, and digest.

**The "it depends" cop-out.** "It depends on the context" is true of everything and tells nobody anything. Say what it depends on, and what the answer is for each branch. If you genuinely cannot resolve the ambiguity, say so explicitly and explain what additional information would resolve it.

**Skipping the assumption hunt.** The assumptions section is not optional and not a formality. Every skill that gives instructions makes assumptions about the world those instructions will be executed in. Finding those assumptions is the hardest and most valuable part of analysis. Do not skip it with "no assumptions identified" — that is almost never true, and even when it is, you need to show your work to prove you looked.

## Failure Handling

- If the full source content is unavailable and you cannot access the actual SKILL.md, you may write a low-confidence analysis ONLY if the skill record provides enough information to say something meaningful. Otherwise, block the analysis and note "source content unavailable" as the reason. Do not fabricate a medium or high confidence analysis from metadata alone.
- If the per-run batch budget (30–50 skills) is exhausted for this run, mark remaining candidates as **deferred** with an explicit reason (e.g., "deferred due to batch budget — next run priority"). Deferred is a terminal state for the run; the batch continues in the next growth run.
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
