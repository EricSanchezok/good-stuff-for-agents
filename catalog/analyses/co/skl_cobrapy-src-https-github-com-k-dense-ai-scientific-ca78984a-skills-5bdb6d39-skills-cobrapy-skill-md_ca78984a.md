---
schema_version: 1
skill_id: skl_cobrapy-src-https-github-com-k-dense-ai-scientific-ca78984a-skills-5bdb6d39-skills-cobrapy-skill-md_ca78984a
source_hash: git_sha1:0c69797edd71ed83cdbac111b4c65e3785fdeb9c
analysis_version: 1
confidence: high
updated_at: "2026-07-22T03:11:35.808Z"
---

# COBRApy Skill Analysis

# COBRApy

This skill gives an agent working knowledge of COBRApy, the Python library for constraint-based metabolic modeling. It is a condensed API reference organized into topical code examples: loading models, running flux balance analysis, performing knockouts, sampling flux space, designing growth media, and building models from scratch. It assumes metabolic modeling domain expertise — it tells you which functions to call and in what order, but never explains why you would choose FVA over flux sampling or what an infeasible solution actually means biologically. If you already know what a stoichiometric matrix is and just need the COBRApy incantations, this skill saves you a trip to the documentation. If you do not, it will make you dangerous.

## Why it matters — or doesn't

This is a competent but structurally unremarkable Python-library skill. It follows the standard recipe: installation, core capabilities organized by function area, common workflows, key concepts, best practices, troubleshooting. You could swap it with a COBRApy skill from any other source and get roughly the same API coverage. What gives it modest value is the domain — constraint-based metabolic modeling is genuinely niche, and general-purpose agents will not have COBRApy's API surface memorized. The skill's concrete version pinning (cobra 0.31.1) and explicit warnings about the hybrid solver transition are small but real quality signals — someone who actually uses the library wrote this. But nothing about the pedagogy or structure is distinctive. It is a reference sheet, not a teaching tool.

## Where it helps, where it hurts

**Best case**: A researcher asks the agent to load an SBML model of E. coli from a file, run FBA to get the wild-type growth rate, perform a single-gene knockout screen to find essential genes, and then calculate the minimal medium for 50% of maximal growth. This is the exact pipeline the skill's workflows cover, in the exact order they appear. The code patterns are copy-paste ready. The agent delivers in minutes what would otherwise require slogging through ReadTheDocs.

**Worst case**: A user unfamiliar with metabolic modeling asks the agent to "analyze this metabolic model" without specifying what analysis they need. The agent loads this skill and confidently runs model.optimize(), gets a growth rate and flux distribution, and presents it as "the answer." But the model may be infeasible under the given medium, or the default biomass objective function may be inappropriate for the organism, or the flux distribution may contain thermodynamically infeasible cycles. The skill's troubleshooting section is four bullet points that amount to "check things if it doesn't work" — there is no diagnostic reasoning taught, no guidance on recognizing when results are nonsensical, and no workflow for validating model quality before analysis. The agent produces output that looks scientific but is, in reality, garbage.

## What it quietly assumes

**Domain expertise in both agent and user**: The skill states upfront that "the user understands metabolic modeling concepts" but never addresses whether the agent does. An agent needs to understand objective functions, flux bounds, stoichiometric matrices, and the difference between FBA and FVA to use this skill responsibly. Without that, the agent becomes a copy-paste machine producing results it cannot interpret or validate. This assumption holds for perhaps 20% of agent sessions.

**GLPK scales to the task**: The default solver is GLPK via swiglpk. For the bundled textbook model (95 reactions), this is fine. For genome-scale models like iML1515 (~1500 reactions) with MILP problems, GLPK can become painfully slow or fail entirely. The skill mentions CPLEX and Gurobi as optional but never warns that the default solver has a performance cliff.

**The agent controls its own Python environment**: The installation instruction is uv pip install cobra==0.31.1. If the agent is running in a conda environment, a Docker container with a locked requirements.txt, or any setup where it cannot install arbitrary packages, the entire skill is useless before it starts. Many scientific computing environments are exactly this kind of locked-down setup.

**Network-available model repositories**: Loading models by BiGG ID requires network access. The BiGG database has known reliability issues and intermittent downtime. The skill notes remote models are "cached after first fetch" but provides no guidance on handling connection failures, timeouts, or what to do when the cache is stale.

**The user knows what model format they have**: The skill shows read_sbml_model, load_json_model, and load_yaml_model as separate functions. It never covers format detection or how to handle the extremely common case where a file named .xml actually contains a different SBML level than expected or has validation errors.

## What could go wrong

**Package installation**: uv pip install cobra==0.31.1 modifies the Python environment. The worst realistic outcome is a version conflict that downgrades or removes a dependency another project relies on. The user should be present and aware this is happening.

**Filesystem writes — model output**: write_sbml_model, save_json_model, and save_yaml_model write to arbitrary paths. If the agent writes a modified model over the input file path, it silently destroys the original data. The skill's best practice says "confirm output paths" but provides no concrete pattern for doing so safely.

**Network calls — remote model loading**: load_model("iML1515") fetches from BiGG over HTTPS. If BiGG is slow or down, the agent hangs indefinitely. The skill teaches no timeout or error handling.

**Compute consumption — combinatorial explosions**: double_gene_deletion(model, processes=4) on a genome-scale model with 1,300 genes means approximately 845,000 LP solves. On a laptop, this is hours of 100% CPU usage. The skill says "start with small n and processes=1" but never gives concrete time estimates.

## Bottom line

A serviceable but unremarkable domain-library skill that earns its place only because constraint-based metabolic modeling is too niche for general-purpose agents to know COBRApy's API cold. The biggest risk is not technical failure but scientific failure: an agent that generates valid Python code producing biologically meaningless results, with neither the skill nor the agent equipped to recognize the problem. The biggest benefit is straightforward — it compresses the COBRApy documentation into working code patterns for the five most common modeling workflows. This skill would not survive a 100-skill catalog focused on broad utility, but in a specialized scientific computing collection, it is a solid B-tier entry that needs to be paired with a metabolic-modeling-concepts skill to be safe.