---
schema_version: 1
skill_id: skl_nodejs-core-src-https-github-com-mcollina-skills-m-7e1ca29c-lls-faf2f289-skills-nodejs-core-skill-md_7e1ca29c
source_hash: sha256:9a88748e9b3c45d3765ecc9be2f1eaf97d7f01a4
analysis_version: 1
confidence: high
updated_at: "2026-07-10T01:24:14+08:00"
---

# nodejs-core

This is a reference index and diagnostic companion for working *below* the JavaScript layer of Node.js. It covers V8 engine internals (GC, hidden classes, JIT), libuv event loop mechanics, N-API / node-addon-api native addon development, Node.js core module C++ implementations, the Node.js contribution workflow, and debugging with gdb/lldb. It does not teach Node.js — it assumes you are already past that and need to debug a segfault, profile a deoptimization, or contribute a patch to `lib/internal/`.

## Why it matters

This skill is authored by Matteo Collina, a Node.js TSC member, and it shows. The diagnostic decision trees are the real value: they walk through segfault triage (reproduce → gdb backtrace → check HandleScope vs libuv callback vs JS type mismatch), V8 deoptimization investigation (trace-opt → identify consistently deoptimized function → inspect hidden class transitions → confirm re-optimization), and build failure resolution (missing headers → linker errors → platform-specific quirks). These are the kind of concrete, sequenced troubleshooting flows you only get from someone who has done the work hundreds of times. Most "Node.js internals" content on the internet is either outdated blog posts or scattered Stack Overflow answers. This skill is neither. It also has an unusually sharp instruction about rebuild-before-test (because `js2c` embeds `lib/` JavaScript into the binary) — a footgun that wastes hours if you don't know about it. Genuinely distinctive for its domain.

The weakness is that much of the content lives in referenced `rules/*.md` files that were not fetched alongside this SKILL.md. The skill is an index, not a self-contained document. You get the map but not the territory — the agent needs access to those rule files to actually deliver on the promises made here. For a catalog entry, this matters: loading this skill gives an agent decision trees and topic pointers, but the deep reference material is one more fetch away.

## Where it helps, where it hurts

**Best case:** You are maintaining a C++ addon that wraps a native library, and after a dependency upgrade it started segfaulting intermittently in production. Loading this skill gives the agent a structured triage path: reproduce with `--napi-modules`, capture a backtrace in gdb, classify the crash by frame (V8 handle scope problem vs libuv callback lifetime vs JS-to-native type mismatch), and apply the domain-specific fix from the relevant rule file. The agent moves from "segfault somewhere in native code" to a specific diagnosis in minutes rather than guessing.

**Worst case:** You are writing an Express API and load this skill because you heard "Node.js internals expertise" would help. The agent starts suggesting that you trace hidden class transitions, inspect TurboFan optimization/deoptimization patterns, or profile the libuv thread pool — all of which are wildly inappropriate for a CRUD API that just needs to respond in under 200ms. The skill has no guardrails for this. It assumes anyone loading it needs C++ debugging, gdb, and `make -j$(nproc)`. If you don't know what `js2c` is, this skill will waste your time and possibly your agent's context window.

## What it quietly assumes

1. **You have a complete Node.js build-from-source environment.** The skill references `./configure`, `make -j$(nproc)`, Ninja, ASan builds, and `js2c`. If you installed Node.js via brew or nvm, none of this applies. This assumption holds for Node.js core contributors and addon authors targeting specific Node versions — maybe 1% of Node.js users.

2. **You are comfortable with C++ and native debuggers.** gdb, lldb, valgrind, flame graphs, V8 handle scopes — these are not JavaScript developer tools. If you cannot read a C++ backtrace, the segfault decision tree is useless to you. This assumption holds for systems programmers and native addon authors but fails for the vast majority of Node.js developers.

3. **You are working inside the Node.js core repository itself.** References to `lib/internal/`, primordials usage, and the core contribution workflow (commit message formatting, PR review standards) only make sense when you are actively contributing to `nodejs/node`. If you are building a third-party addon, half the skill is noise.

4. **The rule files are available at runtime.** The SKILL.md is an index — it references 25+ `rules/*.md` files by relative path. Without those files present, the agent gets topic names and diagnostic flows but none of the reference material needed to execute them. The skill degrades from "expert guide" to "table of contents" if the rules directory is not accessible.

## What could go wrong

The skill itself is a reference document — it does not execute tools. The risk lies in what an agent does when following its guidance:

- **`make -j$(nproc)`**: The skill's mandatory rebuild instruction could cause an agent to run a full Node.js core build. On a typical machine this takes 10–30 minutes and pegs every CPU core. If the agent does this without the user knowing what it implies, it looks like the agent is frozen or has gone rogue.

- **gdb/lldb on production processes**: The debugging sections don't warn against attaching debuggers to production servers. An agent following the segfault triage decision tree on a live process could pause or crash it.

- **Heap snapshots and profiling**: `--prof`, `--trace-opt`, and heap snapshots generate large files (hundreds of MB for heap snapshots). An agent running these in a loop during debugging could fill a disk silently.

- **The user does not need to be present for reference reading, but they absolutely need to be present for any build or debug command.** The skill does not state this, and an unsupervised agent told to "fix the segfault" could run destructive native debugging commands unattended.

## Bottom line

This is one of the best Node.js internals skills available — written by a core contributor with real diagnostic wisdom you cannot find in documentation alone. If you are debugging native crashes, contributing to Node.js core, or writing C++ addons, load it without hesitation. For any other Node.js task, skip it entirely: it will lead your agent into V8 tracing and gdb sessions that are irrelevant and potentially disruptive. In a 100-skill catalog, this earns a spot only if the catalog serves systems-level and compiler-adjacent work — it is too narrow to justify space in a general-purpose collection, but irreplaceable in its niche.

## Confidence: high

I read the full source artifact. The skill's structure, domain boundaries, and assumptions are explicit and well-defined. I would defend every judgment here — including the narrow applicability warning — to the author.