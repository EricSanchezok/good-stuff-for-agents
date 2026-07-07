# Growth Quality Gate

A growth run is successful when it advances catalog evidence without violating policy.

## Full Success

All applicable conditions pass:

- demand scan performed;
- discovery themes chosen from evidence;
- inspected sources have recorded evidence;
- activated/preview sources satisfy activation policy;
- ambiguous sources are blocked or left as candidates with reasons;
- downstream phases ran when inputs existed;
- no fake sources, skills, analyses, packs, or evaluations were created;
- validation passes;
- indexes rebuild;
- growth report is written.

## Partial Success

Use partial success when some phases advance but blockers remain, such as source sync failures, unsupported URL types, no sufficient pack evidence, or unclear license.

## Failure

A growth run fails when validation cannot pass, writes are not traceable to evidence, activation policy is violated, or semantic artifacts are fabricated.
