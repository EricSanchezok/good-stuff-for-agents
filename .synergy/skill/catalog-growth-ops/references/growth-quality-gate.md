# Growth Quality Gate

A growth run succeeds when it advances catalog evidence and publication readiness without violating policy.

## Full Success

All applicable conditions pass:

- demand and catalog gaps were inspected;
- in target mode, the minimal evidence bundle was assembled and handed to preflight;
- in no-target mode, publication targets were ranked and the selected target has a reason;
- activated or preview sources satisfy activation policy;
- downstream phases ran only for the scope needed (target evidence or full pipeline);
- a repairable selected target passed contract preflight, was evaluated, and published within budget;
- no fake source, skill, analysis, relation, pack, or evaluation was created;
- validation and index rebuild pass;
- the growth report records evidence assembly, failure fingerprints, publication progress, and blockers.

## Partial Success

Use partial success only when evidence or a target materially advanced but publication remains blocked after owner-routed repair, target switching, or exhausted run budget. Existing repairable candidates that were not attempted cannot be hidden behind unrelated discovery or analysis progress. A target that reaches `insufficient_evidence` cleanly is partial success when the gap is documented with a failure fingerprint.

## Failure

A growth run fails when validation cannot pass, writes are not traceable to evidence, activation policy is violated, semantic artifacts are fabricated, repair attempts repeat unchanged inputs, or a repairable publication target is abandoned before its bounded workflow runs.
