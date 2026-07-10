# Compatibility Analysis

Before writing a candidate pack, analyze compatibility across:

- workflow order and handoff outputs;
- input/output formats;
- required tools and permission levels;
- side effects and approval boundaries;
- license and source confidence;
- relation graph: `chains_with` (sequential handoffs), `strengthens` (quality gates), `alternatives` (choose one), `conflicts_with` (cannot coexist);
- version freshness.

Record compatibility in the pack record:

- `compatibility.chains` — sequential handoffs that define the pack's natural order;
- `compatibility.strengthens` — quality gates and cross-checking that raise output quality;
- `compatibility.alternatives` — deliberate redundancy or functional overlap that is intentional and documented;
- `compatibility.conflicts` — conflicts and mitigation/exclusion decisions.

Unresolved high-severity conflicts should prevent a pack from being eligible for evaluation passing.
