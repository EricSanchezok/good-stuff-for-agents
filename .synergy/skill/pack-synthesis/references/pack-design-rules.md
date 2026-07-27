# Pack Design Rules

A pack is a task-shaped workflow that closes, not a tag bundle.

## Contract Preflight Rules

Before synthesis writes a candidate, the pack contract must close. A closed contract has:

- **Entry input.** A concrete artifact or description the user/agent provides to start. Not "anything" — a verifiable type or shape.
- **Terminal outcome.** A concrete, verifiable end state the pack produces when complete.
- **Ordered stages.** Every main-path stage has either a member skill assigned or a documented, unfillable gap.
- **Adjacent handoffs.** Between every consecutive stage, a defined handoff format showing what moves from stage N to stage N+1 and how the receiving stage consumes it.
- **Conditional branches.** Every decision point documents the trigger condition, branch path, and how the branch rejoins or terminates.
- **Closed main paths.** Every trace from entry to terminal along every main path is resolved. An unresolved stage on a main path breaks the contract.

Relation edges (`chains_with`, `strengthens`, etc.) inform intent discovery and stage ordering but do not prove artifact compatibility. Handoff verification must be performed against the actual skill records and analyses, not inferred from relation edges alone.

## Good Packs

- have a clear task intent and a closed contract;
- include complementary skills across workflow stages;
- keep overlap intentional and explained;
- pin member versions;
- include exclusion reasons for high-ranking non-members;
- can be used by an agent without guessing the order or handoffs;
- document entry input, terminal outcome, stage handoffs, and conditional branches.

## Anti-Patterns

- fake seed packs created for appearance;
- domain grab bags with no workflow;
- packs submitted as candidates before contract preflight passes;
- adding weak skills to reach a target count;
- including conflicting skills without resolution;
- omitting license/confidence limitations;
- publishing candidate packs directly;
- using relation edges as proof of artifact compatibility without verifying handoffs.

Default target size is 3–15 skills, but a smaller pack is better than a redundant one. A gap report (documented incomplete contract) is a valid output; do not produce a candidate for an unclosed contract.
