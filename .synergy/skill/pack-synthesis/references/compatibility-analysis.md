# Compatibility Analysis

Before writing a candidate pack, analyze compatibility across:

- workflow order and handoff outputs;
- input/output formats;
- required tools and permission levels;
- side effects and approval boundaries;
- license and source confidence;
- relation graph complements, overlaps, and conflicts;
- version freshness.

Record compatibility in the pack record:

- `compatibility.complements` — why members reinforce each other;
- `compatibility.overlaps` — where redundancy is intentional or tolerated;
- `compatibility.conflicts` — conflicts and mitigation/exclusion decisions.

Unresolved high-severity conflicts should prevent a pack from being eligible for evaluation passing.
