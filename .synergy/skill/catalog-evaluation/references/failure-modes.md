# Evaluation Failure Modes

Common failure modes include:

- task intent too broad;
- skill overlap without reason;
- missing workflow stages;
- stale member versions;
- unresolved conflict;
- weak or missing evidence;
- unknown license concentration too high;
- poor source quality;
- generated page not traceable;
- candidate pack created manually instead of synthesized from catalog evidence.

Every failure mode in evaluation output must include:

- `failure_mode` — stable concise identifier;
- `owner` — the skill responsible for the next change;
- `repairability` — `this_run`, `next_run`, `policy_blocked`, `human_decision`, or `fundamental`;
- `blocking` — whether it blocks publication;
- `recommended_action` — one concrete change that can be verified on reevaluation.

A `needs_work` result should be executable by its owners. Do not return vague advice such as "improve evidence." State which analysis, relation, member, stage, version, conflict, or source fact must change. Evaluation classifies and routes repairs; it never lowers the publication threshold.
